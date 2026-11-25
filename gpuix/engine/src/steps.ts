/**
 * Steps: one model call, durable before it streams.
 *
 * A step is written down with `status: running` and the daemon's pid as its
 * claim before the provider is asked for anything. That row is the promise the
 * issue asks for: if the process dies, the next start can see exactly which
 * call was in flight and decide, from the output that already exists, whether
 * to continue it or fail it.
 *
 * The laws this file keeps:
 *
 *   - **One step, many attempts.** A retry increments `attempt` on the same
 *     row. It never spends a second step, and it never creates a second
 *     assistant message.
 *   - **Retries are narrow.** Only a `ProviderError` marked retryable is
 *     retried, only before output, and only up to `maxAttempts`. A stream that
 *     died after producing text is failed with the text kept: replaying it
 *     would duplicate the transcript, which is the one thing a retry must not
 *     do.
 *   - **A crash resumes the same step.** On startup a claimed step with no
 *     output is continued as its next attempt, with the same id. A claimed
 *     step that had produced output is failed explicitly; it is not re-run
 *     from the beginning.
 *   - **A shut down step stays claimed.** `stopAll` aborts the provider
 *     without writing an ending, so the next start resumes the step instead of
 *     pretending it never happened. An operator's interrupt is different: it
 *     is an ending and it is written.
 */

import { randomBytes, randomUUID } from 'node:crypto'

import { Context, type ContextOptions } from './context'
import type { Logger } from './log'
import { ProviderError, type Provider, type ProviderPart } from './provider'
import type { ModelToolRequest, Step, StepError } from './protocol'
import type { Store } from './store'
import type { Tools } from './tools/tools'
import { ExecutionBudget, ExecutionError } from './execution'
import type { CliConversations } from './cli-conversations'

export interface StepsOptions {
  cliConversations?: CliConversations
  budget?: ExecutionBudget
  provider: Provider
  context?: ContextOptions
  blocked?: (sessionID: string) => boolean
  tools?: Tools
  selectProvider?: (model?: string) => Provider
  /**
   * Physical attempts one step may spend, including the attempt it was
   * created with. A restart counts as an attempt.
   */
  maxAttempts?: number
  /** The delay before attempt N+1, in milliseconds. Injected by tests. */
  backoff?: (attempt: number) => number
}

const DEFAULT_MAX_ATTEMPTS = 3
const MAX_OUTPUT = 256 * 1024

interface ActiveStep {
  controller: AbortController
  done: Promise<void>
}

export class Steps {
  readonly #cli?: CliConversations
  readonly #blocked?: (sessionID: string) => boolean
  readonly #budget?: ExecutionBudget
  readonly #tools?: Tools
  readonly #store: Store
  readonly #log: Logger
  readonly #contextOptions: ContextOptions
  readonly #selectProvider?: (model?: string) => Provider
  readonly #provider: Provider
  readonly #maxAttempts: number
  readonly #backoff: (attempt: number) => number
  readonly #active = new Map<string, ActiveStep>()
  /** `stopAll` sets this: an aborted provider must not write an ending. */
  #stopping = false

  constructor(store: Store, log: Logger, options: StepsOptions) {
    this.#store = store
    this.#cli = options.cliConversations
    this.#budget = options.budget
    this.#blocked = options.blocked
    this.#tools = options.tools
    this.#log = log.child('steps')
    this.#provider = options.provider
    this.#contextOptions = options.context ?? {}
    this.#selectProvider = options.selectProvider
    this.#maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
    this.#backoff = options.backoff ?? defaultBackoff
  }

  /** How many provider calls are live, for status output and tests. */
  get running(): number {
    return this.#active.size
  }

  /** Whether a session has a step that has not ended. */
  busy(sessionID: string): boolean {
    return [...this.#active.keys()].some((id) => this.#store.step(id)?.sessionID === sessionID) || this.#store.steps(sessionID).some((step) => step.status === 'running') || (this.#tools?.busy(sessionID) ?? false)
  }

  /**
   * Called when a step ends, before any follow-up work starts. `serve` uses it
   * to ask the inbox whether the step's boundary now lets a prompt through.
   */
  onEnd: ((sessionID: string) => void) | null = null

  /**
   * Start the step that answers the newest delivered prompt.
   *
   * Idempotent: a session whose newest prompt already has a step gets that
   * step, and a session with a call in flight gets the call. The one case that
   * creates work is a newer prompt that arrived while a step was running; it
   * gets its own step when the call ends, which is how steering stays a
   * boundary decision.
   */
  start(sessionID: string): Step | null {
    if (this.#stopping || this.#blocked?.(sessionID)) return null
    if (this.#store.activeMessages(sessionID).at(-1)?.rewindID) return null
    const message = this.#store.lastUserMessage(sessionID)
    if (!message) return null

    const existing = this.#store.stepForMessage(message.id)
    let parent: Step | undefined
    let depth = 0
    if (existing) {
      if (!this.#tools) return existing
      let latest = existing
      depth = 1
      for (;;) {
        const child = this.#store.childStep(latest.id)
        if (!child) break
        latest = child
        depth++
      }
      const calls = this.#store.toolCalls(sessionID).filter((call) => call.stepID === latest.id && call.callID)
      if (latest.status !== 'succeeded' || !calls.length || calls.some((call) => !call.resultMessageID || call.status === 'cancelled')) return latest
      parent = latest
    }

    const running = this.#store.steps(sessionID).find((step) => step.status === 'running')
    if (running) return running

    // Prompts admitted before model selection existed belonged to local/echo.
    // A newly configured remote default must not retarget that durable work.
    const selected = this.#selectProvider?.(parent?.model ?? message.model ?? 'local/echo') ?? this.#provider
    const at = Date.now()
    const step: Step = {
      id: `step_${at.toString(36)}${randomBytes(4).toString('hex')}`,
      sessionID,
      messageID: message.id,
      ...(parent ? { parentID: parent.id } : {}),
      provider: selected.name,
      model: selected.model,
      attempt: 1,
      status: 'running',
      claim: process.pid,
      output: '',
      truncated: false,
      error: null,
      startedAt: at,
      endedAt: null,
    }

    this.#store.record({
      type: 'step.started',
      sessionID,
      at,
      data: { step },
      project: () => this.#store.insertStep(step),
    })
    this.#log.info(`step ${step.id} started in ${sessionID} on ${step.provider}/${step.model}`)
    if (depth >= 32) {
      this.#fail(step, { code: 'step_limit', message: 'this turn reached the limit of 32 model calls', retryable: false })
      return this.#store.step(step.id)!
    }
    this.#run(step)
    return step
  }

  /**
   * Claim the steps a dead process left behind.
   *
   * A step that had produced output cannot be continued without duplicating
   * the transcript, so it fails with the reason. A step with no output is the
   * same step on its next attempt: the id does not change, which is what
   * "resumes instead of starting a new one" means.
   */
  resume(): Step[] {
    const claimed = this.#store.runningSteps()
    const resumed: Step[] = []

    for (const step of claimed) {
      if (this.#blocked?.(step.sessionID)) continue
      const current = this.#store.step(step.id)
      if (!current || current.status !== 'running') continue

      const binding = this.#store.cliConversation(current.sessionID)
      if (this.#cli && binding?.stepID === current.id && binding.status === 'running' &&
        this.#store.stepParts(current.sessionID).some((part) => part.stepID === current.id && part.kind === 'cli' && part.version === 2 && part.phase === 'completed')) {
        // The CLI exited successfully before the crash. Commit the already
        // durable answer once; this performs no provider or process I/O.
        this.#complete(current)
        continue
      }

      if (current.output.length > 0 || this.#store.stepParts(current.sessionID).some((part) => part.stepID === current.id)) {
        this.#fail(current, {
          code: 'engine_restart_mid_stream',
          message: 'the engine stopped after this step had produced output; it was not re-run',
          retryable: false,
        })
        continue
      }

      const admissions = this.#store.executions(current.sessionID).filter((item) => item.id.startsWith(`${current.id}:${current.attempt}`))
      const queued = this.#budget && (!admissions.length || admissions.some((item) => item.state === 'queued'))
      const provider = this.#selectProvider?.(current.model) ?? this.#provider
      if (!queued && provider.replayAfterRestart === false) {
        this.#fail(current, { code: 'cli_interrupted', message: 'the CLI submission was interrupted; it was not replayed', retryable: false })
        continue
      }
      if (!queued && current.attempt >= this.#maxAttempts) {
        this.#fail(current, {
          code: 'retries_exhausted',
          message: `the engine restarted ${current.attempt} times before this step produced output; it gave up`,
          retryable: false,
        })
        continue
      }

      const next: Step = {
        ...current,
        attempt: current.attempt + (queued ? 0 : 1),
        claim: process.pid,
        error: null,
      }
      this.#store.record({
        type: 'step.resumed',
        sessionID: next.sessionID,
        data: {
          step: next,
          reason: 'the engine restarted before this step produced output; the same step continues',
        },
        project: () => this.#store.updateStep(next),
      })
      this.#log.info(`step ${next.id} resumed as attempt ${next.attempt} after a restart`)
      resumed.push(next)
    }

    for (const step of resumed) this.#run(step)
    return resumed
  }

  /**
   * Start a step for every session whose newest prompt does not have one.
   *
   * Startup uses this for prompts that were delivered while the dead process
   * was settling its runs, and for a session that never got to take its first
   * step.
   */
  kickAll(): void {
    for (const session of this.#store.sessions()) this.start(session.id)
  }

  /**
   * Stop a session's running step as one decision by the operator.
   *
   * The cancellation is written before the provider is aborted, so the
   * transcript has the reason even if the provider ignores the signal. The
   * step's loop sees a row that is no longer running and writes nothing else.
   */
  interrupt(sessionID: string, reason: string): Step[] {
    this.#tools?.interrupt(sessionID)
    const running = this.#store.steps(sessionID).filter((step) => step.status === 'running')
    for (const step of running) {
      this.#cancel(step, reason)
      this.#active.get(step.id)?.controller.abort()
    }
    return running
      .map((step) => this.#store.step(step.id))
      .filter((step): step is Step => step !== null)
  }

  /**
   * Abort every live call without writing an ending.
   *
   * The claim stays in the database, so the next start resumes it. This is the
   * graceful half of the crash law: shutting down is not pretending the work
   * finished.
   */
  stopAll(): void {
    this.#stopping = true
    for (const active of this.#active.values()) active.controller.abort()
  }

  #run(initial: Step): void {
    const controller = new AbortController()
    const done = this.#loop(initial, controller)
      .catch((error) => {
        this.#log.error(`step ${initial.id} crashed outside its loop: ${String(error)}`)
      })
      .finally(() => {
        this.#active.delete(initial.id)
        // The step's ending is committed; if a prompt was waiting for this
        // boundary, it may be delivered now. A shutdown skips this: prompts
        // stay in the inbox and the next start delivers them.
        if (!this.#stopping) {
          try {
            this.onEnd?.(initial.sessionID)
          } catch (error) {
            this.#log.error(`the step boundary listener failed: ${String(error)}`)
          }
        }
        this.#kick(initial.sessionID)
      })
    this.#active.set(initial.id, { controller, done })
  }

  async #loop(initial: Step, controller: AbortController): Promise<void> {
    let step = initial
    let produced = false
    let overflow = false
    const existingParts = this.#store.stepParts(initial.sessionID).filter((part) => part.stepID === initial.id)
    let partBytes = existingParts.reduce((sum, part) => sum + JSON.stringify(part).length, 0)
    let partCount = existingParts.length

    for (;;) {
      let callingProvider = false
      try {
        const provider = this.#selectProvider?.(step.model) ?? this.#provider
        provider.check?.()
        const recovered = overflow || this.#store.compactions(step.sessionID).some((boundary) => boundary.stepID === step.id && boundary.reason === 'provider_overflow')
        const stream = (signal: AbortSignal) => {
          signal.throwIfAborted()
          provider.check?.()
          const request = new Context(this.#store, provider, { ...this.#contextOptions, tools: this.#tools?.registry.definitions() ?? this.#contextOptions.tools }).prepare(step, overflow)
          const continuation = this.#cli?.begin(step, provider, { ...request, signal })
          const messages = continuation?.resume ? this.#store.activeMessages(step.sessionID).filter((message) => message.seq > continuation.throughSeq && message.role === 'user') : request.messages
          overflow = false
          callingProvider = true
          return provider.stream(
            { ...request, messages, continuation, signal },
            (text) => {
              if (!text || signal.aborted) return
              produced = true
              step = this.#append(step, text)
            },
            (value: ProviderPart) => {
              if (signal.aborted) return
              this.#cli?.part(step, value)
              if (value.kind === 'reasoning' && !value.text) return
              if (value.kind !== 'usage') produced = true
              const size = JSON.stringify(value).length
              if (++partCount > 4096 || (partBytes += size) > MAX_OUTPUT) {
                throw new ProviderError('provider_output_limit', 'provider reasoning or tool output exceeded the durable limit')
              }
              const part = { ...value, id: `part_${randomUUID()}`, sessionID: step.sessionID, stepID: step.id, attempt: step.attempt, at: Date.now() }
              this.#store.record({ type: 'step.part', sessionID: step.sessionID, data: { part }, project: () => this.#store.insertStepPart(part) })
            },
          )
        }
        if (this.#budget) await this.#budget.execute({ id: `${step.id}:${step.attempt}${recovered ? ':compacted' : ''}`, sessionID: step.sessionID, kind: 'model', messageID: step.messageID ?? undefined }, controller.signal, stream)
        else await stream(controller.signal)

        if (controller.signal.aborted) {
          if (!this.#stopping) this.#cancel(step, 'the operator stopped this step')
          return
        }
        this.#complete(step)
        return
      } catch (error) {
        if (controller.signal.aborted) {
          if (!this.#stopping) this.#cancel(step, 'the operator stopped this step')
          return
        }

        const failure = error instanceof ExecutionError
          ? { code: error.code, message: error.message, retryable: false }
          : classify(error)

        if (failure.code === 'context_overflow') {
          const recovered = this.#store.compactions(step.sessionID)
            .some((boundary) => boundary.stepID === step.id && boundary.reason === 'provider_overflow')
          if (!callingProvider || produced || recovered) {
            this.#fail(step, {
              code: 'context_overflow',
              message: produced
                ? 'the provider overflowed after producing output; the step was not replayed'
                : recovered && callingProvider
                  ? `the provider overflowed again after compaction: ${failure.message}`
                  : failure.message,
              retryable: false,
            })
            return
          }
          // Rebuild the same durable step once, independently of transient retries.
          overflow = true
          continue
        }

        if (produced) {
          this.#fail(step, {
            code: failure.retryable ? 'stream_truncated' : failure.code,
            message: `the provider failed after producing output; it was not retried: ${failure.message}`,
            retryable: false,
          })
          return
        }

        if (failure.retryable && step.attempt < this.#maxAttempts) {
          const delay = this.#backoff(step.attempt)
          const next: Step = { ...step, attempt: step.attempt + 1, error: failure }
          this.#store.record({
            type: 'step.retry',
            sessionID: next.sessionID,
            data: { step: next, delay, error: failure },
            project: () => this.#store.updateStep(next),
          })
          this.#log.warn(
            `step ${next.id} attempt ${step.attempt} failed (${failure.code}); retrying in ${delay}ms`,
          )
          step = next
          await sleep(delay)
          if (controller.signal.aborted) {
            if (!this.#stopping) this.#cancel(step, 'the operator stopped this step')
            return
          }
          continue
        }

        if (failure.retryable) {
          this.#fail(step, {
            code: 'retries_exhausted',
            message: `the provider kept failing; gave up after ${step.attempt} attempts: ${failure.message}`,
            retryable: false,
          })
          return
        }

        this.#fail(step, failure)
        return
      }
    }
  }

  /** Append a streamed piece to the step, bounded, in its own transaction. */
  #append(step: Step, text: string): Step {
    if (step.truncated) return step

    const room = MAX_OUTPUT - step.output.length
    if (room <= 0) {
      const full: Step = { ...step, truncated: true }
      this.#store.updateStep(full)
      return full
    }

    const data = text.slice(0, room)
    const truncated = data.length < text.length || step.output.length + data.length >= MAX_OUTPUT
    const next: Step = { ...step, output: step.output + data, truncated }
    this.#store.record({
      type: 'step.output',
      sessionID: next.sessionID,
      data: { stepID: next.id, data },
      project: () => this.#store.updateStep(next),
    })
    return next
  }

  #complete(step: Step): void {
    const current = this.#store.step(step.id)
    if (!current || current.status !== 'running') return

    const at = Date.now()
    const requests = this.#tools ? this.#requests(current) : []
    const message = current.output.length > 0 || requests.length > 0
      ? this.#store.newMessage(current.sessionID, 'assistant', current.output, at)
      : null
    if (message && this.#tools) {
      message.stepID = current.id
      if (requests.length) message.toolCalls = requests
      const state = this.#store.stepParts(current.sessionID).filter((part) => part.stepID === current.id && part.kind === 'state')
      if (state.length) message.providerState = state.map((part) => {
        if (part.kind !== 'state') throw new Error('unreachable provider state')
        return { provider: part.provider, value: JSON.parse(part.text) }
      })
    }
    const toolCalls = message && this.#tools ? this.#tools.prepare(current, message, requests) : []
    const done: Step = { ...current, status: 'succeeded', claim: null, error: null, endedAt: at }

    this.#store.record({
      type: 'step.completed',
      sessionID: current.sessionID,
      at,
      data: { step: done, message, ...(toolCalls.length ? { toolCalls } : {}) },
      project: () => {
        if (message) this.#store.insertMessage(message)
        this.#store.updateStep(done)
        for (const call of toolCalls) this.#store.insertToolCall(call)
      },
    })
    this.#cli?.complete(done)
    this.#log.info(`step ${done.id} succeeded in ${done.attempt} attempt(s)`)
    if (toolCalls.length) this.#tools?.kick(current.sessionID)
  }

  #requests(step: Step): ModelToolRequest[] {
    const calls = new Map<string, ModelToolRequest & { ended: boolean }>()
    for (const part of this.#store.stepParts(step.sessionID).filter((part) => part.stepID === step.id)) {
      if (part.kind !== 'tool') continue
      if (part.phase === 'start') {
        if (calls.has(part.callID) || !part.callID || !part.name || !/^[a-zA-Z0-9_-]{1,64}$/.test(part.name) || calls.size >= 64) {
          throw new ProviderError('tool_protocol', 'invalid, duplicate or excessive tool requests')
        }
        calls.set(part.callID, { id: part.callID, name: part.name, arguments: part.text, ended: false })
      } else {
        const call = calls.get(part.callID)
        if (!call || call.ended) throw new ProviderError('tool_protocol', 'tool arguments arrived outside a live request')
        call.arguments += part.text
        if (part.phase === 'end') call.ended = true
      }
    }
    return [...calls.values()].map(({ ended, ...call }) => {
      if (!ended) throw new ProviderError('tool_protocol', 'the provider did not finish its tool arguments')
      return { ...call, arguments: call.arguments || '{}' }
    })
  }

  #fail(step: Step, error: StepError): void {
    const current = this.#store.step(step.id)
    if (!current || current.status !== 'running') return

    const done: Step = { ...current, status: 'failed', claim: null, error, endedAt: Date.now() }
    this.#store.record({
      type: 'step.failed',
      sessionID: current.sessionID,
      data: { step: done },
      project: () => this.#store.updateStep(done),
    })
    this.#cli?.block(current.sessionID, `The CLI submission failed (${error.code}). Its vendor context may have changed; it was not replayed. Start a fresh CLI conversation deliberately.`, current.id)
    this.#log.warn(`step ${done.id} failed: ${error.code} — ${error.message}`)
  }

  #cancel(step: Step, reason: string): void {
    const current = this.#store.step(step.id)
    if (!current || current.status !== 'running') return

    const done: Step = {
      ...current,
      status: 'cancelled',
      claim: null,
      error: { code: 'cancelled', message: reason, retryable: false },
      endedAt: Date.now(),
    }
    this.#store.record({
      type: 'step.cancelled',
      sessionID: current.sessionID,
      data: { step: done },
      project: () => this.#store.updateStep(done),
    })
    this.#cli?.block(current.sessionID, 'The CLI submission was cancelled. Its vendor context may have changed; it was not replayed.', current.id)
    this.#log.info(`step ${done.id} cancelled: ${reason}`)
  }

  #kick(sessionID: string): void {
    this.start(sessionID)
  }
}

function classify(error: unknown): StepError {
  if (error instanceof ProviderError) {
    return { code: error.code, message: error.message, retryable: error.retryable }
  }
  if (error instanceof Error) {
    return { code: 'provider_failed', message: error.message, retryable: false }
  }
  return { code: 'provider_failed', message: String(error), retryable: false }
}

/** Exponential with jitter: 250ms, 500ms, 1s, ... capped at 8s. */
function defaultBackoff(attempt: number): number {
  const base = Math.min(8000, 250 * 2 ** (attempt - 1))
  return base + Math.floor(Math.random() * 250)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
