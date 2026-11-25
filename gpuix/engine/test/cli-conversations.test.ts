import { expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { startDaemon, tempHome, until } from './harness'
import type { AgentID, CliConversation } from '../src/protocol'

function fixture(adapter: AgentID = 'cursor') {
  const home = tempHome(), workspace = join(home, 'project'), native = join(home, 'native'), entry = join(home, 'agent.ts')
  mkdirSync(workspace); mkdirSync(native)
  writeFileSync(join(workspace, 'AGENTS.md'), 'Fixed response-only fixture instructions')
  const git = Bun.spawnSync(['git', '-C', workspace, 'init', '-b', 'main']); if (git.exitCode) throw new Error('Could not create the temporary repository')
  writeFileSync(entry, `await import(${JSON.stringify(pathToFileURL(join(import.meta.dir, 'fixtures/cli-continuation.ts')).href)})`)
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'agent/chat', providers: [{ id: 'agent', adapter: `${adapter}-cli`, command: [process.execPath, entry], cliVersion: '1.0.0-fixture',
    models: [{ id: 'chat', model: 'fixture-model', label: 'Native fixture', contextWindow: 32768, reservedOutput: 1024 }, { id: 'other', model: 'another-model', label: 'Another model', contextWindow: 32768, reservedOutput: 1024 }] }] }))
  writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, minFreeMemoryMB: 128, processMemoryMB: 512, maxProcesses: 4, timeoutMs: 30000 }))
  const policy = join(home, '.gemini', 'antigravity-cli'); mkdirSync(policy, { recursive: true })
  writeFileSync(join(policy, 'settings.json'), JSON.stringify({ toolPermission: 'strict', permissions: { deny: ['write_file(*)', 'command(*)', 'unsandboxed(*)', 'mcp(*)', 'execute_url(*)'] } }))
  const env = { HOME: home, USERPROFILE: home, HIROSHI_NATIVE_ROOT: native, HIROSHI_CONTINUATION_ADAPTER: adapter }
  return { home, workspace: realpathSync(workspace), native, entry, env,
    calls: () => readFileSync(join(native, 'calls.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line)),
    control: (value: object) => writeFileSync(join(native, 'control.json'), JSON.stringify(value)),
    start: () => startDaemon({ home, workspace, env }) }
}
const fresh = (binding: CliConversation, key: string) => ({ id: binding.sessionID, conversationID: binding.id, revision: binding.revision, key })

for (const adapter of ['cursor', 'agy', 'pi', 'grok'] as const) test(`${adapter}: native context survives restart; same-folder tasks and duplicate delivery remain isolated`, async () => {
  const f = fixture(adapter); let daemon = await f.start()
  try {
    const { session: a } = await daemon.client.createSession({}), { session: b } = await daemon.client.createSession({})
    const first = { id: a.id, text: 'remember alpha nonce', key: 'first' }
    await daemon.client.prompt(first); await daemon.client.prompt(first)
    await until(async () => (await daemon.client.session({ id: a.id })).cliConversation?.status === 'ready')
    const binding = (await daemon.client.session({ id: a.id })).cliConversation!
    const prepared = (await daemon.client.session({ id: a.id })).contexts.at(-1)!
    const supplied = f.calls()[0].input.instructions
    expect(JSON.stringify(supplied).includes('Fixed response-only fixture instructions')).toBe(adapter === 'pi')
    expect(prepared.sources.find((source) => source.source === 'workspace/AGENTS.md')?.delivery).toBe(adapter === 'pi' ? undefined : 'native-unverified')
    expect(prepared.configuration?.warnings.length).toBe(adapter === 'pi' ? 0 : 1)
    expect(binding).toMatchObject({ adapter, contractVersion: 2, cliVersion: '1.0.0-fixture', cwd: f.workspace, model: 'agent/chat', vendorModel: 'fixture-model' })
    await daemon.client.prompt({ id: b.id, text: 'remember beta nonce' })
    await until(async () => (await daemon.client.session({ id: b.id })).cliConversation?.status === 'ready')
    expect((await daemon.client.session({ id: b.id })).cliConversation!.vendorSessionID).not.toBe(binding.vendorSessionID)
    await daemon.crash(); daemon = await f.start()
    await daemon.client.prompt({ id: a.id, text: 'what was first?', key: 'second' })
    await until(async () => (await daemon.client.session({ id: a.id })).steps.filter((step) => step.status === 'succeeded').length === 2)
    const done = await daemon.client.session({ id: a.id })
    expect(done.steps.at(-1)?.output).toContain('first remember alpha nonce')
    expect(done.steps.at(-1)?.output).not.toContain('beta')
    expect(done.cliConversation?.vendorSessionID).toBe(binding.vendorSessionID)
    const calls = f.calls(); expect(calls).toHaveLength(3)
    expect(calls[2].resumed).toBe(true)
    expect(calls[2].input.conversation).toEqual([{ role: 'user', text: 'what was first?' }])
  } finally { await daemon.stop() }
}, 30000)

test('model/version changes and missing native history require explicit fresh recovery, which is idempotent', async () => {
  const f = fixture(); const daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'first' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    let binding = (await daemon.client.session({ id: session.id })).cliConversation!
    await expect(daemon.client.prompt({ id: session.id, text: 'switch', model: 'agent/other' })).rejects.toMatchObject({ code: 'cli_transition_required' })
    expect(f.calls()).toHaveLength(1)
    appendFileSync(f.entry, '\n// upgraded CLI')
    await expect(daemon.client.prompt({ id: session.id, text: 'upgrade' })).rejects.toMatchObject({ code: 'cli_transition_required' })
    await daemon.client.freshCliConversation(fresh(binding, 'fresh-after-upgrade'))
    await daemon.client.prompt({ id: session.id, text: 'explicit new turn' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    const newer = (await daemon.client.session({ id: session.id })).cliConversation!
    await daemon.client.freshCliConversation(fresh(binding, 'fresh-after-upgrade'))
    expect((await daemon.client.session({ id: session.id })).cliConversation?.id).toBe(newer.id)
    expect(newer.vendorSessionID).not.toBe(binding.vendorSessionID)
    expect(f.calls()[1].resumed).toBe(false)
    f.control({ missing: true })
    await daemon.client.prompt({ id: session.id, text: 'expired session' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'blocked')
    binding = (await daemon.client.session({ id: session.id })).cliConversation!
    await expect(daemon.client.prompt({ id: session.id, text: 'no silent fallback' })).rejects.toMatchObject({ code: 'cli_recovery_required' })
    expect(f.calls()).toHaveLength(3)
    expect(JSON.stringify(await daemon.client.session({ id: session.id }))).not.toContain('private-fixture-secret')
    f.control({})
    await daemon.client.freshCliConversation(fresh(binding, 'fresh-after-expiry'))
    await daemon.client.prompt({ id: session.id, text: 'new deliberate prompt' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    expect(f.calls()).toHaveLength(4)
    expect(f.calls()[3].resumed).toBe(false)
  } finally { await daemon.stop() }
}, 30000)

for (const adapter of ['cursor', 'grok'] as const) test(`${adapter}: a resumed ID mismatch cannot leak output from another native conversation`, async () => {
  const f = fixture(adapter); const daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'first' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    f.control({ wrongID: true })
    await daemon.client.prompt({ id: session.id, text: 'follow up' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'blocked')
    const detail = await daemon.client.session({ id: session.id })
    expect(detail.steps.at(-1)?.error?.code).toBe('cli_identity_mismatch')
    expect(JSON.stringify(detail)).not.toContain('private-fixture-secret')
    expect(detail.steps.at(-1)?.output).toBe('')
    expect(f.calls()).toHaveLength(2)
  } finally { await daemon.stop() }
}, 20000)

for (const beforeInit of [false, true]) test(`a crash ${beforeInit ? 'before' : 'after'} native acknowledgement blocks queued work until deliberate recovery and never replays the old key`, async () => {
  const f = fixture(); f.control(beforeInit ? { beforeInit: true } : { hold: true }); let daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    const input = { id: session.id, text: 'uncertain call', key: 'uncertain-key' }
    const admitted = await daemon.client.prompt(input)
    await until(async () => {
      const binding = (await daemon.client.session({ id: session.id })).cliConversation
      return !!binding && (beforeInit ? existsSync(join(f.native, 'calls.jsonl')) : !!binding.vendorSessionID)
    })
    const running = (await daemon.client.session({ id: session.id })).cliConversation!
    await expect(daemon.client.freshCliConversation(fresh(running, 'too-early'))).rejects.toMatchObject({ code: 'cli_busy' })
    await daemon.client.prompt({ id: session.id, text: 'queued follow up', key: 'queued' })
    await daemon.crash(); daemon = await f.start()
    const interrupted = await daemon.client.session({ id: session.id })
    expect(interrupted.cliConversation?.status).toBe('blocked')
    expect(interrupted.inbox).toHaveLength(1)
    expect((await daemon.client.prompt(input)).item.id).toBe(admitted.item.id)
    expect(f.calls()).toHaveLength(1)
    f.control({})
    await daemon.client.freshCliConversation(fresh(interrupted.cliConversation!, 'recover'))
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    expect(f.calls()).toHaveLength(2)
    expect(f.calls()[1].input.conversation.at(-1).text).toBe('queued follow up')
    expect(f.calls()[1].resumed).toBe(false)
    expect((await daemon.client.session({ id: session.id })).steps).toHaveLength(2)
  } finally { await daemon.stop() }
}, 30000)

test('a native follow-up receives every newly delivered steer/queue prompt exactly once', async () => {
  const f = fixture(); f.control({ hold: true }); const daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'first native prompt' })
    await until(async () => !!(await daemon.client.session({ id: session.id })).cliConversation?.vendorSessionID)
    await daemon.client.prompt({ id: session.id, text: 'queued requirement', mode: 'queue' })
    await daemon.client.prompt({ id: session.id, text: 'steering requirement', mode: 'steer' })
    f.control({}); writeFileSync(join(f.native, 'release'), 'release')
    await until(async () => (await daemon.client.session({ id: session.id })).steps.filter((step) => step.status === 'succeeded').length === 2)
    expect(f.calls()).toHaveLength(2)
    expect(f.calls()[1].input.conversation).toEqual([{ role: 'user', text: 'steering requirement' }, { role: 'user', text: 'queued requirement' }])
    expect((await daemon.client.session({ id: session.id })).steps.at(-1)?.output).toContain('Native users 3')
  } finally { await daemon.stop() }
}, 20000)

test('vendor ownership cannot be shared across tasks, and rewind requires a new native conversation', async () => {
  const f = fixture(); const daemon = await f.start()
  try {
    const { session: a } = await daemon.client.createSession({}), { session: b } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: a.id, text: 'first task' })
    await until(async () => (await daemon.client.session({ id: a.id })).cliConversation?.status === 'ready')
    f.control({ reuseID: (await daemon.client.session({ id: a.id })).cliConversation!.vendorSessionID })
    await daemon.client.prompt({ id: b.id, text: 'another task' })
    await until(async () => (await daemon.client.session({ id: b.id })).cliConversation?.status === 'blocked')
    expect((await daemon.client.session({ id: b.id })).steps[0]?.error?.code).toBe('cli_session_shared')
    expect(JSON.stringify(await daemon.client.session({ id: b.id }))).not.toContain('private-fixture-secret')
    f.control({})
    const next = await daemon.client.prompt({ id: a.id, text: 'second task turn' })
    await until(async () => (await daemon.client.session({ id: a.id })).steps.filter((step) => step.status === 'succeeded').length === 2)
    const before = await daemon.client.session({ id: a.id }), checkpoint = before.checkpoints.find((item) => item.promptID === next.item.id)!
    await daemon.client.rewind({ id: a.id, checkpointID: checkpoint.id, key: 'rewind-before-last-native-turn' })
    await expect(daemon.client.prompt({ id: a.id, text: 'cannot reuse future native context' })).rejects.toMatchObject({ code: 'cli_rewind_required' })
    expect(f.calls()).toHaveLength(3)
    await daemon.client.freshCliConversation(fresh(before.cliConversation!, 'fresh-after-rewind'))
    await daemon.client.prompt({ id: a.id, text: 'new branch' })
    await until(async () => (await daemon.client.session({ id: a.id })).cliConversation?.status === 'ready')
    expect(f.calls()[3].resumed).toBe(false)
    expect(f.calls()[3].input.conversation.some((item: any) => item.text === 'second task turn')).toBe(false)
  } finally { await daemon.stop() }
}, 30000)

test('a durable successful CLI exit is finalized once after a database failure and daemon crash, with no second execution', async () => {
  const f = fixture(); let daemon = await f.start()
  const db = new Database(daemon.paths.database)
  try {
    db.exec(`create trigger stop_final_commit before update on step when new.status != 'running' begin select raise(abort, 'fixture storage failure'); end`)
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'one confirmed result' })
    await until(async () => (await daemon.client.session({ id: session.id })).parts.some((part) => part.kind === 'cli' && part.version === 2 && part.phase === 'completed'))
    expect((await daemon.client.session({ id: session.id })).messages.filter((item) => item.role === 'assistant')).toHaveLength(0)
    await daemon.crash(); db.exec('drop trigger stop_final_commit'); daemon = await f.start()
    const restored = await daemon.client.session({ id: session.id })
    expect(restored.steps[0]?.status).toBe('succeeded')
    expect(restored.messages.filter((item) => item.role === 'assistant')).toHaveLength(1)
    expect(restored.cliConversation?.status).toBe('ready')
    expect(f.calls()).toHaveLength(1)
    await daemon.crash(); daemon = await f.start()
    expect((await daemon.client.session({ id: session.id })).messages.filter((item) => item.role === 'assistant')).toHaveLength(1)
    expect(f.calls()).toHaveLength(1)
  } finally { db.close(); await daemon.stop() }
}, 30000)

test('missing owned Pi files and changed instructions cannot silently recreate or reuse native context', async () => {
  const f = fixture('pi'); const daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'first' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    let binding = (await daemon.client.session({ id: session.id })).cliConversation!
    unlinkSync(join(f.home, 'cli-sessions', binding.id, 'session.jsonl'))
    await daemon.client.prompt({ id: session.id, text: 'missing file' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'blocked')
    expect(f.calls()).toHaveLength(1)
    binding = (await daemon.client.session({ id: session.id })).cliConversation!
    await daemon.client.freshCliConversation(fresh(binding, 'fresh'))
    await daemon.client.prompt({ id: session.id, text: 'new native session' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    writeFileSync(join(f.workspace, 'AGENTS.md'), 'Changed instructions')
    await daemon.client.prompt({ id: session.id, text: 'changed instructions' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'blocked')
    expect(f.calls()).toHaveLength(2)
  } finally { await daemon.stop() }
}, 30000)

test('a different queued model is rejected before admission and a stale recovery revision cannot replace live history', async () => {
  const f = fixture(); f.control({ hold: true }); const daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'first' })
    await until(async () => !!(await daemon.client.session({ id: session.id })).cliConversation?.vendorSessionID)
    const running = (await daemon.client.session({ id: session.id })).cliConversation!
    await expect(daemon.client.prompt({ id: session.id, text: 'wrong model', model: 'agent/other' })).rejects.toMatchObject({ code: 'cli_transition_required' })
    expect((await daemon.client.session({ id: session.id })).inbox).toHaveLength(0)
    f.control({}); writeFileSync(join(f.native, 'release'), 'release')
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    await expect(daemon.client.freshCliConversation(fresh(running, 'stale'))).rejects.toMatchObject({ code: 'cli_revision' })
    expect(f.calls()).toHaveLength(1)
  } finally { await daemon.stop() }
}, 20000)

test('legacy stateless history requires an explicit new binding before another prompt is admitted', async () => {
  const f = fixture(); let daemon = await f.start()
  try {
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'old saved turn' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    await daemon.crash()
    const db = new Database(daemon.paths.database)
    try {
      db.exec('drop table cli_conversation; delete from schema_migration where id = 11')
      db.exec("update step_part set data = json_set(data, '$.version', 1) where json_extract(data, '$.kind') = 'cli'")
    } finally { db.close() }
    daemon = await f.start()
    await expect(daemon.client.prompt({ id: session.id, text: 'not admitted' })).rejects.toMatchObject({ code: 'cli_legacy_history' })
    const blocked = await daemon.client.session({ id: session.id })
    expect(blocked.cliConversation?.status).toBe('blocked')
    expect(blocked.messages.filter((item) => item.role === 'user')).toHaveLength(1)
    expect(f.calls()).toHaveLength(1)
    await daemon.client.freshCliConversation(fresh(blocked.cliConversation!, 'legacy-fresh'))
    await daemon.client.prompt({ id: session.id, text: 'deliberately continued' })
    await until(async () => (await daemon.client.session({ id: session.id })).cliConversation?.status === 'ready')
    expect(f.calls()[1].resumed).toBe(false)
    expect(f.calls()[1].input.conversation.some((item: any) => item.text === 'old saved turn')).toBe(true)
  } finally { await daemon.stop() }
}, 20000)

test('failed binding finalization holds pending work until restart reconciles the saved successful step', async () => {
  const f = fixture(); f.control({ hold: true }); let daemon = await f.start()
  const db = new Database(daemon.paths.database)
  try {
    db.exec(`create trigger stop_binding_ready before update on cli_conversation when json_extract(new.data, '$.status') = 'ready' begin select raise(abort, 'fixture binding failure'); end`)
    const { session } = await daemon.client.createSession({})
    await daemon.client.prompt({ id: session.id, text: 'first' })
    await until(async () => !!(await daemon.client.session({ id: session.id })).cliConversation?.vendorSessionID)
    await daemon.client.prompt({ id: session.id, text: 'queued second' })
    f.control({}); writeFileSync(join(f.native, 'release'), 'release')
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
    expect((await daemon.client.session({ id: session.id })).inbox).toHaveLength(1)
    expect(f.calls()).toHaveLength(1)
    await daemon.crash(); db.exec('drop trigger stop_binding_ready'); daemon = await f.start()
    await until(async () => (await daemon.client.session({ id: session.id })).steps.filter((step) => step.status === 'succeeded').length === 2)
    expect(f.calls()).toHaveLength(2)
    expect(f.calls()[1].resumed).toBe(true)
    expect(f.calls()[1].input.conversation).toEqual([{ role: 'user', text: 'queued second' }])
  } finally { db.close(); await daemon.stop() }
}, 30000)
