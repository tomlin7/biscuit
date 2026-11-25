import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context, estimateTokens } from '../src/context'
import { silentLogger } from '../src/log'
import { ProviderError, type Provider, type ProviderRequest } from '../src/provider'
import type { InstructionSource, Step } from '../src/protocol'
import { Sessions } from '../src/sessions'
import { Steps } from '../src/steps'
import { Store } from '../src/store'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'
import { until, sleep, startDaemon } from './harness'

function setup(options: { window?: number; enabled?: boolean; script?: Provider['stream']; instructions?: () => InstructionSource[]; file?: string; tools?: unknown[] } = {}) {
  const store = Store.open(options.file ?? ':memory:')
  store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
  const session = sessions.create({ title: 'context' })
  const requests: ProviderRequest[] = []
  const provider: Provider = {
    name: 'test', model: 'test/context', tools: options.tools, context: { window: options.window ?? 2400, reservedOutput: 256 },
    async stream(request, onText) {
      requests.push(request)
      expect(store.step(request.stepID)?.status).toBe('running')
      expect(store.contexts(session.id).at(-1)?.stepID).toBe(request.stepID)
      if (options.script) await options.script(request, onText)
      else onText('done')
    },
  }
  const context = { enabled: options.enabled, instructions: options.instructions ?? (() => []) }
  const steps = new Steps(store, silentLogger(), { provider, context, backoff: () => 0 })
  const seed = (count = 12) => {
    for (let i = 0; i < count; i++) sessions.prompt(session.id, { text: `goal ${i}: ${'history '.repeat(45)}` })
  }
  const finish = async () => {
    const step = steps.start(session.id)!
    await until(() => store.step(step.id)?.status !== 'running')
    return store.step(step.id)!
  }
  return { store, sessions, session, requests, steps, provider, context, seed, finish }
}

describe('active context', () => {
  test('budgets before the call, preserves the transcript and replays visible boundaries', async () => {
    const f = setup()
    f.seed()
    const before = f.store.messages(f.session.id)
    expect((await f.finish()).status).toBe('succeeded')
    const boundaries = f.store.compactions(f.session.id)
    expect(boundaries).toHaveLength(1)
    const boundary = boundaries[0]!
    expect(boundary.reason).toBe('budget')
    expect(boundary.text).toContain('Original goal: goal 0:')
    expect(boundary.text).toContain('Omitted older messages:')
    expect(f.store.messages(f.session.id).slice(0, before.length)).toEqual(before)
    expect(f.requests[0]!.messages[0]!.id).toBe(boundary.id)
    expect(f.requests[0]!.messages.at(-1)).toEqual(before.at(-1))
    expect(f.requests[0]!.messages.filter((m) => m.role === 'user').length).toBeLessThan(before.length)
    const ledger = f.store.contexts(f.session.id)[0]!
    expect(ledger.estimatedInput + ledger.reservedOutput).toBeLessThanOrEqual(ledger.window)
    const replay = f.store.eventsSince(0).reduce(apply, { ...initialSnapshot(), sessionID: f.session.id })
    const snapshot = hydrate(initialSnapshot(), f.store.snapshot(f.session.id)!)
    expect(replay.compactions).toEqual(snapshot.compactions)
    expect(replay.contexts).toEqual(snapshot.contexts)
    expect(replay.messages).toEqual(snapshot.messages)
    const event = f.store.eventsSince(0).find((e) => e.type === 'context.compacted')!
    expect(apply(replay, event).compactions).toHaveLength(1)
    expect(apply(initialSnapshot(), event).compactions).toEqual([])
    f.store.close()
  })

  test('successive compactions progress, preserve all messages and retain the newest goal', async () => {
    const f = setup()
    f.seed()
    await f.finish()
    const first = f.store.compactions(f.session.id)[0]!
    f.seed(10)
    const before = f.store.messages(f.session.id)
    expect((await f.finish()).status).toBe('succeeded')
    const second = f.store.compactions(f.session.id)[1]!
    expect(second.throughSeq).toBeGreaterThan(first.throughSeq)
    expect(f.requests[1]!.messages.at(-1)).toEqual(before.at(-1))
    expect(f.store.messages(f.session.id).slice(0, before.length)).toEqual(before)
    f.store.close()
  })

  test('one provider overflow compacts and rebuilds the same step without a retry loop', async () => {
    let calls = 0
    const f = setup({ window: 10000, script: async (_, text) => {
      if (++calls === 1) throw new ProviderError('context_overflow', 'provider limit', { retryable: true })
      text('recovered')
    } })
    f.seed()
    const step = await f.finish()
    expect(step.status).toBe('succeeded')
    expect(f.requests).toHaveLength(2)
    expect(new Set(f.requests.map((r) => r.stepID)).size).toBe(1)
    expect(f.store.steps(f.session.id)).toHaveLength(1)
    expect(f.store.compactions(f.session.id)).toHaveLength(1)
    expect(f.store.compactions(f.session.id)[0]!.reason).toBe('provider_overflow')
    expect(f.requests[1]!.messages.length).toBeLessThan(f.requests[0]!.messages.length)
    f.store.close()
  })

  test('a second overflow fails clearly even if the provider calls it retryable', async () => {
    const f = setup({ window: 10000, script: async () => {
      throw new ProviderError('context_overflow', 'too much', { retryable: true })
    } })
    f.seed()
    const step = await f.finish()
    expect(step.status).toBe('failed')
    expect(step.error?.code).toBe('context_overflow')
    expect(step.error?.retryable).toBe(false)
    expect(f.requests).toHaveLength(2)
    expect(f.store.compactions(f.session.id)).toHaveLength(1)
    f.store.close()
  })

  test('overflow after output preserves that output and never replays', async () => {
    const f = setup({ window: 10000, script: async (_, text) => {
      text('partial')
      throw new ProviderError('context_overflow', 'too much', { retryable: true })
    } })
    f.seed()
    const step = await f.finish()
    expect(step.output).toBe('partial')
    expect(step.error?.code).toBe('context_overflow')
    expect(f.requests).toHaveLength(1)
    expect(f.store.compactions(f.session.id)).toEqual([])
    f.store.close()
  })

  test.each([false, true])('an oversized newest prompt is never cut (compaction enabled: %s)', async (enabled) => {
    const f = setup({ enabled })
    f.sessions.prompt(f.session.id, { text: 'large'.repeat(2000) })
    const original = f.store.messages(f.session.id)
    const step = await f.finish()
    expect(step.error?.code).toBe('context_overflow')
    expect(f.requests).toEqual([])
    expect(f.store.messages(f.session.id)).toEqual(original)
    f.store.close()
  })

  test('disabled compaction refuses oversized history before touching the provider', async () => {
    const f = setup({ enabled: false })
    f.seed()
    expect((await f.finish()).error?.message).toContain('disabled')
    expect(f.requests).toEqual([])
    expect(f.store.compactions(f.session.id)).toEqual([])
    f.store.close()
  })

  test('a large newest prompt shares the remaining budget with a smaller summary and pinned system messages', async () => {
    const f = setup()
    f.seed()
    const system = f.store.newMessage(f.session.id, 'system', 'Always preserve this policy', Date.now())
    f.store.insertMessage(system)
    f.sessions.prompt(f.session.id, { text: 'n'.repeat(1600) })
    expect((await f.finish()).status).toBe('succeeded')
    const request = f.requests[0]!
    expect(request.messages).toContainEqual(system)
    expect(request.messages.at(-1)?.text).toBe('n'.repeat(1600))
    expect(f.store.compactions(f.session.id)).toHaveLength(1)
    f.store.close()
  })

  test('a transient retry reuses the boundary and reloads the active history', async () => {
    let calls = 0
    const f = setup({ script: async (_, text) => {
      if (++calls === 1) throw new ProviderError('rate_limit', 'wait', { retryable: true })
      text('done')
    } })
    f.seed()
    expect((await f.finish()).attempt).toBe(2)
    expect(f.store.compactions(f.session.id)).toHaveLength(1)
    expect(f.requests[1]!.messages).toEqual(f.requests[0]!.messages)
    expect(f.store.contexts(f.session.id).map((c) => c.attempt)).toEqual([1, 2])
    f.store.close()
  })

  test('a short rejected request fails without replacing it with a larger summary', async () => {
    const f = setup({ script: async () => { throw new ProviderError('context_overflow', 'too large') } })
    f.sessions.prompt(f.session.id, { text: 'a' })
    f.sessions.prompt(f.session.id, { text: 'b' })
    expect((await f.finish()).error?.code).toBe('context_overflow')
    expect(f.requests).toHaveLength(1)
    expect(f.store.compactions(f.session.id)).toHaveLength(0)
    f.store.close()
  })

  test('instructions, tool definitions, framing and reserved output all spend the budget', async () => {
    const f = setup({ instructions: () => [{ source: 'policy', text: 'p'.repeat(500) }],
      tools: [{ name: 'tool', description: 't'.repeat(500) }] })
    f.seed(4)
    expect((await f.finish()).status).toBe('succeeded')
    expect(f.store.compactions(f.session.id)).toHaveLength(1)
    const request = f.requests[0]!
    expect(request.instructions[0]!.text).toHaveLength(500)
    expect(request.tools).toHaveLength(1)
    expect(request.reservedOutput).toBe(256)
    const context = f.store.contexts(f.session.id)[0]!
    expect(context.estimatedInput).toBeGreaterThan(1000)
    expect(context.estimatedInput + context.reservedOutput).toBeLessThanOrEqual(2400)
    f.store.close()
  })

  test('source additions, edits and removals produce hash deltas, never rendered instruction prose', async () => {
    let sources = [{ source: 'AGENTS.md', text: 'secret instruction one' }]
    const f = setup({ instructions: () => sources })
    f.seed(1)
    await f.finish()
    const first = f.store.contexts(f.session.id)[0]!
    expect(first.changed).toEqual(['AGENTS.md'])
    f.seed(1)
    await f.finish()
    expect(f.store.contexts(f.session.id)[1]!.changed).toEqual([])
    sources = [{ source: 'AGENTS.md', text: 'secret instruction two' }, { source: 'policy', text: 'policy prose' }]
    f.seed(1)
    await f.finish()
    const edited = f.store.contexts(f.session.id)[2]!
    expect(edited.changed).toEqual(['AGENTS.md', 'policy'])
    expect(edited.sources[0]!.hash).not.toBe(first.sources[0]!.hash)
    sources = []
    f.seed(1)
    await f.finish()
    expect(f.store.contexts(f.session.id)[3]!.changed).toEqual(['AGENTS.md', 'policy'])
    const ledger = f.store.eventsSince(0).filter((e) => e.type === 'context.prepared')
    expect(JSON.stringify(ledger)).not.toContain('secret instruction')
    expect(JSON.stringify(ledger)).not.toContain('policy prose')
    f.store.close()
  })

  test('workspace AGENTS.md is read again after edits and removal', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hiroshi-instructions-'))
    const f = setup()
    const session = new Sessions(f.store, silentLogger(), { cwd: dir }).create({})
    const sessions = new Sessions(f.store, silentLogger(), { cwd: dir })
    sessions.prompt(session.id, { text: 'go' })
    const context = new Context(f.store, f.provider)
    const step = { id: 'step', sessionID: session.id, attempt: 1, provider: 'test', model: 'test/context' } as Step
    try {
      writeFileSync(join(dir, 'AGENTS.md'), 'first')
      expect(context.prepare(step).instructions[0]!.text).toBe('first')
      writeFileSync(join(dir, 'AGENTS.md'), 'second')
      expect(context.prepare(step).instructions[0]!.text).toBe('second')
      unlinkSync(join(dir, 'AGENTS.md'))
      expect(context.prepare(step).instructions).toEqual([])
      expect(f.store.contexts(session.id).at(-1)?.changed).toEqual(['workspace/AGENTS.md'])
    } finally {
      f.store.close()
      await sleep(100)
      try { rmSync(dir, { recursive: true, force: true }) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EBUSY') throw error
      }
    }
  })

  test('a persisted boundary survives reopening and a recovered overflow cannot loop after restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hiroshi-context-'))
    let calls = 0
    const f = setup({ file: join(dir, 'engine.db'), window: 10000, script: async (request) => {
      if (++calls === 1) throw new ProviderError('context_overflow', 'overflow')
      await new Promise<void>((resolve) => request.signal.addEventListener('abort', () => resolve(), { once: true }))
    } })
    let reopened: Store | undefined
    try {
      f.seed()
      const original = f.store.messages(f.session.id)
      const step = f.steps.start(f.session.id)!
      await until(() => f.requests.length === 2)
      f.steps.stopAll()
      await until(() => f.steps.running === 0)
      const boundary = f.store.compactions(f.session.id)[0]!
      f.store.close()
      reopened = Store.open(join(dir, 'engine.db'))
      const restored = reopened
      reopened.migrate()
      let resumedCalls = 0
      const next = new Steps(reopened, silentLogger(), { context: f.context, provider: {
        ...f.provider,
        async stream(request) {
          resumedCalls++
          expect(request.messages[0]!.id).toBe(boundary.id)
          throw new ProviderError('context_overflow', 'overflow again', { retryable: true })
        },
      } })
      next.resume()
      await until(() => restored.step(step.id)?.status === 'failed')
      await until(() => next.running === 0)
      expect(resumedCalls).toBe(1)
      expect(reopened.compactions(f.session.id)).toEqual([boundary])
      expect(reopened.messages(f.session.id)).toEqual(original)
      reopened.close()
    } finally {
      reopened?.close()
      f.store.close()
      await sleep(100)
      try { rmSync(dir, { recursive: true, force: true }) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EBUSY') throw error
      }
    }
  })

  test('UTF-8 estimation accounts for multibyte content', () => {
    expect(estimateTokens('漢字🙂')).toBe(10)
  })

  test('a real daemon continues past its window and a second process sees the full transcript', async () => {
    const daemon = await startDaemon()
    let restarted: Awaited<ReturnType<typeof startDaemon>> | undefined
    try {
      const { session } = await daemon.client.createSession({ title: 'long conversation' })
      const prompts = Array.from({ length: 12 }, (_, i) => `Requirement ${i}: ${'durable context '.repeat(300)}`.trim())
      for (let i = 0; i < prompts.length; i++) {
        await daemon.client.prompt({ id: session.id, text: prompts[i]! })
        await until(async () => {
          const detail = await daemon.client.session({ id: session.id })
          return detail.steps.length === i + 1 && detail.steps.every((step) => step.status === 'succeeded')
        })
      }
      const before = await daemon.client.session({ id: session.id })
      expect(before.compactions.length).toBeGreaterThan(0)
      expect(before.messages.filter((m) => m.role === 'user').map((m) => m.text)).toEqual(prompts)
      expect(before.messages.filter((m) => m.role === 'assistant')).toHaveLength(prompts.length)
      for (const context of before.contexts) {
        expect(context.estimatedInput + context.reservedOutput).toBeLessThanOrEqual(context.window)
      }
      await daemon.crash()
      restarted = await startDaemon({ home: daemon.home, workspace: daemon.workspace })
      const after = await restarted.client.session({ id: session.id })
      expect(after.messages).toEqual(before.messages)
      expect(after.compactions).toEqual(before.compactions)
      expect(after.contexts).toEqual(before.contexts)
    } finally {
      await (restarted ?? daemon).stop()
    }
  }, 60_000)
})
