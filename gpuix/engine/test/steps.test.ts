/**
 * The step's laws, without a process to crash.
 *
 * The daemon-level crash tests live in `survival.test.ts`; these exercise the
 * same rules with a scripted provider, where a rate limit, a broken stream or
 * a claimed row can be produced at exactly the moment the test wants.
 */

import { describe, expect, test } from 'bun:test'

import { Inbox } from '../src/inbox'
import { silentLogger } from '../src/log'
import { ProviderError, type Provider, type ProviderRequest } from '../src/provider'
import type { EngineEvent, EventType, MessageRole, Step } from '../src/protocol'
import { Sessions } from '../src/sessions'
import { Steps } from '../src/steps'
import { Store } from '../src/store'
import { sleep, until } from './harness'

type Script = (attempt: number, onText: (text: string) => void, request: ProviderRequest) => Promise<void>

class ScriptedProvider implements Provider {
  readonly name = 'scripted'
  readonly model = 'scripted/one'
  readonly #script: Script
  attempts = 0
  readonly requests: ProviderRequest[] = []

  constructor(script: Script) {
    this.#script = script
  }

  async stream(request: ProviderRequest, onText: (text: string) => void): Promise<void> {
    this.attempts += 1
    this.requests.push(request)
    await this.#script(this.attempts, onText, request)
  }
}

interface Options {
  script: Script
  /** Wire delivery to `steps.start`, the way `serve` does. Default true. */
  wire?: boolean
  maxAttempts?: number
  backoff?: (attempt: number) => number
}

function setup(options: Options) {
  const store = Store.open(':memory:')
  store.migrate()
  const log = silentLogger()
  const inbox = new Inbox(store, log)
  const sessions = new Sessions(store, log, { cwd: process.cwd(), inbox })
  const provider = new ScriptedProvider(options.script)
  const steps = new Steps(store, log, {
    provider,
    maxAttempts: options.maxAttempts,
    backoff: options.backoff ?? (() => 5),
  })
  if (options.wire !== false) {
    inbox.onDelivered = (sessionID) => void steps.start(sessionID)
    inbox.busy = (sessionID) => steps.busy(sessionID)
    steps.onEnd = (sessionID) => {
      void inbox.deliver(sessionID)
    }
  }
  const session = sessions.create({ title: 'steps' })
  return { store, inbox, sessions, steps, provider, session }
}

function events<Type extends EventType>(store: Store, type: Type): Array<Extract<EngineEvent, { type: Type }>> {
  return store
    .eventsSince(0)
    .filter((event): event is Extract<EngineEvent, { type: Type }> => event.type === type)
}

function roles(store: Store, sessionID: string): MessageRole[] {
  return store.messages(sessionID).map((message) => message.role)
}

describe('steps', () => {
  test('a step is durable before the provider is called', async () => {
    const seen: { step: Step | null } = { step: null }

    const { store, sessions, session } = setup({
      script: async (_attempt, onText) => {
        const message = store.lastUserMessage(session.id)!
        seen.step = store.stepForMessage(message.id)
        onText('hello')
        onText(' world')
      },
    })

    sessions.prompt(session.id, { text: 'go' })
    await until(() => store.steps(session.id)[0]?.status === 'succeeded')

    expect(seen.step).not.toBeNull()
    expect(seen.step!.status).toBe('running')
    expect(seen.step!.claim).toBe(process.pid)
    expect(seen.step!.attempt).toBe(1)

    const step = store.steps(session.id)[0]!
    expect(step.output).toBe('hello world')
    expect(step.error).toBeNull()
    expect(roles(store, session.id)).toEqual(['user', 'assistant'])
    expect(store.messages(session.id)[1]!.text).toBe('hello world')

    const types = store.eventsSince(0).map((event) => event.type)
    expect(types).toContain('step.started')
    expect(types).toContain('step.output')
    expect(types).toContain('step.completed')

    store.close()
  })

  test('a rate limit retries the same step with a visible, growing backoff', async () => {
    const { store, sessions, session, provider } = setup({
      script: async (attempt, onText) => {
        if (attempt < 3) throw new ProviderError('rate_limit', 'slow down', { retryable: true })
        onText('finally')
      },
      backoff: (attempt) => attempt * 10,
    })

    sessions.prompt(session.id, { text: 'answer me' })
    await until(() => store.steps(session.id)[0]?.status === 'succeeded')

    expect(provider.attempts).toBe(3)
    expect(store.steps(session.id)).toHaveLength(1)
    const step = store.steps(session.id)[0]!
    expect(step.attempt).toBe(3)
    expect(step.error).toBeNull()

    const retries = events(store, 'step.retry')
    expect(retries).toHaveLength(2)
    expect(retries.map((event) => event.data.delay)).toEqual([10, 20])
    expect(retries[0]!.data.error.code).toBe('rate_limit')
    expect(retries[0]!.data.error.retryable).toBe(true)
    // The retry carries the next attempt and never a second step.
    expect(retries.map((event) => event.data.step.attempt)).toEqual([2, 3])

    expect(roles(store, session.id)).toEqual(['user', 'assistant'])
    expect(store.messages(session.id)[1]!.text).toBe('finally')
    store.close()
  })

  test('a stream that dies after output is failed, never replayed', async () => {
    const { store, sessions, session, provider } = setup({
      script: async (_attempt, onText) => {
        onText('half')
        throw new ProviderError('stream_truncated', 'the socket closed', { retryable: true })
      },
    })

    sessions.prompt(session.id, { text: 'answer me' })
    await until(() => store.steps(session.id)[0]?.status !== 'running')

    const step = store.steps(session.id)[0]!
    expect(provider.attempts).toBe(1)
    expect(step.status).toBe('failed')
    expect(step.attempt).toBe(1)
    expect(step.output).toBe('half')
    expect(step.error?.code).toBe('stream_truncated')
    expect(step.error?.retryable).toBe(false)
    expect(step.error?.message).toContain('not retried')
    // The text it did produce stays; no assistant message claims a complete answer.
    expect(roles(store, session.id)).toEqual(['user'])
    store.close()
  })

  test('a failure the provider did not mark retryable is not retried', async () => {
    const { store, sessions, session, provider } = setup({
      script: async () => {
        throw new ProviderError('bad_request', 'the model does not exist', { retryable: false })
      },
    })

    sessions.prompt(session.id, { text: 'answer me' })
    await until(() => store.steps(session.id)[0]?.status !== 'running')

    expect(provider.attempts).toBe(1)
    const step = store.steps(session.id)[0]!
    expect(step.status).toBe('failed')
    expect(step.attempt).toBe(1)
    expect(step.error?.code).toBe('bad_request')
    expect(events(store, 'step.retry')).toHaveLength(0)
    store.close()
  })

  test('retries are bounded and the last word is a clear failure', async () => {
    const { store, sessions, session, provider } = setup({
      script: async () => {
        throw new ProviderError('rate_limit', 'still busy', { retryable: true })
      },
      maxAttempts: 2,
    })

    sessions.prompt(session.id, { text: 'answer me' })
    await until(() => store.steps(session.id)[0]?.status === 'failed')

    const step = store.steps(session.id)[0]!
    expect(provider.attempts).toBe(2)
    expect(step.attempt).toBe(2)
    expect(step.error?.code).toBe('retries_exhausted')
    expect(step.error?.message).toContain('2 attempts')
    expect(step.error?.retryable).toBe(false)
    expect(roles(store, session.id)).toEqual(['user'])
    store.close()
  })

  test('a claim with no output resumes the same step, not a new one', async () => {
    const { store, sessions, session, provider, steps } = setup({
      wire: false,
      script: async (_attempt, onText) => {
        expect(store.step('step_claim')?.claim).toBe(process.pid)
        onText('resumed')
      },
    })

    sessions.prompt(session.id, { text: 'finish after the crash' })
    const message = store.lastUserMessage(session.id)!
    const at = Date.now()
    const claimed: Step = {
      id: 'step_claim',
      sessionID: session.id,
      messageID: message.id,
      provider: 'scripted',
      model: 'scripted/one',
      attempt: 1,
      status: 'running',
      claim: 999_999,
      output: '',
      truncated: false,
      error: null,
      startedAt: at,
      endedAt: null,
    }
    // The row a killed process leaves behind: claimed, no output, no ending.
    store.record({
      type: 'step.started',
      sessionID: session.id,
      at,
      data: { step: claimed },
      project: () => store.insertStep(claimed),
    })

    const resumed = steps.resume()
    expect(resumed).toHaveLength(1)
    await until(() => store.step('step_claim')?.status === 'succeeded')

    expect(provider.attempts).toBe(1)
    expect(store.steps(session.id)).toHaveLength(1)
    const step = store.step('step_claim')!
    expect(step.id).toBe(claimed.id)
    expect(step.attempt).toBe(2)
    expect(step.output).toBe('resumed')
    expect(roles(store, session.id)).toEqual(['user', 'assistant'])
    expect(events(store, 'step.resumed')[0]!.data.reason).toContain('same step continues')
    store.close()
  })

  test('a claim that had produced output is failed, and the provider is not called again', async () => {
    const { store, sessions, session, provider, steps } = setup({
      wire: false,
      script: async () => {
        throw new Error('the provider must not be called')
      },
    })

    sessions.prompt(session.id, { text: 'do not duplicate this' })
    const message = store.lastUserMessage(session.id)!
    const at = Date.now()
    store.insertStep({
      id: 'step_partial',
      sessionID: session.id,
      messageID: message.id,
      provider: 'scripted',
      model: 'scripted/one',
      attempt: 1,
      status: 'running',
      claim: 999_999,
      output: 'half an answer',
      truncated: false,
      error: null,
      startedAt: at,
      endedAt: null,
    })

    expect(steps.resume()).toEqual([])
    const step = store.step('step_partial')!
    expect(provider.attempts).toBe(0)
    expect(step.status).toBe('failed')
    expect(step.attempt).toBe(1)
    expect(step.error?.code).toBe('engine_restart_mid_stream')
    expect(step.error?.message).toContain('not re-run')
    expect(step.output).toBe('half an answer')
    expect(roles(store, session.id)).toEqual(['user'])
    store.close()
  })

  test('an interrupt cancels the running step with the operator’s reason', async () => {
    const { store, sessions, session, steps } = setup({
      script: async (_attempt, onText, request) => {
        onText('started')
        await new Promise<void>((resolve) => {
          if (request.signal.aborted) return resolve()
          request.signal.addEventListener('abort', () => resolve(), { once: true })
        })
      },
    })

    sessions.prompt(session.id, { text: 'stop me' })
    await until(() => store.steps(session.id)[0]?.output === 'started')

    const stopped = steps.interrupt(session.id, 'the operator stopped this step: changed their mind')
    expect(stopped).toHaveLength(1)
    expect(stopped[0]!.status).toBe('cancelled')
    expect(stopped[0]!.error?.code).toBe('cancelled')
    expect(stopped[0]!.error?.message).toContain('changed their mind')
    await sleep(20)

    const step = store.steps(session.id)[0]!
    expect(step.status).toBe('cancelled')
    expect(step.claim).toBeNull()
    // No assistant message: a cancelled step produced no answer.
    expect(roles(store, session.id)).toEqual(['user'])
    expect(events(store, 'step.cancelled')).toHaveLength(1)
    store.close()
  })

  test('a shutdown leaves the claim for the next start', async () => {
    const first = setup({
      script: async (_attempt, _onText, request) => {
        // Nothing is written: this is the claim a shutdown leaves, not a step
        // that already has output to protect.
        await new Promise<void>((resolve) => {
          if (request.signal.aborted) return resolve()
          request.signal.addEventListener('abort', () => resolve(), { once: true })
        })
      },
    })

    first.sessions.prompt(first.session.id, { text: 'outlive the shutdown' })
    await until(() => first.store.steps(first.session.id)[0]?.status === 'running')

    first.steps.stopAll()
    await sleep(20)
    const claimed = first.store.steps(first.session.id)[0]!
    expect(claimed.status).toBe('running')
    expect(claimed.claim).toBe(process.pid)
    expect(claimed.output).toBe('')
    expect(roles(first.store, first.session.id)).toEqual(['user'])
    expect(events(first.store, 'step.cancelled')).toHaveLength(0)
    expect(events(first.store, 'step.failed')).toHaveLength(0)

    // A new process: the same database, a provider that can finish.
    const second = new Steps(first.store, silentLogger(), {
      provider: new ScriptedProvider(async (_attempt, onText) => onText('finished')),
      backoff: () => 1,
    })
    const resumed = second.resume()
    expect(resumed).toHaveLength(1)
    expect(resumed[0]!.id).toBe(claimed.id)
    await until(() => first.store.step(claimed.id)?.status === 'succeeded')

    const step = first.store.step(claimed.id)!
    expect(step.attempt).toBe(2)
    expect(step.output).toBe('finished')
    expect(roles(first.store, first.session.id)).toEqual(['user', 'assistant'])
    first.store.close()
  })

  test('a prompt delivered during a step starts the next step when the first ends', async () => {
    let release: (() => void) | null = null
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const { store, sessions, session } = setup({
      script: async (attempt, onText) => {
        if (attempt === 1) {
          onText('first answer')
          await gate
        } else {
          onText('second answer')
        }
      },
    })

    sessions.prompt(session.id, { text: 'one' })
    await until(() => store.steps(session.id)[0]?.output === 'first answer')

    // A steer is delivered while the step is streaming: it is safe, because it
    // lands in the history the next step will load.
    sessions.prompt(session.id, { text: 'two', mode: 'steer' })
    expect(store.steps(session.id)).toHaveLength(1)

    release!()
    await until(() => {
      const all = store.steps(session.id)
      return all.length === 2 && all.every((step) => step.status === 'succeeded')
    })

    expect(store.steps(session.id).map((step) => step.output)).toEqual(['first answer', 'second answer'])
    expect(roles(store, session.id)).toEqual(['user', 'assistant', 'user', 'assistant'])
    store.close()
  })
})
