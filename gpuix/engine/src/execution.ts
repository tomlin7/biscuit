/** One admission queue for every session. A slot belongs to an effect until
 * it actually settles, including effects that ignore their abort signal. */
import { totalmem } from 'node:os'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Execution, ExecutionLimits } from './protocol'
import type { Store } from './store'
import { availableMemory as sampleAvailableMemory } from './memory'

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  maxActive: 2, maxQueued: 64, queueTimeoutMs: 60000, timeoutMs: 120000,
  minFreeMemoryMB: Math.max(1024, Math.ceil(totalmem() / 8 / 1048576)),
  processMemoryMB: 512, maxProcesses: 8,
}

export function readExecutionLimits(home: string): ExecutionLimits {
  let input: unknown
  try { input = JSON.parse(readFileSync(join(home, 'execution.json'), 'utf8')) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...DEFAULT_EXECUTION_LIMITS }
    throw new Error('execution.json must contain a valid limits object')
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('execution.json must contain a limits object')
  const ranges: Record<keyof ExecutionLimits, [number, number]> = {
    maxActive: [1, 8], maxQueued: [1, 256], queueTimeoutMs: [100, 600000], timeoutMs: [100, 600000],
    minFreeMemoryMB: [128, 1048576], processMemoryMB: [128, 4096], maxProcesses: [2, 32],
  }
  for (const [key, value] of Object.entries(input)) {
    const range = ranges[key as keyof ExecutionLimits]
    if (!Object.hasOwn(ranges, key) || !range || !Number.isSafeInteger(value) || value < range[0] || value > range[1]) throw new Error(`invalid execution limit: ${key}`)
  }
  return { ...DEFAULT_EXECUTION_LIMITS, ...input }
}

export class ExecutionError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

interface Waiter {
  value: Execution
  controller: AbortController
  resolve: () => void
  reject: (error: Error) => void
}

export class ExecutionBudget {
  onAvailable?: () => void
  #lowMemory = false
  readonly #waiting: Waiter[] = []
  readonly #active = new Map<string, Waiter>()
  readonly #pending = new Map<string, Promise<unknown>>()
  readonly #timer: ReturnType<typeof setInterval>
  #stopping = false
  constructor(readonly store: Store, readonly limits = DEFAULT_EXECUTION_LIMITS,
    readonly availableMemory: () => number = sampleAvailableMemory) {
    // Claims are evidence of possible effects. Never admit them again.
    for (const value of store.executions()) {
      if (value.state === 'running') this.#save({ ...value, state: 'interrupted', reason: 'engine_restart', endedAt: Date.now() })
    }
    this.#timer = setInterval(() => this.#drain(), 250)
    this.#timer.unref()
  }

  status() {
    return { limits: this.limits, active: this.#active.size, queued: this.#waiting.length,
      freeMemoryMB: Math.floor(this.availableMemory() / 1048576),
      containment: process.platform === 'win32' ? 'windows-job' as const : 'process-group' as const }
  }

  reconcile(): void {
    for (const value of this.store.executions()) {
      if (value.state !== 'queued') continue
      const owned = value.kind === 'command' ? this.store.run(value.id)?.status === 'running'
        : value.kind === 'model' ? this.store.step(value.id.split(':')[0]!)?.status === 'running'
          : value.kind === 'tool' ? !!this.store.toolCall(value.id) && !this.store.toolCall(value.id)?.resultMessageID : false
      if (!owned) this.#save({ ...value, state: 'interrupted', reason: 'owner_ended', endedAt: Date.now() })
    }
  }

  execute<T>(request: Pick<Execution, 'id' | 'sessionID' | 'kind' | 'messageID'>, signal: AbortSignal,
    effect: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const pending = this.#pending.get(request.id)
    if (pending) return pending as Promise<T>
    const previous = this.store.execution(request.id)
    if (previous && previous.state !== 'queued') return Promise.reject(new ExecutionError('execution_already_claimed', 'this execution was already claimed; it was not replayed'))
    if (this.#stopping) return Promise.reject(new ExecutionError('engine_stopping', 'the engine is stopping'))
    const at = Date.now()
    const value: Execution = previous ?? { ...request, state: 'queued', reason: null, queuedAt: at,
      queueDeadline: at + this.limits.queueTimeoutMs, startedAt: null, deadline: null, endedAt: null }
    if (!previous) this.#save(value)
    const controller = new AbortController()
    let waiter!: Waiter
    const admission = new Promise<void>((resolve, reject) => { waiter = { value, controller, resolve, reject } })
    const abort = () => {
      // Owner shutdowns preserve admission rows; operator cancellation does not.
      if (this.#stopping && waiter.value.state === 'queued') return
      controller.abort(signal.reason ?? new ExecutionError('execution_cancelled', 'execution cancelled'))
      this.#drain()
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    if (this.#waiting.length >= this.limits.maxQueued) controller.abort(new ExecutionError('execution_queue_full', 'the shared execution queue is full'))
    this.#waiting.push(waiter)
    const work = (async () => {
      try {
        await admission
        controller.signal.throwIfAborted()
        const result = await effect(controller.signal)
        controller.signal.throwIfAborted()
        if (this.#stopping) throw new ExecutionError('engine_stopping', 'the engine is stopping')
        this.#save({ ...waiter.value, state: 'succeeded', endedAt: Date.now() })
        return result
      } catch (error) {
        if (!this.#stopping && waiter.value.state === 'running') {
          const reason = controller.signal.aborted ? controller.signal.reason : error
          this.#save({ ...waiter.value, state: controller.signal.aborted ? 'cancelled' : 'failed',
            reason: reason instanceof ExecutionError ? reason.code : 'execution_failed', endedAt: Date.now() })
        }
        throw controller.signal.aborted ? controller.signal.reason : error
      } finally {
        signal.removeEventListener('abort', abort)
        this.#active.delete(request.id)
        this.#pending.delete(request.id)
        this.#drain()
        if (!this.#stopping) this.onAvailable?.()
        if (!this.#pending.size) this.#timer.unref()
      }
    })()
    this.#pending.set(request.id, work)
    this.#timer.ref()
    this.#drain()
    return work
  }

  stop(abortActive = true): void {
    this.#stopping = true
    clearInterval(this.#timer)
    const reason = new ExecutionError('engine_stopping', 'the engine is stopping')
    for (const waiter of this.#waiting.splice(0)) { waiter.controller.abort(reason); waiter.reject(reason) }
    if (abortActive) for (const waiter of this.#active.values()) waiter.controller.abort(reason)
    // Queued rows deliberately survive shutdown. Call owners reconstruct them.
  }

  /** Checkpoint Git is deliberately synchronous and serialized. It must take
   * the same capacity as async effects, or leave its durable inbox pending. */
  synchronous<T>(request: Pick<Execution, 'id' | 'sessionID' | 'kind'>, effect: () => T): T {
    if (this.store.execution(request.id)) throw new ExecutionError('execution_already_claimed', 'this execution was already claimed; it was not replayed')
    if (this.#stopping) throw new ExecutionError('engine_stopping', 'the engine is stopping')
    if (this.availableMemory() < this.limits.minFreeMemoryMB * 1048576) throw new ExecutionError('execution_low_memory', 'waiting for free RAM before workspace maintenance')
    if (this.#active.size >= this.limits.maxActive || this.#waiting.length) throw new ExecutionError('execution_capacity', 'waiting for shared execution capacity before workspace maintenance')
    const at = Date.now()
    const value: Execution = { ...request, state: 'running', reason: null, queuedAt: at, queueDeadline: at,
      startedAt: at, deadline: at + this.limits.timeoutMs, endedAt: null }
    this.#save(value)
    this.#active.set(request.id, { value, controller: new AbortController(), resolve() {}, reject() {} })
    try {
      const result = effect()
      if (Date.now() > value.deadline!) throw new ExecutionError('execution_timeout', 'workspace maintenance deadline exceeded')
      this.#save({ ...value, state: 'succeeded', endedAt: Date.now() })
      return result
    } catch (error) {
      this.#save({ ...value, state: 'failed', reason: error instanceof ExecutionError ? error.code : 'execution_failed', endedAt: Date.now() })
      throw error
    } finally { this.#active.delete(request.id); this.#drain(); this.onAvailable?.() }
  }

  #save(value: Execution): void {
    this.store.record({ type: 'execution.updated', sessionID: value.sessionID, data: { execution: value },
      project: () => this.store.saveExecution(value) })
  }

  #drain(): void {
    if (this.#stopping) return
    const at = Date.now()
    const lowMemory = this.availableMemory() < this.limits.minFreeMemoryMB * 1048576
    const recoveredMemory = this.#lowMemory && !lowMemory
    this.#lowMemory = lowMemory
    for (const waiter of this.#active.values()) {
      if (!waiter.controller.signal.aborted && (lowMemory || at >= waiter.value.deadline!)) {
        const reason = lowMemory ? 'execution_low_memory' : 'execution_timeout'
        waiter.value = { ...waiter.value, reason }
        this.#save(waiter.value)
        waiter.controller.abort(new ExecutionError(reason,
          lowMemory ? 'execution stopped at the free RAM floor' : 'execution deadline exceeded'))
      }
    }
    for (let index = 0; index < this.#waiting.length;) {
      const waiter = this.#waiting[index]!
      if (at >= waiter.value.queueDeadline && !waiter.controller.signal.aborted) {
        waiter.controller.abort(new ExecutionError(lowMemory ? 'execution_low_memory' : 'execution_queue_timeout',
          lowMemory ? 'insufficient free RAM to admit execution' : 'execution admission deadline exceeded'))
      }
      if (waiter.controller.signal.aborted) {
        this.#waiting.splice(index, 1)
        const reason = waiter.controller.signal.reason
        this.#save({ ...waiter.value, state: 'cancelled', reason: reason instanceof ExecutionError ? reason.code : 'execution_cancelled', endedAt: at })
        waiter.reject(reason)
        continue
      }
      const reason = lowMemory ? 'execution_low_memory' : this.#active.size >= this.limits.maxActive ? 'execution_capacity' : null
      if (reason) {
        if (waiter.value.reason !== reason) { waiter.value = { ...waiter.value, reason }; this.#save(waiter.value) }
        index++
        continue
      }
      this.#waiting.splice(index, 1)
      waiter.value = { ...waiter.value, state: 'running', reason: null, startedAt: at, deadline: at + this.limits.timeoutMs }
      this.#save(waiter.value) // Claim commits before resolve can run the effect.
      this.#active.set(waiter.value.id, waiter)
      waiter.resolve()
    }
    if (recoveredMemory) this.onAvailable?.()
  }
}
