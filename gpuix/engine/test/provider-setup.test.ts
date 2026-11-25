import { expect, test } from 'bun:test'
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AgentID } from '../src/protocol'
import { startDaemon, tempHome, until } from './harness'
import { discoverCommand } from '../src/providers/discovery'
import { initialSnapshot, apply } from '../../src/engine/reducer'
import { CliProvider } from '../src/providers/cli'
import { DEFAULT_EXECUTION_LIMITS, ExecutionBudget } from '../src/execution'
import { Store } from '../src/store'
import { ProviderRegistry } from '../src/providers/registry'

const fixture = pathToFileURL(join(import.meta.dir, 'fixtures/provider-cli.ts')).href
function setup(home: string) {
  writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, minFreeMemoryMB: 128, processMemoryMB: 512, maxProcesses: 5, timeoutMs: 60000 }))
  const policy = join(home, '.gemini', 'antigravity-cli'); mkdirSync(policy, { recursive: true })
  writeFileSync(join(policy, 'settings.json'), JSON.stringify({ toolPermission: 'strict', permissions: { deny: ['write_file(*)', 'command(*)', 'unsandboxed(*)', 'mcp(*)', 'execute_url(*)'] } }))
  const commands = {} as Record<AgentID, string[]>
  for (const id of ['agy', 'cursor', 'pi', 'grok'] as const) {
    const entry = join(home, `${id}.ts`)
    writeFileSync(entry, `process.env.HIROSHI_PROBE_AGENT=${JSON.stringify(id)}; await import(${JSON.stringify(fixture)});`)
    commands[id] = [process.execPath, entry]
  }
  return commands
}
const env = (home: string) => ({ HOME: home, USERPROFILE: home, HIROSHI_PROBE_STATE: join(home, 'probe-state'), HIROSHI_PROBE_LOG: join(home, 'probe-log') })
async function refresh(daemon: Awaited<ReturnType<typeof startDaemon>>, session: string) {
  await daemon.client.refreshProviders({ id: session })
  await until(async () => !(await daemon.client.providers()).refreshing, 20000)
  return daemon.client.providers()
}

test('provider setup discovers only on refresh, persists selection, shares feed state and runs all four adapters', async () => {
  const home = tempHome(); const commands = setup(home)
  let daemon = await startDaemon({ home, env: env(home) })
  try {
    expect(existsSync(join(home, 'probe-log'))).toBe(false)
    const { session } = await daemon.client.createSession({})
    let state = await daemon.client.providers()
    for (const agent of ['agy', 'cursor', 'pi', 'grok'] as const) state = await daemon.client.updateProviders({ revision: state.revision, agent, command: commands[agent] })
    state = await refresh(daemon, session.id)
    expect(state.error).toBeNull()
    state = await daemon.client.updateProviders({ revision: state.revision, agent: 'cursor', trustWorkspace: true })
    expect(state.agents.find((row) => row.id === 'cursor')).toMatchObject({ status: 'ready', auth: 'authenticated', version: '2026.10.19-fixture' })
    expect(state.agents.find((row) => row.id === 'pi')).toMatchObject({ status: 'installed', auth: 'unknown' })
    expect(JSON.stringify(state)).not.toContain('private-fixture-secret')
    const logs = readFileSync(join(home, 'probe-log'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
    expect(logs.every((row) => row.args.includes('--help') || row.args.includes('--version') || row.args.includes('status') || row.args.includes('models'))).toBe(true)
    for (const agent of ['agy', 'cursor', 'pi', 'grok'] as const) {
      const binding = (await daemon.client.session({ id: session.id })).cliConversation
      if (binding) await daemon.client.freshCliConversation({ id: session.id, conversationID: binding.id, revision: binding.revision, key: `switch-${agent}` })
      const model = state.agents.find((row) => row.id === agent)!.models.find((model) => model.id === 'default')!
      state = await daemon.client.updateProviders({ revision: state.revision, defaultModel: model.catalogID })
      await daemon.client.prompt({ id: session.id, text: `answer using ${agent}` })
      await until(async () => (await daemon.client.session({ id: session.id })).steps.filter((step) => step.status === 'succeeded').length === ['agy', 'cursor', 'pi', 'grok'].indexOf(agent) + 1)
    }
    const current = await daemon.client.session({ id: session.id })
    expect(current.steps.map((step) => step.output)).toEqual(['Hello 漢🙂', 'Hello 漢🙂', 'Pi 漢🙂', 'Grok 漢🙂'])
    expect(current.parts.filter((part) => part.kind === 'cli' && part.phase === 'session')).toHaveLength(4)
    expect(current.parts.find((part) => part.kind === 'cli' && part.adapter === 'grok' && part.phase === 'session')).toMatchObject({ vendorSessionID: expect.stringMatching(/^[a-f0-9-]{36}$/) })
    expect(current.parts.some((part) => part.kind === 'usage' && part.inputTokens === 10 && part.outputTokens === 3)).toBe(true)
    expect(JSON.stringify({ parts: current.parts, messages: current.messages })).not.toContain('private-fixture-secret')
    const projected = apply({ ...initialSnapshot(), sessionID: session.id }, { seq: 99999, at: 1, type: 'providers.updated', sessionID: null, runID: null, data: { providers: state } })
    expect(projected.defaultModel).toBe(state.defaultModel)
    await daemon.crash(); daemon = await startDaemon({ home, env: env(home) })
    const restored = await daemon.client.session({ id: session.id })
    expect(restored.messages).toEqual(current.messages)
    expect(restored.parts).toEqual(current.parts)
    expect((await daemon.client.providers()).defaultModel).toBe(state.defaultModel)
    expect((await daemon.client.providers()).agents.find((row) => row.id === 'cursor')!.auth).toBe('unknown')
    expect((await daemon.client.providers()).agents.find((row) => row.id === 'cursor')!.trustWorkspace).toBe(true)
  } finally { await daemon.stop() }
}, 60000)

test('disabled, changed and removed executables never retarget the saved default', async () => {
  const home = tempHome(); const commands = setup(home)
  const daemon = await startDaemon({ home, env: env(home) })
  try {
    const { session } = await daemon.client.createSession({})
    let state = await daemon.client.providers()
    for (const agent of ['agy', 'pi', 'grok'] as const) state = await daemon.client.updateProviders({ revision: state.revision, agent, enabled: false })
    state = await daemon.client.updateProviders({ revision: state.revision, agent: 'cursor', command: commands.cursor })
    state = await refresh(daemon, session.id)
    const selected = state.agents.find((row) => row.id === 'cursor')!.models[0]!.catalogID
    state = await daemon.client.updateProviders({ revision: state.revision, defaultModel: selected })
    await expect(daemon.client.updateProviders({ revision: state.revision, agent: 'cursor', enabled: false, defaultModel: selected })).rejects.toMatchObject({ code: 'provider_unavailable' })
    expect((await daemon.client.providers()).agents.find((row) => row.id === 'cursor')!.enabled).toBe(true)
    state = await daemon.client.updateProviders({ revision: state.revision, agent: 'cursor', enabled: false })
    await daemon.client.prompt({ id: session.id, text: 'disabled must fail' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'failed')
    expect((await daemon.client.session({ id: session.id })).steps[0]?.error?.code).toBe('provider_disabled')
    state = await daemon.client.updateProviders({ revision: state.revision, agent: 'cursor', enabled: true })
    appendFileSync(commands.cursor[1]!, '\n// updated executable')
    await daemon.client.prompt({ id: session.id, text: 'changed must fail' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps.length === 2 && (await daemon.client.session({ id: session.id })).steps[1]?.status === 'failed')
    expect((await daemon.client.session({ id: session.id })).steps[1]?.error?.code).toBe('cli_unavailable')
    state = await refresh(daemon, session.id)
    expect(state.defaultModel).toBe(selected)
    expect(state.models.some((model) => model.id === selected)).toBe(false)
    await expect(daemon.client.updateProviders({ revision: state.revision, defaultModel: selected })).rejects.toMatchObject({ code: 'unknown_model' })
    unlinkSync(commands.cursor[1]!); state = await refresh(daemon, session.id)
    expect(state.agents.find((row) => row.id === 'cursor')!.status).toBe('missing')
    expect(state.defaultModel).toBe(selected)
  } finally { await daemon.stop() }
}, 40000)

test('refresh cancellation keeps prior evidence; expired auth is reflected without leaking identity', async () => {
  const home = tempHome(); const commands = setup(home)
  const daemon = await startDaemon({ home, env: env(home) })
  try {
    const { session } = await daemon.client.createSession({})
    let state = await daemon.client.providers()
    state = await daemon.client.updateProviders({ revision: state.revision, agent: 'cursor', command: commands.cursor })
    for (const agent of ['agy', 'pi', 'grok'] as const) state = await daemon.client.updateProviders({ revision: state.revision, agent, enabled: false })
    state = await refresh(daemon, session.id)
    const evidence = state.agents.find((row) => row.id === 'cursor')!.checkedAt
    writeFileSync(join(home, 'probe-state'), JSON.stringify({ hang: true }))
    await daemon.client.refreshProviders({ id: session.id })
    await until(async () => (await daemon.client.health()).execution?.active === 1)
    await daemon.client.cancelProviderRefresh()
    await until(async () => !(await daemon.client.providers()).refreshing)
    expect((await daemon.client.providers()).agents.find((row) => row.id === 'cursor')!.checkedAt).toBe(evidence)
    expect((await daemon.client.providers()).error).toContain('cancelled')
    const finished = await daemon.client.providers()
    const stale = { ...finished, revision: finished.revision - 1, refreshing: true }
    const projected = apply({ ...initialSnapshot(), providers: finished }, { seq: 1, at: 1, type: 'providers.updated', sessionID: null, runID: null, data: { providers: stale } })
    expect(projected.providers!.refreshing).toBe(false)
    const model = finished.agents.find((row) => row.id === 'cursor')!.models[0]!.catalogID
    await daemon.client.updateProviders({ revision: finished.revision, defaultModel: model })
    writeFileSync(join(home, 'probe-state'), JSON.stringify({ auth: false }))
    await daemon.client.prompt({ id: session.id, text: 'expired sign-in must fail visibly' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'failed')
    expect((await daemon.client.session({ id: session.id })).steps[0]?.error?.code).toBe('cli_authentication')
    expect((await daemon.client.providers()).agents.find((row) => row.id === 'cursor')!.auth).toBe('signed_out')
    state = await refresh(daemon, session.id)
    expect(state.agents.find((row) => row.id === 'cursor')!.status).toBe('signed_out')
    expect(JSON.stringify(state)).not.toContain('private-fixture-secret')
    writeFileSync(join(home, 'probe-state'), JSON.stringify({ unsupported: true }))
    state = await refresh(daemon, session.id)
    expect(state.agents.find((row) => row.id === 'cursor')).toMatchObject({ status: 'unsupported', models: [] })
    expect(state.defaultModel).toBe(model)
    writeFileSync(join(home, 'probe-state'), JSON.stringify({ noise: true }))
    state = await refresh(daemon, session.id)
    expect(state.agents.find((row) => row.id === 'cursor')).toMatchObject({ status: 'unsupported', models: [] })
    await expect(daemon.client.updateProviders({ revision: 0, agent: 'cursor', enabled: false })).rejects.toMatchObject({ code: 'provider_revision' })
  } finally { await daemon.stop() }
}, 30000)

test('empty PATH does not search the working directory or execute wrappers', () => {
  const home = tempHome()
  expect(discoverCommand('pi', { PATH: '', HOME: home, USERPROFILE: home })).toBeNull()
})

test('a queued request uses current workspace trust rather than the adapter captured at admission', async () => {
  const home = tempHome(), commands = setup(home), store = Store.open(join(home, 'engine.sqlite'))
  store.migrate()
  store.createSession({ id: 'session', cwd: home, title: 'Test', createdAt: 1, updatedAt: 1 })
  const budget = new ExecutionBudget(store, { ...DEFAULT_EXECUTION_LIMITS, maxActive: 1, minFreeMemoryMB: 128 })
  const registry = new ProviderRegistry(home, store, budget, { ...process.env, ...env(home) })
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let holding: Promise<void> | undefined, queued: Promise<void> | undefined
  try {
    let state = registry.snapshot()
    for (const agent of ['agy', 'pi', 'grok'] as const) state = registry.update({ revision: state.revision, agent, enabled: false })
    registry.update({ revision: state.revision, agent: 'cursor', command: commands.cursor, trustWorkspace: true })
    registry.refresh('session'); await until(() => !registry.snapshot().refreshing, 20000)
    state = registry.snapshot()
    const model = state.agents.find((row) => row.id === 'cursor')!.models[0]!.catalogID
    const captured = registry.resolve(model)
    holding = budget.execute({ id: 'holding', sessionID: 'session', kind: 'maintenance' }, new AbortController().signal, async () => gate)
    await until(() => budget.status().active === 1)
    queued = budget.execute({ id: 'queued', sessionID: 'session', kind: 'model' }, new AbortController().signal, async (signal) => {
      await captured.stream({ cwd: home, signal, sessionID: 'session', stepID: 'step', provider: captured.name, model,
        messages: [{ id: 'prompt', sessionID: 'session', seq: 1, role: 'user', text: 'response-only fixture prompt', at: 1 }], instructions: [], tools: [], reservedOutput: 1024 }, () => {})
    })
    expect(store.executions().find((value) => value.id === 'queued')!.state).toBe('queued')
    registry.update({ revision: state.revision, agent: 'cursor', trustWorkspace: false })
    release(); await holding; await queued
    const calls = readFileSync(join(home, 'probe-log'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
    expect(calls.at(-1).args).toContain('--print')
    expect(calls.at(-1).args).not.toContain('--trust')
  } finally {
    release(); budget.stop(); await Promise.allSettled([holding, queued]); await registry.stop(); store.close()
  }
}, 30000)
for (const adapter of ['pi', 'grok'] as const) test(`${adapter}: incomplete, cancelled, failed and expired-auth responses never succeed`, async () => {
  const home = tempHome(), commands = setup(home)
  const cli = new CliProvider({ name: adapter, model: `${adapter}/chat`, providerModel: 'default', adapter, command: commands[adapter],
    context: { window: 32768, reservedOutput: 1024 }, env: { ...process.env, ...env(home) }, limits: { ...DEFAULT_EXECUTION_LIMITS, minFreeMemoryMB: 128, timeoutMs: 3000 } })
  for (const [state, code] of [[{ truncated: true }, 'cli_truncated'], [{ length: true }, 'cli_failed'], [{ auth: false }, 'cli_authentication']] as const) {
    writeFileSync(join(home, 'probe-state'), JSON.stringify(state))
    await expect(cli.stream({ cwd: home, signal: new AbortController().signal, sessionID: 's', stepID: 'step', provider: adapter, model: `${adapter}/chat`,
      messages: [{ id: 'prompt', sessionID: 's', seq: 1, role: 'user', text: 'response-only fixture prompt', at: 1 }], instructions: [], tools: [], reservedOutput: 1024 }, () => {})).rejects.toMatchObject({ code })
  }
  writeFileSync(join(home, 'probe-state'), JSON.stringify({ hangResponse: true }))
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 300)
  try {
    await expect(cli.stream({ cwd: home, signal: abort.signal, sessionID: 's', stepID: 'step', provider: adapter, model: `${adapter}/chat`,
      messages: [{ id: 'prompt', sessionID: 's', seq: 1, role: 'user', text: 'response-only fixture prompt', at: 1 }], instructions: [], tools: [], reservedOutput: 1024 }, () => {})).rejects.toMatchObject({ name: 'AbortError' })
  } finally { clearTimeout(timer) }
}, 15000)
