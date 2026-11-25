import { expect, test } from 'bun:test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'
import { engineTranscript } from '../../src/engine/transcript'
import { cockpit, usage } from '../../src/engine/cockpit'
import { startDaemon, tempHome, until } from './harness'
import { toolFixture } from './tool-fixture'

for (const adapter of ['openai', 'anthropic'] as const) {
  test(`${adapter}: two cockpit projections preserve engine order, retry, tools and actual usage across restart`, async () => {
    const home = tempHome()
    const fixture = toolFixture(adapter, true)
    const env = { HIROSHI_TOOL_FIXTURE_KEY: 'local-fixture' }
    writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/tools', providers: [fixture.provider] }))
    let daemon = await startDaemon({ home, env })
    const abort = new AbortController()
    const feeds: Promise<void>[] = []
    try {
      const { session } = await daemon.client.createSession({})
      const detail = () => daemon.client.session({ id: session.id })
      const initial = await detail()
      let first = hydrate(initialSnapshot(), initial)
      let second = hydrate(initialSnapshot(), initial)
      expect(cockpit(first).phase).toBe('No run')
      for (const receive of [(e: Parameters<typeof apply>[1]) => { first = apply(first, e) }, (e: Parameters<typeof apply>[1]) => { second = apply(second, e) }]) {
        feeds.push(daemon.client.feed({ after: initial.seq, signal: abort.signal, onEvent: (event) => { receive(event); receive(event) } }).catch(() => {}))
      }
      await daemon.client.prompt({ id: session.id, text: 'cockpit retry and approve', key: 'one' })
      await until(async () => (await detail()).permissions.some((p) => p.state === 'pending'))
      const paused = await detail()
      await until(() => cockpit(first).phase === 'Awaiting permission' && cockpit(second).phase === 'Awaiting permission')
      expect(cockpit(first).turns).toBe(1)
      expect(first.transcript).toEqual(paused.transcript!)
      expect(engineTranscript(first)).toEqual(engineTranscript(second))
      const text = first.transcript.map((r) => r.text).join('\n')
      expect(text.indexOf('Retry ·')).toBeLessThan(text.indexOf('Use the declared tool.'))
      expect(text.indexOf('Use the declared tool.')).toBeLessThan(text.indexOf('Tool requested:'))
      expect(text.indexOf('Tool requested:')).toBeLessThan(text.indexOf('Awaiting permission'))
      await daemon.client.answerPermission({ id: paused.permissions[0]!.id, decision: 'allow' })
      await until(async () => (await detail()).steps.at(-1)?.output === 'Tool turn complete: cockpit retry and approve')
      const done = await detail()
      await until(() => first.steps.at(-1)?.status === 'succeeded' && second.steps.at(-1)?.status === 'succeeded')
      expect(first.transcript).toEqual(done.transcript!)
      expect(first.transcript).toEqual(second.transcript)
      const facts = first.transcript.map((r) => r.text).join('\n')
      expect(facts.indexOf('write_file · succeeded')).toBeLessThan(facts.indexOf('Tool turn complete:'))
      expect(facts).not.toContain('opaque-')
      expect(usage(first)).toEqual([{ model: 'fixture/tools', calls: 3, input: 240, output: 60, reported: 2 }])
      expect(cockpit(first)).toMatchObject({ phase: 'Completed', turns: 1, pending: 0 })
      const hidden = { ...first, activeMessageIDs: [] }
      expect(engineTranscript(hidden)).toEqual([])
      expect(usage(hidden)).toEqual(usage(first))
      await daemon.crash()
      daemon = await startDaemon({ home, env })
      const reopened = hydrate(initialSnapshot(), await detail())
      expect(engineTranscript(reopened)).toEqual(engineTranscript(first))
      expect(usage(reopened)).toEqual(usage(first))
    } finally { abort.abort(); await Promise.all(feeds); fixture.server.stop(true); await daemon.stop() }
  }, 60_000)
}


test('simultaneous empty-workspace attachments reuse one durable session', async () => {
  const daemon = await startDaemon()
  try {
    const replies = await Promise.all(Array.from({ length: 5 }, () => daemon.client.createSession({ reuseWorkspace: true })))
    expect(new Set(replies.map((r) => r.session.id)).size).toBe(1)
    expect((await daemon.client.listSessions()).sessions).toHaveLength(1)
    const separate = await daemon.client.createSession({})
    expect(separate.session.id).not.toBe(replies[0]!.session.id)
  } finally { await daemon.stop() }
}, 30_000)
