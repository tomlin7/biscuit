import { expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startDaemon, tempHome, until } from './harness'
import { Store } from '../src/store'
import { Checkpoints, WorkspaceTrees } from '../src/checkpoints'
import type { Rewind } from '../src/protocol'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'
import { engineTranscript } from '../../src/engine/transcript'

const frame = (event: object) => `data: ${JSON.stringify(event)}\n\n`
const git = (cwd: string, args: string[]) => {
  const result = Bun.spawnSync({ cmd: ['git', '-c', 'commit.gpgsign=false', '-C', cwd, ...args], stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString()
}

test('real daemon rewinds files and active model history, preserves Git index, converges two clients and survives restart', async () => {
  const home = tempHome(), workspace = join(home, 'workspace')
  mkdirSync(workspace)
  writeFileSync(join(workspace, 'tracked.txt'), 'committed')
  writeFileSync(join(workspace, '.gitignore'), 'ignored.txt\n')
  git(workspace, ['init'])
  git(workspace, ['add', '.'])
  git(workspace, ['-c', 'user.name=Test', '-c', 'user.email=test@local', 'commit', '-m', 'initial'])
  writeFileSync(join(workspace, 'tracked.txt'), 'staged change')
  git(workspace, ['add', 'tracked.txt'])
  const index = git(workspace, ['ls-files', '--stage'])
  const head = git(workspace, ['rev-parse', 'HEAD'])
  const requests: any[] = []
  const upstream = Bun.serve({ port: 0, hostname: '127.0.0.1', async fetch(req) {
    const body: any = await req.json(); requests.push(body)
    const user = body.input.findLast((item: any) => item.role === 'user')
    return new Response(frame({ type: 'response.output_text.delta', delta: `Answer to ${user.content}` }) + frame({ type: 'response.completed' }), { headers: { 'content-type': 'text/event-stream' } })
  } })
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/chat', providers: [{ id: 'fixture', adapter: 'openai',
    baseURL: upstream.url.href.replace(/\/$/, ''), apiKeyEnv: 'HIROSHI_CHECKPOINT_KEY', models: [{ id: 'chat', model: 'test', label: 'Fixture', contextWindow: 65536, reservedOutput: 1024 }] }] }))
  const env = { HIROSHI_CHECKPOINT_KEY: 'fixture-key' }
  let daemon = await startDaemon({ home, workspace, env })
  const abort = new AbortController()
  const feeds: Promise<void>[] = []
  try {
    const { session } = await daemon.client.createSession({})
    const detail = () => daemon.client.session({ id: session.id })
    const prompt = async (text: string) => {
      await daemon.client.prompt({ id: session.id, text })
      await until(async () => (await detail()).messages.some((message) => message.text === `Answer to ${text}`))
    }
    writeFileSync(join(workspace, 'ignored.txt'), 'untouched')
    writeFileSync(join(workspace, 'binary.bin'), Buffer.from([0, 255, 128, 1]))
    await prompt('keep-this-goal')
    writeFileSync(join(workspace, 'tracked.txt'), 'first task done')
    await prompt('discard-this-turn')
    const before = await detail()
    const checkpoint = before.checkpoints.find((item) => item.label === 'discard-this-turn')!
    expect(checkpoint).toBeTruthy()
    renameSync(join(workspace, 'tracked.txt'), join(workspace, 'renamed.txt'))
    unlinkSync(join(workspace, 'binary.bin'))
    writeFileSync(join(workspace, 'new.txt'), 'new work worth saving')
    writeFileSync(join(workspace, 'ignored.txt'), 'still untouched')
    let first = hydrate(initialSnapshot(), before), second = hydrate(initialSnapshot(), before)
    feeds.push(daemon.client.feed({ after: before.seq, signal: abort.signal, onEvent: (event) => { first = apply(first, event) } }).catch(() => {}))
    feeds.push(daemon.client.feed({ after: before.seq, signal: abort.signal, onEvent: (event) => { second = apply(second, event) } }).catch(() => {}))
    const { rewind } = await daemon.client.rewind({ id: session.id, checkpointID: checkpoint.id, key: 'once' })
    expect(rewind.state).toBe('completed')
    const restored = await detail()
    await until(() => first.rewinds.at(-1)?.state === 'completed' && second.rewinds.at(-1)?.state === 'completed')
    expect(first.activeMessageIDs).toEqual(restored.activeMessageIDs)
    expect(first).toEqual(second)
    expect(readFileSync(join(workspace, 'tracked.txt'), 'utf8')).toBe('first task done')
    expect(existsSync(join(workspace, 'renamed.txt'))).toBe(false)
    expect(existsSync(join(workspace, 'new.txt'))).toBe(false)
    expect(readFileSync(join(workspace, 'binary.bin'))).toEqual(Buffer.from([0, 255, 128, 1]))
    expect(readFileSync(join(workspace, 'ignored.txt'), 'utf8')).toBe('still untouched')
    expect(git(workspace, ['ls-files', '--stage'])).toBe(index)
    expect(git(workspace, ['rev-parse', 'HEAD'])).toBe(head)
    expect(restored.messages).toEqual(expect.arrayContaining(before.messages))
    expect(JSON.stringify(engineTranscript(hydrate(initialSnapshot(), restored)))).not.toContain('Answer to discard-this-turn')
    await prompt('continue-from-checkpoint')
    expect(JSON.stringify(requests.at(-1).input)).toContain('keep-this-goal')
    expect(JSON.stringify(requests.at(-1).input)).not.toContain('discard-this-turn')
    const now = await detail()
    await daemon.crash()
    daemon = await startDaemon({ home, workspace, env })
    const reopened = await detail()
    expect(reopened.activeMessageIDs).toEqual(now.activeMessageIDs)
    expect(reopened.messages).toEqual(now.messages)
    expect(reopened.checkpoints).toEqual(now.checkpoints)
    expect(requests).toHaveLength(3)
    await daemon.client.rewind({ id: session.id, checkpointID: checkpoint.id, key: 'once' })
    expect((await detail()).rewinds).toHaveLength(1)
    await daemon.client.rewind({ id: session.id, checkpointID: rewind.safetyCheckpointID, key: 'undo' })
    expect(readFileSync(join(workspace, 'renamed.txt'), 'utf8')).toBe('first task done')
    expect(readFileSync(join(workspace, 'new.txt'), 'utf8')).toBe('new work worth saving')
    expect((await detail()).activeMessageIDs).toContain(before.messages.at(-1)!.id)
  } finally { abort.abort(); await Promise.all(feeds); upstream.stop(true); await daemon.stop() }
}, 60000)

test('startup recovers a durable partially applied rewind before new work and retries preserve later edits', async () => {
  const home = tempHome(), workspace = join(home, 'workspace')
  mkdirSync(workspace)
  writeFileSync(join(workspace, 'a.txt'), 'old a'); writeFileSync(join(workspace, 'b.txt'), 'old b')
  let daemon = await startDaemon({ home, workspace })
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'original-turn' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
    const target = (await daemon.client.session({ id: session.id })).checkpoints[0]!
    writeFileSync(join(workspace, 'a.txt'), 'new a'); writeFileSync(join(workspace, 'b.txt'), 'new b')
    await daemon.crash()
    const store = Store.open(join(home, 'engine.db')); store.migrate()
    const checkpoints = new Checkpoints(store, home)
    const safety = checkpoints.prepare(session.id, { id: 'safety', text: 'Safety before crash' } as any)
    safety.kind = 'safety'; safety.promptID = null
    store.record({ type: 'checkpoint.created', sessionID: session.id, data: { checkpoint: safety }, project: () => store.insertCheckpoint(safety) })
    const trees = new WorkspaceTrees(home, workspace)
    const rewind: Rewind = { id: 'rewind_crash', sessionID: session.id, checkpointID: target.id, safetyCheckpointID: safety.id, key: 'crash',
      state: 'pending', plan: trees.plan(safety.tree, target.tree), error: null, at: Date.now(), completedAt: null }
    store.record({ type: 'rewind.started', sessionID: session.id, data: { rewind }, project: () => store.putRewind(rewind) })
    store.close()
    writeFileSync(trees.temporary('b.txt', rewind.id), 'partial temporary content')
    writeFileSync(join(workspace, 'a.txt'), 'old a') // Already applied before the process stopped.
    writeFileSync(join(workspace, 'b.txt'), 'later external edit')
    daemon = await startDaemon({ home, workspace })
    const blocked = await daemon.client.session({ id: session.id })
    expect(blocked.rewinds[0]!.state).toBe('pending')
    expect(blocked.rewinds[0]!.error).toContain('later edits')
    await expect(daemon.client.startRun({ id: session.id, command: 'echo should-not-run' })).rejects.toMatchObject({ code: 'rewind_pending' })
    await daemon.client.prompt({ id: session.id, text: 'queued-during-recovery', key: 'queued' })
    expect((await daemon.client.session({ id: session.id })).inbox).toHaveLength(1)
    expect(readFileSync(join(workspace, 'b.txt'), 'utf8')).toBe('later external edit')
    writeFileSync(join(workspace, 'b.txt'), 'new b')
    await daemon.client.rewind({ id: session.id, checkpointID: target.id, key: 'crash' })
    const done = await daemon.client.session({ id: session.id })
    expect(done.rewinds[0]!.state).toBe('completed')
    expect(done.inbox).toHaveLength(0)
    expect(readFileSync(join(workspace, 'a.txt'), 'utf8')).toBe('old a')
    expect(readFileSync(join(workspace, 'b.txt'), 'utf8')).toBe('old b')
    expect(existsSync(trees.temporary('b.txt', rewind.id))).toBe(false)
    await daemon.crash()
    daemon = await startDaemon({ home, workspace })
    expect((await daemon.client.session({ id: session.id })).messages.filter((message) => message.rewindID)).toHaveLength(1)
    const retry = await daemon.client.prompt({ id: session.id, text: 'retry old send', key: 'queued' })
    expect(retry.item.state).toBe('cancelled')
    expect(retry.message).toBeNull()
  } finally { await daemon.stop() }
}, 60000)
