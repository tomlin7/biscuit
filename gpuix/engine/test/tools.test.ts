import { describe, expect, test } from 'bun:test'
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { Steps } from '../src/steps'
import { silentLogger } from '../src/log'
import type { Provider, ProviderRequest } from '../src/provider'
import { ToolRegistry, type Tool } from '../src/tools/registry'
import { Tools } from '../src/tools/tools'
import { registerBuiltins } from '../src/tools/builtins'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'
import { tempHome, until } from './harness'

const inputSchema = { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false }
const outputSchema = { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false }

function setup(options: { action?: 'allow' | 'ask' | 'deny'; run?: Tool['run']; input?: string; repeat?: boolean } = {}) {
  const home = tempHome()
  writeFileSync(join(home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: options.action ?? 'ask' }] }))
  const store = Store.open(join(home, 'engine.db'))
  store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: home })
  const session = sessions.create({})
  const registry = new ToolRegistry()
  const effects: string[] = []
  const tool: Tool = { name: 'echo_value', version: '1', description: 'Echo a value', inputSchema, outputSchema,
    async run(input, context) {
      const claim = store.toolCall(context.callID)!
      expect(claim.status).toBe('running')
      expect(claim.resultMessageID).toBeUndefined()
      effects.push(input.value)
      return options.run ? options.run(input, context) : { value: input.value }
    } }
  registry.register(tool)
  const tools = new Tools(store, registry, home)
  const requests: ProviderRequest[] = []
  const provider: Provider = { name: 'scripted', model: 'scripted/tools',
    async stream(request, onText, onPart) {
      requests.push(request)
      const newest = [...request.messages].reverse().find((m) => m.role === 'user')!
      if (!options.repeat && request.messages.some((m) => m.toolResult && m.seq > newest.seq)) { onText('The tool turn finished.'); return }
      const callID = `request_${request.stepID}`
      onPart?.({ kind: 'tool', phase: 'start', callID, name: 'echo_value', text: '' })
      onPart?.({ kind: 'tool', phase: 'delta', callID, text: options.input ?? '{"value":"hello"}' })
      onPart?.({ kind: 'tool', phase: 'end', callID, name: 'echo_value', text: '' })
    } }
  const steps = new Steps(store, silentLogger(), { provider, tools })
  tools.onIdle = (id) => { steps.start(id) }
  const start = (text = 'use the tool') => { sessions.prompt(session.id, { text }); return steps.start(session.id)! }
  const finished = async () => { await until(() => store.steps(session.id).some((s) => s.parentID && s.status === 'succeeded') && !tools.busy(session.id)) }
  const close = () => {
    tools.stopAll(); steps.stopAll(); store.close()
    try { rmSync(home, { recursive: true, force: true }) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EBUSY') throw error }
  }
  return { home, store, sessions, session, registry, tools, steps, provider, effects, requests, tool, start, finished, close }
}

describe('durable tools and permissions', () => {
  test('allow commits the call before its effect and starts a new recorded model step from the result', async () => {
    const f = setup({ action: 'allow' })
    try {
      const root = f.start()
      await f.finished()
      const calls = f.store.toolCalls(f.session.id)
      expect(calls).toHaveLength(1)
      expect(calls[0]!.status).toBe('succeeded')
      expect(calls[0]!.stepID).toBe(root.id)
      expect(calls[0]!.messageID).toBeTruthy()
      expect(calls[0]!.resultMessageID).toBeTruthy()
      expect(f.effects).toEqual(['hello'])
      expect(f.requests).toHaveLength(2)
      expect(f.store.steps(f.session.id)[1]!.parentID).toBe(root.id)
      expect(f.requests[1]!.messages.find((m) => m.toolResult)?.toolResult?.callID).toBe(calls[0]!.callID)
      expect(f.requests[0]!.tools).toHaveLength(1)
      const detail = f.store.snapshot(f.session.id)!
      const live = f.store.eventsSince(0).reduce(apply, { ...initialSnapshot(), sessionID: f.session.id })
      expect(live.toolCalls).toEqual(detail.toolCalls)
      expect(live.messages).toEqual(detail.messages)
      expect(hydrate(initialSnapshot(), detail).permissions).toEqual(live.permissions)
    } finally { f.close() }
  })

  test('ask pauses without an effect; duplicate answers execute once and conflicting answers are rejected', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      const permission = f.store.permissions(f.session.id)[0]!
      expect(f.effects).toEqual([])
      expect(f.steps.busy(f.session.id)).toBe(true)
      expect(f.store.toolCall(permission.toolCallID)?.status).toBe('waiting')
      f.tools.answer(permission.id, 'allow')
      f.tools.answer(permission.id, 'allow')
      expect(() => f.tools.answer(permission.id, 'deny')).toThrow('different answer')
      await f.finished()
      expect(f.effects).toEqual(['hello'])
      expect(f.store.permissions(f.session.id)[0]!.decision).toBe('allow')
    } finally { f.close() }
  })

  test.each(['policy', 'operator'] as const)('%s denial is a durable fact and the turn continues', async (source) => {
    const f = setup({ action: source === 'policy' ? 'deny' : 'ask' })
    try {
      f.start()
      if (source === 'operator') {
        await until(() => f.store.permissions(f.session.id).length === 1)
        f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'deny')
      }
      await f.finished()
      expect(f.effects).toEqual([])
      expect(f.store.toolCalls(f.session.id)[0]!.status).toBe('denied')
      expect(f.requests[1]!.messages.find((m) => m.toolResult)?.toolResult?.status).toBe('denied')
      expect(f.store.steps(f.session.id).every((step) => step.status === 'succeeded')).toBe(true)
    } finally { f.close() }
  })

  test('remembered exact requests apply again; replacement registrations invalidate their approval scope', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'allow', true)
      await f.finished()
      f.start('use the same input again')
      await until(() => f.effects.length === 2 && !f.tools.busy(f.session.id))
      expect(f.store.permissions(f.session.id)).toHaveLength(1)
      f.registry.register({ ...f.tool, version: '2' })
      f.start('the replacement needs its own approval')
      await until(() => f.store.permissions(f.session.id).length === 2)
      expect(f.effects).toHaveLength(2)
    } finally { f.close() }
  })

  test('repository denial is re-evaluated after approval and cannot be overridden by a saved allow', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      mkdirSync(join(f.home, '.hiroshi'))
      writeFileSync(join(f.home, '.hiroshi', 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: 'deny' }] }))
      f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'allow', true)
      await f.finished()
      expect(f.effects).toEqual([])
      expect(f.store.toolCalls(f.session.id)[0]!.decisionSource).toBe('repository')
    } finally { f.close() }
  })

  test('changing a registration while its question is pending never executes the replacement', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      f.registry.register({ ...f.tool, version: 'replacement' })
      f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'allow')
      await f.finished()
      expect(f.effects).toEqual([])
      expect(f.store.toolCalls(f.session.id)[0]!.status).toBe('failed')
    } finally { f.close() }
  })

  test('a megabyte output has a bounded preview, explicit marker and complete managed result', async () => {
    const f = setup({ action: 'allow', run: async () => ({ value: 'x'.repeat(1024 * 1024) }) })
    try {
      f.start()
      await f.finished()
      const call = f.store.toolCalls(f.session.id)[0]!
      expect(call.output!.length).toBeLessThan(17000)
      expect(call.output).toContain('[Output truncated.')
      expect(call.truncated).toBe(true)
      const full = f.tools.output(call.id)
      expect(JSON.parse(full.text).value).toHaveLength(1024 * 1024)
      expect(readFileSync(full.path, 'utf8')).toBe(full.text)
      expect(f.requests[1]!.messages.find((m) => m.toolResult)?.text).toContain('[Output truncated.')
    } finally { f.close() }
  })

  test('schema-invalid inputs do not run; schema-invalid outputs end once with a visible result', async () => {
    const invalid = setup({ action: 'allow', input: '{"unexpected":true}' })
    try {
      invalid.start(); await invalid.finished()
      expect(invalid.effects).toEqual([])
      expect(invalid.store.toolCalls(invalid.session.id)[0]!.status).toBe('failed')
    } finally { invalid.close() }
    const output = setup({ action: 'allow', run: async () => ({ wrong: 'shape' }) })
    try {
      output.start(); await output.finished()
      expect(output.effects).toHaveLength(1)
      expect(output.store.toolCalls(output.session.id)[0]!.status).toBe('failed')
    } finally { output.close() }
  })

  test('repeated denied calls cannot re-prompt and the durable turn limit stops model loops', async () => {
    const f = setup({ repeat: true })
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'deny')
      await until(() => f.store.steps(f.session.id).at(-1)?.error?.code === 'step_limit')
      expect(f.requests).toHaveLength(32)
      expect(f.store.permissions(f.session.id)).toHaveLength(1)
      expect(f.effects).toEqual([])
      expect(f.store.toolCalls(f.session.id).every((call) => call.status === 'denied')).toBe(true)
    } finally { f.close() }
  })

  test('the newest registration wins for both the advertised contract and runner', async () => {
    const f = setup({ action: 'allow' })
    let newer = 0
    try {
      f.registry.register({ ...f.tool, version: '2', description: 'Replacement definition',
        async run(input) { newer++; return { value: input.value } } })
      f.start(); await f.finished()
      expect(newer).toBe(1)
      expect(f.effects).toEqual([])
      expect((f.requests[0]!.tools[0] as any).description).toBe('Replacement definition')
    } finally { f.close() }
  })

  test('a recovered running claim becomes interrupted and is never executed again', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      const call = f.store.toolCalls(f.session.id)[0]!
      f.store.updateToolCall({ ...call, status: 'running' })
      const recovered = new Tools(f.store, f.registry, f.home)
      recovered.recover()
      recovered.recover()
      expect(f.store.toolCalls(f.session.id)[0]!.status).toBe('interrupted')
      expect(f.store.messages(f.session.id).filter((m) => m.role === 'tool')).toHaveLength(1)
      expect(f.store.permissions(f.session.id)[0]!.state).toBe('answered')
      expect(f.effects).toEqual([])
    } finally { f.close() }
  })

  test('alwaysAsk requires a new answer even after a saved allow and an allow rule', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'allow', true)
      await f.finished()
      writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ alwaysAsk: true, rules: [{ tool: '*', action: 'allow' }] }))
      f.start('ask me again')
      await until(() => f.store.permissions(f.session.id).length === 2)
      expect(f.effects).toHaveLength(1)
      f.tools.answer(f.store.permissions(f.session.id)[1]!.id, 'deny')
      await until(() => !f.tools.busy(f.session.id))
      expect(f.effects).toHaveLength(1)
    } finally { f.close() }
  })

  test('a direct operator denial remains authoritative when policy changes to allow', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: 'allow' }] }))
      f.tools.answer(f.store.permissions(f.session.id)[0]!.id, 'deny')
      await f.finished()
      expect(f.store.toolCalls(f.session.id)[0]!.status).toBe('denied')
      expect(f.effects).toEqual([])
    } finally { f.close() }
  })

  test('a newly denied policy closes an obsolete pending question', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      await until(() => f.store.toolCalls(f.session.id)[0]?.status === 'waiting')
      writeFileSync(join(f.home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: 'deny' }] }))
      f.tools.kick(f.session.id)
      await f.finished()
      expect(f.store.permissions(f.session.id)[0]!.state).toBe('answered')
      expect(f.store.toolCalls(f.session.id)[0]!.status).toBe('denied')
      expect(f.effects).toEqual([])
    } finally { f.close() }
  })

  test('interrupt closes a waiting approval, preserves the cancellation and prevents a continuation', async () => {
    const f = setup()
    try {
      f.start()
      await until(() => f.store.permissions(f.session.id).length === 1)
      f.steps.interrupt(f.session.id, 'stop')
      expect(f.store.toolCalls(f.session.id)[0]!.status).toBe('cancelled')
      expect(f.store.permissions(f.session.id)[0]!.state).toBe('answered')
      expect(f.steps.start(f.session.id)?.parentID).toBeUndefined()
      expect(f.effects).toEqual([])
    } finally { f.close() }
  })
})

describe('built-in tool contract', () => {
  test('shell returns real output, filters provider credentials and stops on timeout or cancellation', async () => {
    const home = tempHome()
    const registry = new ToolRegistry()
    registerBuiltins(registry)
    const controller = new AbortController()
    const context = { cwd: home, sessionID: 'test', callID: 'test', signal: controller.signal }
    const previous = process.env.HIROSHI_SHELL_TEST_SECRET
    process.env.HIROSHI_SHELL_TEST_SECRET = 'must-not-be-inherited'
    try {
      const result = await registry.get('shell')!.run({ command: `bun -e "console.log(process.env.HIROSHI_SHELL_TEST_SECRET || 'no-secret')"` }, context) as any
      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toBe('no-secret')
      await expect(registry.get('shell')!.run({ command: `bun -e "setTimeout(() => {}, 30000)"`, timeoutMs: 100 }, context)).rejects.toThrow('timed out')
      const pending = registry.get('shell')!.run({ command: `bun -e "setTimeout(() => {}, 30000)"` }, context)
      setTimeout(() => controller.abort(), 100)
      await expect(pending).rejects.toThrow('interrupted')
    } finally {
      if (previous === undefined) delete process.env.HIROSHI_SHELL_TEST_SECRET
      else process.env.HIROSHI_SHELL_TEST_SECRET = previous
      rmSync(home, { recursive: true, force: true })
    }
  })

  test('file tools operate inside the workspace and reject parent escapes; writes replace files atomically', async () => {
    const home = tempHome()
    const workspace = join(home, 'workspace')
    mkdirSync(workspace)
    writeFileSync(join(home, 'outside.txt'), 'keep outside')
    const registry = new ToolRegistry()
    registerBuiltins(registry)
    const context = { cwd: workspace, sessionID: 'test', callID: 'test', signal: new AbortController().signal }
    try {
      await registry.get('write_file')!.run({ path: 'inside.txt', content: 'inside' }, context)
      expect((await registry.get('read_file')!.run({ path: 'inside.txt' }, context) as any).content).toBe('inside')
      await expect(registry.get('read_file')!.run({ path: '../outside.txt' }, context)).rejects.toThrow('inside the workspace')
      await expect(registry.get('write_file')!.run({ path: '../outside.txt', content: 'bad' }, context)).rejects.toThrow('inside the workspace')
      symlinkSync(home, join(workspace, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
      await expect(registry.get('read_file')!.run({ path: 'escape/outside.txt' }, context)).rejects.toThrow('inside the workspace')
      await expect(registry.get('write_file')!.run({ path: 'escape/outside.txt', content: 'bad' }, context)).rejects.toThrow('inside the workspace')
      expect(readFileSync(join(home, 'outside.txt'), 'utf8')).toBe('keep outside')
    } finally { rmSync(home, { recursive: true, force: true }) }
  })
})
