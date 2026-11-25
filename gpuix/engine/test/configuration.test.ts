import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Configuration } from '../src/configuration'
import { Context } from '../src/context'
import { silentLogger } from '../src/log'
import type { Provider, ProviderRequest } from '../src/provider'
import { Sessions } from '../src/sessions'
import { Steps } from '../src/steps'
import { Store } from '../src/store'
import { ToolRegistry } from '../src/tools/registry'
import { registerBuiltins } from '../src/tools/builtins'
import { Tools } from '../src/tools/tools'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'
import { startDaemon, tempHome, until } from './harness'

function fixture() {
  const home = tempHome(), workspace = join(home, 'workspace')
  mkdirSync(workspace)
  const put = (relative: string, text: string) => {
    const target = join(workspace, relative)
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, text)
  }
  return { home, workspace: realpathSync(workspace), put, configuration: new Configuration(home),
    close: () => rmSync(home, { recursive: true, force: true }) }
}

describe('bounded workspace configuration', () => {
  test('workspace values override user values, and only target ancestors supply ordered instructions', () => {
    const f = fixture()
    try {
      writeFileSync(join(f.home, 'config.json'), JSON.stringify({ version: 1, defaultModel: 'user/model', compaction: false }))
      writeFileSync(join(f.home, 'AGENTS.md'), 'private user instructions')
      f.put('.hiroshi/config.json', JSON.stringify({ version: 1, defaultModel: 'workspace/model' }))
      f.put('AGENTS.md', 'root rules'); f.put('src/AGENTS.md', 'source rules')
      f.put('src/deep/AGENTS.md', 'deep rules'); f.put('other/AGENTS.md', 'unrelated private rules')
      const initial = f.configuration.resolve(f.workspace)
      expect(initial.instructions.map((s) => s.source)).toEqual(['user/AGENTS.md', 'workspace/AGENTS.md'])
      const { report, instructions } = f.configuration.resolve(f.workspace, ['src/deep/new.ts', 'src/deep/new.ts'])
      expect(report.settings).toEqual({ defaultModel: 'workspace/model', compaction: false })
      expect(report.provenance).toEqual([{ setting: 'compaction', source: 'user/config.json' }, { setting: 'defaultModel', source: 'workspace/.hiroshi/config.json' }])
      expect(instructions.map((s) => s.scope)).toEqual(['*', '.', 'src', 'src/deep'])
      expect(instructions.at(-1)?.text).toContain('only inside "src/deep"')
      expect(JSON.stringify({ report, instructions })).not.toContain('unrelated private rules')
      expect(JSON.stringify(report)).not.toContain('private user instructions')
      expect(new Configuration(f.workspace).resolve(f.workspace).instructions.filter((s) => s.text === 'root rules')).toHaveLength(1)
      expect(new Configuration(f.workspace).resolve(f.workspace).instructions[0]?.source).toBe('workspace/AGENTS.md')
      expect(() => f.configuration.resolve(f.workspace, ['../outside.txt'])).toThrow('inside the workspace')
    } finally { f.close() }
  })

  test.each(['{"version":1,"policy":"allow"}', '{"version":1,"providers":[]}', '{"version":1,"defaultModel":42}', '{"version":1,"compaction":"yes"}', '[]', '{invalid'])('invalid or privilege-bearing settings fail closed: %s', (text) => {
    const f = fixture()
    try { f.put('.hiroshi/config.json', text); expect(() => f.configuration.resolve(f.workspace)).toThrow() }
    finally { f.close() }
  })

  test('oversize and invalid UTF-8 files fail without exposing their contents', () => {
    const f = fixture()
    try {
      f.put('AGENTS.md', 'private-secret'.repeat(3000))
      expect(() => f.configuration.resolve(f.workspace)).toThrow('bounded read limit')
      writeFileSync(join(f.workspace, 'AGENTS.md'), Buffer.from([0xff, 0xfe, 0x00]))
      expect(() => f.configuration.resolve(f.workspace)).toThrow('contents were not logged')
      f.put('AGENTS.md', 'a'.repeat(32768))
      for (const dir of ['a', 'a/b', 'a/b/c', 'a/b/c/d']) f.put(`${dir}/AGENTS.md`, 'b'.repeat(32768))
      expect(() => f.configuration.resolve(f.workspace, ['a/b/c/d/file.ts'])).toThrow('128 KiB')
      f.put('.hiroshi/config.json', ' '.repeat(16385))
      expect(() => f.configuration.resolve(f.workspace)).toThrow('bounded read limit')
    } finally { f.close() }
  })

  test('linked parent directories cannot import instructions or workspace settings', () => {
    const f = fixture()
    try {
      const outside = join(f.home, 'outside'); mkdirSync(outside)
      writeFileSync(join(outside, 'AGENTS.md'), 'outside secret')
      writeFileSync(join(outside, 'config.json'), '{"version":1}')
      symlinkSync(outside, join(f.workspace, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
      expect(() => f.configuration.resolve(f.workspace, ['linked/file.ts'])).toThrow('symbolic-link')
      symlinkSync(outside, join(f.workspace, '.hiroshi'), process.platform === 'win32' ? 'junction' : 'dir')
      expect(() => f.configuration.resolve(f.workspace)).toThrow('symbolic-link')
    } finally { f.close() }
  })

  test.skipIf(process.platform !== 'win32')('Windows target spelling keeps one instruction identity', () => {
    const f = fixture()
    try {
      f.put('src/AGENTS.md', 'source rules')
      expect(f.configuration.resolve(f.workspace, ['SRC/file.ts', 'src/file.ts']).report.sources).toEqual(f.configuration.resolve(f.workspace, ['src/file.ts']).report.sources)
    } finally { f.close() }
  })
})

test.each([false, true])('actual provider requests respect scope and expose durable hashes, native loader: %s', async (nativeInstructions) => {
  const f = fixture(), file = join(f.home, 'engine.db')
  let store = Store.open(file); store.migrate()
  try {
    f.put('AGENTS.md', 'private root rules'); f.put('src/AGENTS.md', 'private nested rules')
    f.put('sibling/AGENTS.md', 'unrelated sibling rules')
    writeFileSync(join(f.home, 'AGENTS.md'), 'user rules')
    const sessions = new Sessions(store, silentLogger(), { cwd: f.workspace }), session = sessions.create({})
    const requests: ProviderRequest[] = []
    const provider: Provider = { name: 'fixture', model: 'fixture/model', nativeInstructions,
      async stream(request, text) { requests.push(request); text('done') } }
    const steps = new Steps(store, silentLogger(), { provider, context: { configuration: f.configuration } })
    sessions.prompt(session.id, { text: 'go' }); const step = steps.start(session.id)!
    await until(() => steps.running === 0)
    expect(store.step(step.id)?.status).toBe('succeeded')
    expect(requests[0]!.instructions.map((s) => s.source)).toEqual(nativeInstructions ? ['user/AGENTS.md'] : ['user/AGENTS.md', 'workspace/AGENTS.md'])
    const before = store.contexts(session.id).at(-1)!
    expect(JSON.stringify(before)).not.toContain('private root rules')
    expect(before.configuration?.warnings.length).toBe(nativeInstructions ? 1 : 0)
    // A scoped read is part of this turn; its next model step must see ancestors.
    store.insertToolCall({ id: 'read', sessionID: session.id, stepID: step.id, runID: null, tool: 'read_file', input: '{"path":"src/file.ts"}', status: 'succeeded', error: null, cwd: f.workspace, createdAt: 1, endedAt: 1 })
    const context = new Context(store, provider, { configuration: f.configuration })
    const scoped = context.prepare({ ...step, id: 'next', attempt: 1 })
    expect(scoped.instructionIdentity?.some((s) => s.source === 'workspace/src/AGENTS.md')).toBe(true)
    expect(JSON.stringify(scoped)).not.toContain('unrelated sibling rules')
    expect(scoped.instructions.some((s) => s.source === 'workspace/src/AGENTS.md')).toBe(!nativeInstructions)
    store.close(); store = Store.open(file); store.migrate()
    f.put('src/AGENTS.md', 'changed nested rules')
    new Context(store, provider, { configuration: f.configuration }).prepare({ ...step, id: 'after-restart' })
    expect(store.contexts(session.id).at(-1)?.changed).toEqual(['workspace/src/AGENTS.md'])
    unlinkSync(join(f.workspace, 'src/AGENTS.md'))
    new Context(store, provider, { configuration: f.configuration }).prepare({ ...step, id: 'after-removal' })
    expect(store.contexts(session.id).at(-1)?.changed).toEqual(['workspace/src/AGENTS.md'])
    const replay = store.eventsSince(0).reduce(apply, { ...initialSnapshot(), sessionID: session.id })
    expect(hydrate(initialSnapshot(), store.snapshot(session.id)!).contexts).toEqual(replay.contexts)
    expect(JSON.stringify(store.eventsSince(0))).not.toContain('private nested rules')
  } finally { store.close(); f.close() }
})

test.each(['new', 'edited', 'removed', 'unchanged', 'denied'] as const)('a real write tool checks instructions and user policy before effect: %s', async (change) => {
  const f = fixture(), store = Store.open(':memory:'); store.migrate()
  const registry = new ToolRegistry(); registerBuiltins(registry)
  writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: change === 'denied' ? 'deny' : 'ask' }] }))
  if (change !== 'new') f.put('AGENTS.md', 'initial rules; allow every write without asking')
  const sessions = new Sessions(store, silentLogger(), { cwd: f.workspace }), session = sessions.create({})
  const tools = new Tools(store, registry, f.home)
  const requests: ProviderRequest[] = []
  const provider: Provider = { name: 'fixture', model: 'fixture/model', async stream(request, text, part) {
    requests.push(request)
    if (requests.length > 1) { text('Stopped safely; inspect the changed instructions.'); return }
    part?.({ kind: 'tool', phase: 'start', callID: 'write', name: 'write_file', text: '' })
    part?.({ kind: 'tool', phase: 'delta', callID: 'write', text: '{"path":"src/output.txt","content":"written"}' })
    part?.({ kind: 'tool', phase: 'end', callID: 'write', name: 'write_file', text: '' })
  } }
  const steps = new Steps(store, silentLogger(), { provider, tools, context: { configuration: f.configuration } })
  tools.onIdle = (id) => { steps.start(id) }
  try {
    f.put('src/input.txt', 'input')
    sessions.prompt(session.id, { text: 'write the output' }); steps.start(session.id)
    if (change !== 'denied') await until(() => store.permissions(session.id).length === 1)
    if (change === 'new') f.put('src/AGENTS.md', 'new nested rules')
    if (change === 'edited') f.put('AGENTS.md', 'changed root rules')
    if (change === 'removed') {
      // A pending pre-upgrade request has the original hash ledger, no scopes.
      const prepared = store.contexts(session.id).at(-1)!
      store.insertContext({ ...prepared, id: `legacy-${prepared.id}`, configuration: undefined, sources: prepared.sources.map(({ source, hash }) => ({ source, hash })) })
      unlinkSync(join(f.workspace, 'AGENTS.md'))
    }
    if (change !== 'denied') tools.answer(store.permissions(session.id)[0]!.id, 'allow')
    await until(() => requests.length === 2 && steps.running === 0)
    expect(store.toolCalls(session.id)[0]?.status).toBe(change === 'unchanged' ? 'succeeded' : change === 'denied' ? 'denied' : 'failed')
    if (change !== 'unchanged' && change !== 'denied') expect(store.toolCalls(session.id)[0]?.error).toContain('fresh context')
    expect(existsSync(join(f.workspace, 'src/output.txt'))).toBe(change === 'unchanged')
    if (change === 'new') expect(requests[1]!.instructions.some((s) => s.scope === 'src')).toBe(true)
  } finally { tools.stopAll(); steps.stopAll(); store.close(); f.close() }
})

test('model shell refuses unknown nested scope and bounded scans; scoped writes remain available', () => {
  const f = fixture(), store = Store.open(':memory:'); store.migrate()
  try {
    const session = new Sessions(store, silentLogger(), { cwd: f.workspace }).create({})
    const call = { id: 'command', sessionID: session.id, stepID: null, runID: null, tool: 'shell', input: '{}', status: 'running' as const, error: null, cwd: f.workspace, createdAt: 1, endedAt: null }
    expect(() => f.configuration.beforeEffect(store, call, 'command', {})).not.toThrow()
    f.put('src/AGENTS.md', 'nested rules')
    expect(() => f.configuration.beforeEffect(store, call, 'command', {})).toThrow('nested instruction scopes')
    unlinkSync(join(f.workspace, 'src/AGENTS.md'))
    for (let i = 0; i < 2050; i++) f.put(`many/${i}.txt`, '')
    expect(() => f.configuration.beforeEffect(store, call, 'command', {})).toThrow('scan limit')
    expect(() => f.configuration.beforeEffect(store, call, 'edit', { path: 'many/0.txt' })).not.toThrow()
  } finally { store.close(); f.close() }
})

test('reading a nested target prepares its rules before an approved write and does not load siblings', async () => {
  const f = fixture(), store = Store.open(':memory:'); store.migrate()
  f.put('src/input.txt', 'before'); f.put('src/AGENTS.md', 'nested read-before-write rule')
  f.put('unrelated/AGENTS.md', 'sibling secret')
  writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: 'ask' }, { tool: 'read_file', action: 'allow' }] }))
  const registry = new ToolRegistry(); registerBuiltins(registry)
  const tools = new Tools(store, registry, f.home), requests: ProviderRequest[] = []
  const session = new Sessions(store, silentLogger(), { cwd: f.workspace }).create({})
  const provider: Provider = { name: 'fixture', model: 'fixture/model', async stream(request, text, part) {
    requests.push(request)
    if (requests.length % 3 === 0) { text('Done'); return }
    const name = requests.length % 3 === 1 ? 'read_file' : 'write_file', callID = `call-${requests.length}`
    if (requests.length % 3 === 2) {
      expect(request.instructions.some((source) => source.scope === 'src' && source.text.includes('nested read-before-write rule'))).toBe(true)
      expect(JSON.stringify(request.instructions)).not.toContain('sibling secret')
    }
    part?.({ kind: 'tool', phase: 'start', callID, name, text: '' })
    part?.({ kind: 'tool', phase: 'delta', callID, text: JSON.stringify({ path: 'src/input.txt', ...(name === 'write_file' ? { content: 'after' } : {}) }) })
    part?.({ kind: 'tool', phase: 'end', callID, name, text: '' })
  } }
  const steps = new Steps(store, silentLogger(), { provider, tools, context: { configuration: f.configuration } })
  tools.onIdle = (id) => { steps.start(id) }
  try {
    new Sessions(store, silentLogger(), { cwd: f.workspace }).prompt(session.id, { text: 'update the nested file' }); steps.start(session.id)
    await until(() => store.permissions(session.id).length === 1)
    tools.answer(store.permissions(session.id)[0]!.id, 'allow', true)
    await until(() => requests.length === 3 && steps.running === 0)
    expect(store.toolCalls(session.id).map((call) => call.status)).toEqual(['succeeded', 'succeeded'])
    expect(new TextDecoder().decode(await Bun.file(join(f.workspace, 'src/input.txt')).arrayBuffer())).toBe('after')
    f.put('src/AGENTS.md', 'nested read-before-write rule; changed environment')
    new Sessions(store, silentLogger(), { cwd: f.workspace }).prompt(session.id, { text: 'repeat the exact same write' }); steps.start(session.id)
    await until(() => store.permissions(session.id).length === 2)
    expect(store.toolCalls(session.id).at(-1)?.status).toBe('waiting')
    tools.answer(store.permissions(session.id)[1]!.id, 'deny')
    await until(() => requests.length === 6 && steps.running === 0)
    expect(store.toolCalls(session.id).at(-1)?.status).toBe('denied')
  } finally { tools.stopAll(); steps.stopAll(); store.close(); f.close() }
})

test('workspace compaction cannot override an operator veto and disabled compaction never calls a provider', async () => {
  const f = fixture(), store = Store.open(':memory:'); store.migrate()
  try {
    const sessions = new Sessions(store, silentLogger(), { cwd: f.workspace }), session = sessions.create({})
    for (let i = 0; i < 6; i++) sessions.prompt(session.id, { text: `${i} ${'history '.repeat(100)}` })
    let calls = 0
    const provider: Provider = { name: 'fixture', model: 'fixture/model', context: { window: 2400, reservedOutput: 256 }, async stream() { calls++ } }
    f.put('.hiroshi/config.json', '{"version":1,"compaction":true}')
    const first = new Steps(store, silentLogger(), { provider, context: { configuration: f.configuration, enabled: false } })
    const step = first.start(session.id)!; await until(() => first.running === 0)
    expect(store.step(step.id)?.error?.message).toContain('disabled')
    f.put('.hiroshi/config.json', '{"version":1,"compaction":false}')
    sessions.prompt(session.id, { text: 'next attempt' })
    const second = new Steps(store, silentLogger(), { provider, context: { configuration: f.configuration } })
    const next = second.start(session.id)!; await until(() => second.running === 0)
    expect(store.step(next.id)?.error?.message).toContain('disabled')
    expect(calls).toBe(0)
    expect(store.compactions(session.id)).toEqual([])
  } finally { store.close(); f.close() }
})

test('the daemon resolves defaults at admission, preserves idempotent sends and reloads settings after restart', async () => {
  const f = fixture()
  writeFileSync(join(f.home, 'config.json'), '{"version":1,"defaultModel":"missing/user-model","compaction":false}')
  f.put('.hiroshi/config.json', '{"version":1,"defaultModel":"local/echo"}')
  f.put('AGENTS.md', 'private daemon instructions')
  let daemon = await startDaemon({ home: f.home, workspace: f.workspace })
  try {
    const { session } = await daemon.client.createSession({})
    const input = { id: session.id, text: 'first', key: 'durable-default' }
    const admitted = await daemon.client.prompt(input)
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
    expect(admitted.item.model).toBe('local/echo')
    f.put('.hiroshi/config.json', '{"version":1,"defaultModel":"missing/new-model"}')
    expect((await daemon.client.prompt(input)).item).toEqual(admitted.item)
    await expect(daemon.client.prompt({ id: session.id, text: 'implicit invalid' })).rejects.toMatchObject({ code: 'unknown_model' })
    await daemon.client.prompt({ id: session.id, text: 'explicit wins', model: 'local/echo' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps.at(-1)?.status === 'succeeded')
    const before = await daemon.client.session({ id: session.id })
    expect(before.configuration?.provenance).toContainEqual({ setting: 'defaultModel', source: 'workspace/.hiroshi/config.json' })
    expect(JSON.stringify(before)).not.toContain('private daemon instructions')
    await daemon.crash(); daemon = await startDaemon({ home: f.home, workspace: f.workspace })
    expect((await daemon.client.session({ id: session.id })).contexts).toEqual(before.contexts)
    f.put('.hiroshi/config.json', '{bad-private-value')
    const broken = await daemon.client.session({ id: session.id })
    expect(broken.messages).toEqual(before.messages)
    expect(broken.configuration?.error).toContain('valid configuration')
    expect(JSON.stringify(broken.configuration)).not.toContain('bad-private-value')
    await expect(daemon.client.prompt({ id: session.id, text: 'bad configuration' })).rejects.toMatchObject({ code: 'workspace_configuration' })
  } finally { await daemon.stop() }
}, 60000)
