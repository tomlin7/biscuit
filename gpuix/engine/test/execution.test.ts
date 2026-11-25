import { describe, expect, test } from 'bun:test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ExecutionBudget, DEFAULT_EXECUTION_LIMITS, readExecutionLimits } from '../src/execution'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { silentLogger } from '../src/log'
import { initialSnapshot, apply, hydrate } from '../../src/engine/reducer'
import { sleep, tempHome, until } from './harness'
import { Tools } from '../src/tools/tools'
import { ToolRegistry } from '../src/tools/registry'
import { Steps } from '../src/steps'
import { ProviderError } from '../src/provider'
import { availableMemory } from '../src/memory'

const signal = () => new AbortController().signal
function deferred() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done }); return { promise, resolve } }
function setup(options: Partial<typeof DEFAULT_EXECUTION_LIMITS> = {}) {
  const store = Store.open(':memory:'); store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
  const a = sessions.create({ title: 'a' }), b = sessions.create({ title: 'b' })
  let memory = 16 * 1024 * 1048576
  const budget = new ExecutionBudget(store, { ...DEFAULT_EXECUTION_LIMITS, maxActive: 1, ...options }, () => memory)
  const request = (id: string, sessionID = a.id) => ({ id, sessionID, kind: 'tool' as const })
  return { store, a, b, budget, request, memory: (value: number) => { memory = value }, close: () => { budget.stop(); store.close() } }
}

describe('shared execution admission', () => {
  test('the native memory sampler returns a physical-memory estimate and the default controller samples it', () => {
    const memory = availableMemory()
    expect(Number.isFinite(memory)).toBe(true)
    expect(memory).toBeGreaterThan(0)
    const store = Store.open(':memory:'); store.migrate()
    const budget = new ExecutionBudget(store)
    try { expect(budget.status().freeMemoryMB).toBeGreaterThan(0) } finally { budget.stop(); store.close() }
  })
  test('different sessions and effect kinds share FIFO capacity; duplicates join one claim', async () => {
    const f = setup(), hold = deferred(), order: string[] = []
    try {
      const first = f.budget.execute(f.request('one'), signal(), async () => { order.push('one'); await hold.promise; return 7 })
      const duplicate = f.budget.execute<number>(f.request('one'), signal(), async () => { throw new Error('duplicate effect') })
      const second = f.budget.execute({ ...f.request('two', f.b.id), kind: 'model' }, signal(), async () => { order.push('two') })
      const third = f.budget.execute({ ...f.request('three'), kind: 'command' }, signal(), async () => { order.push('three') })
      await until(() => order.length === 1)
      expect(f.budget.status().active).toBe(1); expect(f.budget.status().queued).toBe(2)
      hold.resolve(); expect(await first).toBe(7); expect(await duplicate).toBe(7)
      await Promise.all([second, third]); expect(order).toEqual(['one', 'two', 'three'])
      await expect(f.budget.execute(f.request('one'), signal(), async () => 9)).rejects.toMatchObject({ code: 'execution_already_claimed' })
      expect(f.store.eventsSince(0).filter((event) => event.type === 'execution.updated' && event.data.execution.id === 'one' && event.data.execution.state === 'running')).toHaveLength(1)
    } finally { hold.resolve(); f.close() }
  })

  test('a cancelled waiter never starts, even after the active effect releases its slot', async () => {
    const f = setup(), hold = deferred(), controller = new AbortController(); let effects = 0
    try {
      const first = f.budget.execute(f.request('one'), signal(), () => hold.promise)
      const waiting = f.budget.execute(f.request('two'), controller.signal, async () => { effects++ })
      const rejected = waiting.then(() => { throw new Error('cancelled work unexpectedly resolved') }, () => {})
      controller.abort(); await rejected
      hold.resolve(); await first; await sleep(20)
      expect(effects).toBe(0); expect(f.store.execution('two')?.state).toBe('cancelled')
    } finally { hold.resolve(); f.close() }
  })

  test('low RAM blocks admission, recovers without a duplicate, and has a durable deadline', async () => {
    const f = setup({ queueTimeoutMs: 1000 }); let effects = 0
    try {
      f.memory(0)
      const work = f.budget.execute(f.request('one'), signal(), async () => { effects++ })
      expect(f.store.execution('one')?.reason).toBe('execution_low_memory')
      f.memory(16 * 1024 * 1048576); await work; expect(effects).toBe(1)
      f.memory(0)
      await expect(f.budget.execute(f.request('two'), signal(), async () => { effects++ })).rejects.toMatchObject({ code: 'execution_low_memory' })
      expect(effects).toBe(1); expect(f.store.execution('two')?.endedAt).toBeNumber()
    } finally { f.close() }
  })

  test('a timed out effect that ignores abort keeps its slot until it actually settles', async () => {
    const f = setup({ timeoutMs: 50 }), hold = deferred(); let secondStarted = false
    try {
      const first = f.budget.execute(f.request('one'), signal(), () => hold.promise)
      const rejected = first.then(() => null, (error) => error)
      const second = f.budget.execute(f.request('two'), signal(), async () => { secondStarted = true })
      await until(() => f.store.execution('one')?.reason === 'execution_timeout')
      expect(secondStarted).toBe(false); expect(f.budget.status().active).toBe(1)
      hold.resolve(); expect(await rejected).toMatchObject({ code: 'execution_timeout' }); await second
      expect(secondStarted).toBe(true)
    } finally { hold.resolve(); f.close() }
  })

  test('queue capacity and queue deadlines reject work explicitly', async () => {
    const f = setup({ maxQueued: 1, queueTimeoutMs: 100 }), hold = deferred()
    try {
      const active = f.budget.execute(f.request('one'), signal(), () => hold.promise)
      const queued = f.budget.execute(f.request('two'), signal(), async () => {})
      const timeout = queued.then(() => null, (error) => error)
      await expect(f.budget.execute(f.request('three'), signal(), async () => {})).rejects.toMatchObject({ code: 'execution_queue_full' })
      expect(await timeout).toMatchObject({ code: 'execution_queue_timeout' }); hold.resolve(); await active
    } finally { hold.resolve(); f.close() }
  })

  test('restart preserves queued deadlines and never readmits a running claim; live and saved UI agree', async () => {
    const f = setup(), hold = deferred()
    const active = f.budget.execute(f.request('one'), signal(), () => hold.promise).catch(() => {})
    const queued = f.budget.execute(f.request('two'), signal(), async () => {}).catch(() => {})
    await sleep(0)
    const deadline = f.store.execution('two')!.queueDeadline
    f.budget.stop(); hold.resolve(); await Promise.all([active, queued])
    const next = new ExecutionBudget(f.store, { ...DEFAULT_EXECUTION_LIMITS, maxActive: 1 }, () => 16 * 1024 * 1048576)
    try {
      expect(f.store.execution('one')?.state).toBe('interrupted')
      await expect(next.execute(f.request('one'), signal(), async () => {})).rejects.toMatchObject({ code: 'execution_already_claimed' })
      let effects = 0
      await next.execute(f.request('two'), signal(), async () => { effects++ })
      expect(effects).toBe(1); expect(f.store.execution('two')?.queueDeadline).toBe(deadline)
      const saved = hydrate(initialSnapshot(), f.store.snapshot(f.a.id)!)
      const live = f.store.eventsSince(0).reduce(apply, { ...initialSnapshot(), sessionID: f.a.id })
      expect(live.executions).toEqual(saved.executions); expect(live.transcript).toEqual(saved.transcript)
    } finally { next.stop(); f.close() }
  })

  test('configuration is strict and defaults are conservative', () => {
    const home = tempHome()
    expect(readExecutionLimits(home).maxActive).toBe(2)
    writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, timeoutMs: 5000 }))
    expect(readExecutionLimits(home).timeoutMs).toBe(5000)
    for (const value of [{ maxActive: 0 }, { maxProcesses: 100 }, { timeoutMs: 'forever' }, { madeUp: 2 }, { constructor: 2 }, { toString: 2 }]) {
      writeFileSync(join(home, 'execution.json'), JSON.stringify(value))
      expect(() => readExecutionLimits(home)).toThrow('invalid execution limit')
    }
  })

  test('a tool queued for capacity rechecks policy before its effect', async () => {
    const f = setup(), hold = deferred(), home = tempHome()
    const registry = new ToolRegistry(); let effects = 0
    registry.register({ name: 'probe', version: '1', description: 'Probe', inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
      async run() { effects++; return {} } })
    writeFileSync(join(home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: 'allow' }] }))
    const tools = new Tools(f.store, registry, home, f.budget)
    const definition = registry.get('probe')!
    const call = { id: 'tool-probe', callID: 'request-probe', sessionID: f.a.id, stepID: null, runID: null,
      tool: 'probe', input: '{}', cwd: process.cwd(), status: 'queued' as const, error: null,
      revision: definition.revision, definition: definition.definition, createdAt: Date.now(), endedAt: null }
    f.store.record({ type: 'tool.updated', sessionID: f.a.id, data: { call }, project: () => f.store.insertToolCall(call) })
    try {
      const active = f.budget.execute(f.request('hold'), signal(), () => hold.promise)
      tools.kick(f.a.id)
      await until(() => f.store.execution(call.id)?.state === 'queued')
      writeFileSync(join(home, 'tools.json'), JSON.stringify({ rules: [{ tool: '*', action: 'deny' }] }))
      hold.resolve(); await active
      await until(() => !!f.store.toolCall(call.id)?.resultMessageID)
      expect(effects).toBe(0); expect(f.store.toolCall(call.id)?.error).toContain('policy changed')
    } finally { hold.resolve(); tools.stopAll(); f.close() }
  })

  test('synchronous workspace maintenance consumes the same capacity', async () => {
    const f = setup(), hold = deferred()
    try {
      const active = f.budget.execute(f.request('hold'), signal(), () => hold.promise)
      expect(() => f.budget.synchronous(f.request('maintenance'), () => {})).toThrow('shared execution capacity')
      hold.resolve(); await active
      expect(f.budget.synchronous({ ...f.request('maintenance'), kind: 'maintenance' }, () => 3)).toBe(3)
      expect(f.store.execution('maintenance')?.state).toBe('succeeded')
    } finally { hold.resolve(); f.close() }
  })

  test('provider retries acquire a new bounded admission on the same durable step', async () => {
    const f = setup(); let attempts = 0
    const steps = new Steps(f.store, silentLogger(), { budget: f.budget, backoff: () => 1,
      provider: { name: 'fixture', model: 'fixture/chat', async stream(_request, onText) {
        if (++attempts === 1) throw new ProviderError('rate_limit', 'try again', { retryable: true })
        onText('finished')
      } } })
    try {
      new Sessions(f.store, silentLogger(), { cwd: process.cwd() }).prompt(f.a.id, { text: 'hello' })
      const step = steps.start(f.a.id)!
      await until(() => f.store.step(step.id)?.status === 'succeeded')
      expect(attempts).toBe(2)
      expect(f.store.step(step.id)?.attempt).toBe(2)
      expect(f.store.executions(f.a.id).map((item) => item.state)).toEqual(['failed', 'succeeded'])
    } finally { steps.stopAll(); f.close() }
  })
})
