import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CliEvents, CliProvider, agyPolicyReady } from '../src/providers/cli'
import { ProviderCatalog } from '../src/providers/catalog'
import { DEFAULT_EXECUTION_LIMITS } from '../src/execution'
import type { ProviderPart, ProviderRequest } from '../src/provider'
import { engineTranscript } from '../../src/engine/transcript'
import { hydrate, initialSnapshot } from '../../src/engine/reducer'
import { startDaemon, tempHome, until } from './harness'

const fixture = join(import.meta.dir, 'fixtures', 'cli-response.ts')
const limits = { ...DEFAULT_EXECUTION_LIMITS, minFreeMemoryMB: 128, timeoutMs: 5000, maxProcesses: 5 }
const model = { id: 'chat', model: 'default', label: 'Installed agent', contextWindow: 32768, reservedOutput: 1024 }
const request = (cwd: string, signal = new AbortController().signal): ProviderRequest => ({ cwd, signal, sessionID: 'session-1', stepID: 'step-1', provider: 'cli', model: 'cli/chat',
  messages: [{ id: 'm', sessionID: 'session-1', seq: 1, role: 'user', text: 'literal ` $() --force ; 漢🙂', at: 1 }], instructions: [], tools: [], reservedOutput: 1024 })
function safePolicy(home: string) {
  const dir = join(home, '.gemini', 'antigravity-cli'); mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ toolPermission: 'strict', permissions: { deny: ['write_file(*)', 'command(*)', 'unsandboxed(*)', 'mcp(*)', 'execute_url(*)'] } }))
}
function provider(home: string, mode: string) {
  return new CliProvider({ name: 'cli', model: 'cli/chat', providerModel: 'default', adapter: mode === 'agy' ? 'agy' : 'cursor', command: [process.execPath, fixture],
    context: { window: 32768, reservedOutput: 1024 }, limits, env: { ...process.env, HOME: home, USERPROFILE: home, HIROSHI_CLI_FIXTURE: mode } })
}
function configure(home: string, adapter: 'agy-cli' | 'cursor-cli' = 'cursor-cli') {
  writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'cli/chat', providers: [{ id: 'cli', adapter, command: [process.execPath, fixture], models: [model] }] }))
  writeFileSync(join(home, 'execution.json'), JSON.stringify({ ...limits, maxActive: 1, timeoutMs: 15000 }))
}

describe('Grok streaming compatibility', () => {
  test('terminal usage keeps cache, reasoning and explicit zero cost', () => {
    const parts: ProviderPart[] = []
    const events = new CliEvents('grok', () => {}, (part) => parts.push(part))
    events.accept(JSON.stringify({ type: 'text', data: 'usage fixture answer' }))
    events.accept(JSON.stringify({ type: 'end', stopReason: 'EndTurn', sessionId: 'usage-session', total_cost_usd: 0,
      usage: { input_tokens: 100, cached_input_tokens: 80, cache_write_input_tokens: 0, output_tokens: 10, reasoning_output_tokens: 4 } }))
    expect(parts.find((part) => part.kind === 'usage')).toMatchObject({ inputTokens: 100, cachedInputTokens: 80, cacheWriteTokens: 0, outputTokens: 10, reasoningTokens: 4, costUSD: 0 })
  })

  for (const stopReason of ['EndTurn', 'end_turn']) test(`${stopReason}: metadata interleaving never enters public output`, () => {
    let output = ''; const parts: ProviderPart[] = []
    const events = new CliEvents('grok', (value) => output += value, (part) => parts.push(part))
    const emit = (event: object) => events.accept(JSON.stringify(event))
    emit({ type: 'available_commands', tools: ['private-fixture-secret'], commands: [] })
    emit({ type: 'text', data: 'Hello 漢' })
    emit({ type: 'thought', data: 'private-fixture-secret' })
    emit({ type: 'usage', usage: { input_tokens: 99, output_tokens: 99 }, signature: 'private-fixture-secret' })
    emit({ type: 'available_commands', tools: [], commands: ['private-fixture-secret'] })
    emit({ type: 'text', data: '🙂' })
    emit({ type: 'end', stopReason, sessionId: 'grok-session', usage: { input_tokens: 10, output_tokens: 3 } })
    expect(events.completed).toBe(true)
    expect(output).toBe('Hello 漢🙂')
    expect(parts.filter((part) => part.kind === 'usage')).toEqual([{ kind: 'usage', inputTokens: 10, outputTokens: 3 }])
    expect(JSON.stringify(parts)).not.toContain('private-fixture-secret')
    expect(parts.some((part) => part.kind === 'tool')).toBe(false)
    expect(() => emit({ type: 'usage', usage: {} })).toThrow('data after completion')
  })

  for (const type of ['tool_call', 'tool_result', 'error', 'unknown']) test(`${type}: unrecognized activity fails closed`, () => {
    const events = new CliEvents('grok', () => {})
    expect(() => events.accept(JSON.stringify({ type, data: 'private-fixture-secret' }))).toThrow('unsupported response-only event')
    expect(events.completed).toBe(false)
  })

  for (const stopReason of ['max_tokens', 'MaxTokens', 'tool_use', 'error', null]) test(`${stopReason}: incomplete turns never succeed`, () => {
    const events = new CliEvents('grok', () => {})
    events.accept(JSON.stringify({ type: 'text', data: 'partial' }))
    expect(() => events.accept(JSON.stringify({ type: 'end', stopReason, sessionId: 'grok-session' }))).toThrow('did not finish')
    expect(events.completed).toBe(false)
  })

  test('metadata alone cannot complete a turn and an invalid session cannot succeed', () => {
    const events = new CliEvents('grok', () => {})
    events.accept(JSON.stringify({ type: 'usage', usage: {} }))
    expect(events.completed).toBe(false)
    expect(() => events.accept(JSON.stringify({ type: 'end', stopReason: 'end_turn', sessionId: 'session' }))).toThrow('final answer')
    const invalid = new CliEvents('grok', () => {})
    invalid.accept(JSON.stringify({ type: 'text', data: 'answer' }))
    expect(() => invalid.accept(JSON.stringify({ type: 'end', stopReason: 'end_turn' }))).toThrow('identifier')
  })
})

describe('CLI contract through real executable pipes', () => {
  for (const adapter of ['agy', 'cursor']) test(`${adapter}: stdin, workspace, split UTF-8 and duplicate flush handling`, async () => {
    const home = tempHome(); safePolicy(home)
    const marker = join(home, 'invocations')
    const cli = provider(home, adapter); cli.options.env!.HIROSHI_CLI_MARKER = marker
    let output = ''; const parts: ProviderPart[] = []
    try {
      await cli.stream(request(home), (value) => output += value, (part) => parts.push(part))
      expect(output).toBe('Hello 漢🙂')
      expect(parts.filter((part) => part.kind === 'tool')).toHaveLength(0)
      expect(parts.filter((part) => part.kind === 'cli').map((part) => part.phase)).toEqual(['started', 'session', 'completed'])
      expect(parts.find((part) => part.kind === 'cli' && part.phase === 'session')).toMatchObject({ vendorSessionID: expect.stringMatching(/^fixture-/), version: 1 })
      expect(parts.find((part) => part.kind === 'usage')).toMatchObject({ inputTokens: 21, outputTokens: 4 })
      expect(JSON.stringify(parts)).not.toContain('private thinking')
      const run = JSON.parse(readFileSync(marker, 'utf8').trim())
      expect(realpathSync(run.cwd)).toBe(realpathSync(home))
      expect(run.input).toContain('literal ` $() --force ; 漢🙂')
      expect(run.args).not.toContain('--force'); expect(run.args.join(' ')).not.toContain('literal')
    } finally { rmSync(home, { recursive: true, force: true }) }
  })

  for (const [mode, code] of [
    ['auth', 'cli_authentication'], ['trust', 'cli_workspace_trust'], ['exit', 'cli_exit'], ['malformed', 'cli_protocol'],
    ['truncated', 'cli_truncated'], ['session-change', 'cli_protocol'], ['mismatch', 'cli_protocol'], ['failed-result', 'cli_failed'],
    ['incomplete-line', 'cli_protocol'], ['post-result', 'cli_protocol'], ['noise', 'cli_output_limit'], ['huge-line', 'cli_output_limit'],
    ['mutation', 'cli_capability'], ['invalid-utf8', 'cli_transport'], ['wrong-workspace', 'cli_workspace'],
  ]) test(`${mode}: classified non-retryable failure without diagnostic leakage`, async () => {
    const home = tempHome(); let output = ''
    try {
      let failure: any
      try { await provider(home, mode!).stream(request(home), (value) => output += value) } catch (error) { failure = error }
      expect(failure?.code).toBe(code); expect(failure?.retryable).toBe(false)
      expect(String(failure)).not.toContain('private-fixture-secret')
      expect(output).not.toContain('tool output')
    } finally { rmSync(home, { recursive: true, force: true }) }
  })

  test('a process that never emits init is bounded by its deadline', async () => {
    const home = tempHome(); const cli = provider(home, 'hang-before-init'); cli.options.limits = { ...limits, timeoutMs: 500 }
    try { await expect(cli.stream(request(home), () => {})).rejects.toMatchObject({ code: 'cli_timeout' }) }
    finally { rmSync(home, { recursive: true, force: true }) }
  })

  test('Agy policy is checked before any process, and rechecked after catalog construction', async () => {
    const home = tempHome(); const marker = join(home, 'invocations')
    const env = { ...process.env, HOME: home, USERPROFILE: home, HIROSHI_CLI_MARKER: marker }
    const config = { providers: [{ id: 'agy', adapter: 'agy-cli', command: [process.execPath, fixture], models: [model] }] }
    try {
      expect(agyPolicyReady(env)).toBe(false)
      const blocked = new ProviderCatalog(config, env)
      expect(blocked.models().find((item) => item.provider === 'agy')?.reason).toBe('cli_policy_required')
      await expect(blocked.resolve('agy/chat').stream(request(home), () => {})).rejects.toMatchObject({ code: 'cli_policy_required' })
      safePolicy(home); const catalog = new ProviderCatalog(config, env)
      expect(catalog.models().find((item) => item.provider === 'agy')?.reason).toBeNull()
      writeFileSync(join(home, '.gemini', 'antigravity-cli', 'settings.json'), '{"toolPermission":"always-proceed"}')
      await expect(catalog.resolve('agy/chat').stream(request(home), () => {})).rejects.toMatchObject({ code: 'cli_policy_required' })
      expect(existsSync(marker)).toBe(false)
    } finally { rmSync(home, { recursive: true, force: true }) }
  })

  test('CLI configuration rejects shell wrappers, extra flags and desktop executables', () => {
    for (const command of [['relative'], [join(process.cwd(), 'agent.cmd')], [join(process.cwd(), 'hiroshi.exe')],
      [process.execPath, fixture, '--force'], [process.execPath, '--force']]) {
      expect(() => new ProviderCatalog({ providers: [{ id: 'cli', adapter: 'cursor-cli', command, models: [model] }] })).toThrow('CLI command')
    }
  })
})

describe('CLI real daemon integration', () => {
  test('Agy strict-profile stream is delivered through the configured catalog', async () => {
    const home = tempHome(); safePolicy(home); configure(home, 'agy-cli')
    const daemon = await startDaemon({ home, env: { HIROSHI_CLI_FIXTURE: 'agy', HOME: home, USERPROFILE: home } })
    try {
      const { session } = await daemon.client.createSession({})
      await daemon.client.prompt({ id: session.id, text: 'fixture response', model: 'cli/chat' })
      await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
      const detail = await daemon.client.session({ id: session.id })
      expect(detail.steps[0]?.output).toBe('Hello 漢🙂')
      expect(detail.parts.find((part) => part.kind === 'cli' && part.phase === 'session')).toMatchObject({ adapter: 'agy', vendorSessionID: expect.stringMatching(/^fixture-/), version: 2 })
    } finally { await daemon.stop() }
  }, 20000)

  test('selected adapter streams once, preserves model/history and survives completed-session restart', async () => {
    const home = tempHome(); configure(home)
    const marker = join(home, 'invocations')
    const release = join(home, 'release')
    let daemon = await startDaemon({ home, env: { HIROSHI_CLI_FIXTURE: 'cursor', HIROSHI_CLI_MARKER: marker, HIROSHI_CLI_RELEASE: release } })
    try {
      const { session } = await daemon.client.createSession({ title: 'CLI response' })
      const first = { id: session.id, text: 'first prompt', model: 'cli/chat', key: 'stable-send' }
      await daemon.client.prompt(first); await daemon.client.prompt(first)
      await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.output === 'Hello 漢')
      expect((await daemon.client.session({ id: session.id })).steps[0]?.status).toBe('running')
      writeFileSync(release, 'continue')
      await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
      const finished = await daemon.client.session({ id: session.id })
      expect(finished.steps).toHaveLength(1); expect(finished.steps[0]?.output).toBe('Hello 漢🙂')
      expect(finished.toolCalls).toHaveLength(0)
      expect(finished.executions?.filter((item) => item.kind === 'model')).toHaveLength(1)
      expect(engineTranscript(hydrate(initialSnapshot(), finished)).filter((turn) => turn.kind === 'markdown' && turn.source === 'Hello 漢🙂')).toHaveLength(1)
      expect(readFileSync(marker, 'utf8').trim().split('\n')).toHaveLength(1)
      await daemon.crash(); daemon = await startDaemon({ home, env: { HIROSHI_CLI_FIXTURE: 'cursor', HIROSHI_CLI_MARKER: marker } })
      const restored = await daemon.client.session({ id: session.id })
      expect(restored.parts).toEqual(finished.parts); expect(restored.messages).toEqual(finished.messages)
      await daemon.client.prompt({ ...first, text: 'follow up', key: 'follow-up' })
      await until(async () => (await daemon.client.session({ id: session.id })).steps.filter((step) => step.status === 'succeeded').length === 2)
      const runs = readFileSync(marker, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
      expect(runs).toHaveLength(2); expect(runs[1].input).not.toContain('first prompt'); expect(runs[1].input).toContain('follow up')
      expect(runs[1].args).toContain('--resume')
    } finally { await daemon.stop() }
  }, 30000)

  test('interrupt kills the CLI and detached descendants and releases the shared slot', async () => {
    const home = tempHome(); configure(home)
    const childFile = join(home, 'child-pid')
    const daemon = await startDaemon({ home, env: { HIROSHI_CLI_FIXTURE: 'hang', HIROSHI_CLI_CHILD_PID: childFile } })
    try {
      const { session } = await daemon.client.createSession({})
      await daemon.client.prompt({ id: session.id, text: 'hold', model: 'cli/chat' })
      await until(() => existsSync(childFile)); const child = Number(readFileSync(childFile, 'utf8'))
      await daemon.client.interrupt({ id: session.id })
      await until(async () => (await daemon.client.health()).execution?.active === 0)
      expect((await daemon.client.session({ id: session.id })).steps[0]?.status).toBe('cancelled')
      await until(() => { try { process.kill(child, 0); return process.platform === 'linux' && readFileSync(`/proc/${child}/stat`, 'utf8').split(') ')[1]?.startsWith('Z') === true } catch { return true } })
    } finally { await daemon.stop() }
  }, 25000)

  test('a claimed CLI with no stdout is never replayed after a crash', async () => {
    const home = tempHome(); configure(home); const marker = join(home, 'invocations')
    const env = { HIROSHI_CLI_FIXTURE: 'hang-before-init', HIROSHI_CLI_MARKER: marker }
    let daemon = await startDaemon({ home, env })
    try {
      const { session } = await daemon.client.createSession({})
      await daemon.client.prompt({ id: session.id, text: 'one submission only', model: 'cli/chat' })
      await until(() => existsSync(marker))
      await daemon.crash(); daemon = await startDaemon({ home, env })
      const restored = await daemon.client.session({ id: session.id })
      expect(restored.steps[0]?.status).toBe('failed')
      expect(restored.steps[0]?.attempt).toBe(1)
      expect(readFileSync(marker, 'utf8').trim().split('\n')).toHaveLength(1)
    } finally { await daemon.stop() }
  }, 30000)
})
