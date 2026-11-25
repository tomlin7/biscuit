import { expect, test } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startDaemon, tempHome, until } from './harness'
import { toolFixture } from './tool-fixture'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'

for (const adapter of ['openai', 'anthropic'] as const) {
  test(`${adapter}: real daemon pauses, survives restart, executes once, denies and opens full output`, async () => {
    const home = tempHome()
    const fixture = toolFixture(adapter)
    const env = { HIROSHI_TOOL_FIXTURE_KEY: 'local-fixture-only' }
    writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/tools', providers: [fixture.provider] }))
    writeFileSync(join(home, 'huge.txt'), 'z'.repeat(1024 * 1024))
    let daemon = await startDaemon({ home, env })
    const abort = new AbortController()
    let feed: Promise<void> | undefined
    try {
      const { session } = await daemon.client.createSession({})
      const detail = () => daemon.client.session({ id: session.id })
      await daemon.client.prompt({ id: session.id, text: 'approve' })
      await until(async () => (await detail()).permissions.length === 1)
      const waiting = await detail()
      expect(existsSync(join(home, 'approved.txt'))).toBe(false)
      expect(waiting.toolCalls[0]!.status).toBe('waiting')
      await expect(daemon.client.rewind({ id: session.id, checkpointID: waiting.checkpoints[0]!.id, key: 'while-asking' })).rejects.toMatchObject({ code: 'workspace_busy' })
      expect(fixture.requests).toHaveLength(1)
      expect(fixture.requests[0].tools.map((t: any) => t.name)).toEqual(['list_files', 'read_file', 'write_file', 'shell'])
      await daemon.crash()
      daemon = await startDaemon({ home, env })
      expect((await detail()).permissions).toEqual(waiting.permissions)
      expect(fixture.requests).toHaveLength(1)
      const initial = await detail()
      let live = hydrate(initialSnapshot(), initial)
      feed = daemon.client.feed({ after: initial.seq, signal: abort.signal, onEvent: (event) => { live = apply(live, event) } }).catch(() => {})
      const question = waiting.permissions[0]!
      await daemon.client.answerPermission({ id: question.id, decision: 'allow', remember: true })
      await daemon.client.answerPermission({ id: question.id, decision: 'allow', remember: true })
      await expect(daemon.client.answerPermission({ id: question.id, decision: 'deny' })).rejects.toMatchObject({ code: 'permission_answered' })
      await until(async () => (await detail()).steps.length === 2 && (await detail()).steps[1]?.status === 'succeeded')
      const done = await detail()
      await until(() => live.messages.length === done.messages.length)
      expect(live.toolCalls).toEqual(done.toolCalls)
      expect(live.permissions).toEqual(done.permissions)
      expect(readFileSync(join(home, 'approved.txt'), 'utf8')).toBe('approved from the model')
      expect(done.toolCalls[0]!.resultMessageID).toBe(done.messages.find((m) => m.role === 'tool')!.id)
      const continuation = fixture.requests[1]
      if (adapter === 'openai') {
        expect(continuation.input.find((item: any) => item.type === 'function_call_output').call_id).toBe(done.toolCalls[0]!.callID)
        expect(continuation.input.find((item: any) => item.type === 'reasoning').encrypted_content).toBe('opaque-reasoning')
      } else {
        const blocks = continuation.messages.flatMap((m: any) => m.content)
        expect(blocks.find((p: any) => p.type === 'tool_result').tool_use_id).toBe(done.toolCalls[0]!.callID)
        expect(blocks.find((p: any) => p.type === 'thinking').signature).toBe('opaque-signature')
      }
      await daemon.client.prompt({ id: session.id, text: 'deny' })
      await until(async () => (await detail()).permissions.some((p) => p.state === 'pending'))
      const denied = (await detail()).permissions.find((p) => p.state === 'pending')!
      await daemon.client.answerPermission({ id: denied.id, decision: 'deny' })
      await until(async () => (await detail()).steps.at(-1)?.output === 'Tool turn complete: deny')
      expect(existsSync(join(home, 'denied.txt'))).toBe(false)
      expect((await detail()).toolCalls[1]!.status).toBe('denied')
      await daemon.client.prompt({ id: session.id, text: 'huge' })
      await until(async () => (await detail()).permissions.some((p) => p.state === 'pending'))
      const huge = (await detail()).permissions.find((p) => p.state === 'pending')!
      await daemon.client.answerPermission({ id: huge.id, decision: 'allow' })
      await until(async () => (await detail()).steps.at(-1)?.output === 'Tool turn complete: huge')
      const call = (await detail()).toolCalls[2]!
      expect(call.output!.length).toBeLessThan(17000)
      expect(call.output).toContain('Output truncated')
      const full = await daemon.client.toolOutput({ id: call.id })
      expect(JSON.parse(full.text).content).toHaveLength(1024 * 1024)
      expect(readFileSync(full.path, 'utf8')).toBe(full.text)
      await expect(daemon.client.toolOutput({ id: 'unknown' })).rejects.toMatchObject({ code: 'not_found' })
    } finally { abort.abort(); await feed; fixture.server.stop(true); await daemon.stop() }
  }, 60_000)
}
