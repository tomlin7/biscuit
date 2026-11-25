import { describe, expect, test } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProviderCatalog, type ProvidersConfig } from '../src/providers/catalog'
import { OpenAIProvider } from '../src/providers/openai'
import { AnthropicProvider } from '../src/providers/anthropic'
import type { ProviderRequest, ProviderPart } from '../src/provider'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { Steps } from '../src/steps'
import { silentLogger } from '../src/log'
import { engineTranscript } from '../../src/engine/transcript'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'
import { startDaemon, tempHome, until } from './harness'

const credential = 'test-provider-secret-never-persist'
const model = { id: 'chat', model: 'upstream-model-name', label: 'Configured chat', contextWindow: 32768, reservedOutput: 1024 }
const frame = (event: object) => `event: ignored\ndata: ${JSON.stringify(event)}\n\n`
const openAIEvents = [
  { type: 'response.reasoning_summary_text.delta', delta: 'A summary 漢🙂' },
  { type: 'response.output_item.added', item: { type: 'function_call', id: 'item_1', call_id: 'call_1', name: 'read_file' } },
  { type: 'response.function_call_arguments.delta', item_id: 'item_1', delta: '{"path":' },
  { type: 'response.function_call_arguments.delta', item_id: 'item_1', delta: '"README.md"}' },
  { type: 'response.output_item.done', item: { type: 'function_call', id: 'item_1', call_id: 'call_1', name: 'read_file' } },
  { type: 'response.output_text.delta', delta: 'Hello ' },
  { type: 'response.output_text.delta', delta: 'world' },
  { type: 'response.completed' },
]
const anthropicEvents = [
  { type: 'message_start', message: { id: 'm1' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'A summary 漢🙂' } },
  { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'call_1', name: 'read_file' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"path":"README.md"}' } },
  { type: 'content_block_stop', index: 1 },
  { type: 'content_block_delta', index: 2, delta: { type: 'text_delta', text: 'Hello world' } },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
  { type: 'message_stop' },
]

function request(signal = new AbortController().signal): ProviderRequest {
  return { sessionID: 's', stepID: 'step', provider: 'remote', model: 'remote/chat', signal,
    messages: [{ id: 'm', sessionID: 's', seq: 0, role: 'user', text: 'hello', at: 1 }],
    instructions: [{ source: 'policy', text: 'Be concise' }], tools: [], reservedOutput: 1024 }
}
function options(baseURL: string) {
  return { name: 'remote', model: 'remote/chat', providerModel: model.model, apiKey: credential, baseURL,
    context: { window: 32768, reservedOutput: 1024 } }
}

describe('provider adapters over HTTP', () => {
  test('HTTP adapters preserve cache and reasoning counts without adding subsets twice', async () => {
    for (const adapter of ['openai', 'anthropic'] as const) {
      const events = adapter === 'openai'
        ? [{ type: 'response.completed', response: { usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 80 }, output_tokens: 10, output_tokens_details: { reasoning_tokens: 4 } } } }]
        : [{ type: 'message_start', message: { usage: { input_tokens: 20, cache_read_input_tokens: 70, cache_creation_input_tokens: 10, output_tokens: 0 } } },
          { type: 'message_delta', usage: { output_tokens: 10 } }, { type: 'message_stop' }]
      const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response(events.map(frame).join(''), { headers: { 'content-type': 'text/event-stream' } }) })
      try {
        const config = options(server.url.href.replace(/\/$/, ''))
        const provider = adapter === 'openai' ? new OpenAIProvider(config) : new AnthropicProvider(config)
        const parts: ProviderPart[] = []
        await provider.stream(request(), () => {}, (part) => parts.push(part))
        const usage = parts.filter((part) => part.kind === 'usage')
        expect(usage[0]).toMatchObject(adapter === 'openai'
          ? { inputTokens: 100, cachedInputTokens: 80, outputTokens: 10, reasoningTokens: 4 }
          : { inputTokens: 100, cachedInputTokens: 70, cacheWriteTokens: 10 })
        expect(usage.at(-1)).toMatchObject({ outputTokens: 10 })
      } finally { server.stop(true) }
    }
  })

  for (const [adapter, events] of [['openai', openAIEvents], ['anthropic', anthropicEvents]] as const) {
    test(`${adapter} normalizes fragmented UTF-8 SSE, instructions, reasoning and tool calls`, async () => {
      let body: any
      let auth = ''
      const server = Bun.serve({ port: 0, hostname: '127.0.0.1', async fetch(req) {
        body = await req.json()
        auth = req.headers.get(adapter === 'openai' ? 'authorization' : 'x-api-key') ?? ''
        const bytes = new TextEncoder().encode(events.map(frame).join('').replace(/\n/g, '\r\n'))
        return new Response(new ReadableStream({ start(controller) {
          for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1))
          controller.close()
        } }), { headers: { 'content-type': 'text/event-stream' } })
      } })
      try {
        const provider = adapter === 'openai' ? new OpenAIProvider(options(server.url.href.replace(/\/$/, '')))
          : new AnthropicProvider(options(server.url.href.replace(/\/$/, '')))
        expect(JSON.stringify(provider)).not.toContain(credential)
        const text: string[] = []
        const parts: ProviderPart[] = []
        await provider.stream(request(), (delta) => text.push(delta), (part) => parts.push(part))
        expect(text.join('')).toBe('Hello world')
        expect(parts[0]).toEqual({ kind: 'reasoning', text: 'A summary 漢🙂' })
        expect(parts.filter((part) => part.kind === 'tool').filter((part) => part.phase === 'delta').map((part) => part.text).join('')).toBe('{"path":"README.md"}')
        expect(parts.at(-1)).toMatchObject({ kind: 'tool', phase: 'end', callID: 'call_1' })
        expect(body.model).toBe(model.model)
        expect(body.stream).toBe(true)
        expect(adapter === 'openai' ? body.instructions : body.system).toContain('Be concise')
        expect(auth).toBe(adapter === 'openai' ? `Bearer ${credential}` : credential)
        if (adapter === 'openai') expect(body.store).toBe(false)
      } finally { server.stop(true) }
    })
  }

  test.each([401, 429, 500, 413])('HTTP %s is classified without echoing the response body', async (status) => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      return Response.json({ error: { message: credential } }, { status })
    } })
    try {
      let error: any
      try { await new OpenAIProvider(options(server.url.href.replace(/\/$/, ''))).stream(request(), () => {}) } catch (caught) { error = caught }
      expect(error.message).not.toContain(credential)
      expect(error.code).toBe(status === 413 ? 'context_overflow' : status === 401 ? 'provider_authentication' : 'provider_http')
      expect(error.retryable).toBe(status === 429 || status === 500)
    } finally { server.stop(true) }
  })

  test('a stream ending without its terminal event is a retryable truncation', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      return new Response(frame(openAIEvents[5]!), { headers: { 'content-type': 'text/event-stream' } })
    } })
    try {
      await expect(new OpenAIProvider(options(server.url.href.replace(/\/$/, ''))).stream(request(), () => {}))
        .rejects.toMatchObject({ code: 'stream_truncated', retryable: true })
    } finally { server.stop(true) }
  })

  test('cancellation ends a provider that has not produced output', async () => {
    let connected = false
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      connected = true
      return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(': heartbeat\n\n')) } }),
        { headers: { 'content-type': 'text/event-stream' } })
    } })
    const controller = new AbortController()
    try {
      const pending = new OpenAIProvider(options(server.url.href.replace(/\/$/, ''))).stream(request(controller.signal), () => {})
      await until(() => connected)
      controller.abort()
      await expect(pending).rejects.toMatchObject({ code: 'cancelled' })
    } finally { server.stop(true) }
  })
})

describe('catalog and local policy', () => {
  const config: ProvidersConfig = { defaultModel: 'remote/chat', providers: [{ id: 'remote', adapter: 'openai', models: [model] }] }
  test('catalog identity differs from the provider model id; credentials never appear in the catalog', () => {
    const catalog = new ProviderCatalog(config, { OPENAI_API_KEY: credential })
    expect(catalog.models().map((m) => m.id)).toEqual(['local/echo', 'remote/chat'])
    expect(catalog.resolve().model).toBe('remote/chat')
    expect(JSON.stringify(catalog.models())).not.toContain(credential)
    expect(JSON.stringify(catalog.models())).not.toContain(model.model)
  })
  test('last matching policy wins and denial takes precedence over missing credentials', async () => {
    const catalog = new ProviderCatalog({ ...config, policy: [
      { provider: '*', action: 'deny' }, { provider: 'local', action: 'allow' },
    ] }, {})
    expect(catalog.models()[0]!.reason).toBeNull()
    expect(catalog.models()[1]!.reason).toBe('provider_denied')
    await expect(catalog.resolve().stream(request(), () => {})).rejects.toMatchObject({ code: 'provider_denied' })
  })
  test('missing credentials and removed models fail explicitly', async () => {
    const catalog = new ProviderCatalog(config, {})
    expect(catalog.models()[1]!.reason).toBe('credentials_missing')
    await expect(catalog.resolve().stream(request(), () => {})).rejects.toMatchObject({ code: 'credentials_missing' })
    await expect(catalog.resolve('removed/chat').stream(request(), () => {})).rejects.toMatchObject({ code: 'model_unavailable' })
  })
  test('legacy prompts without a model stay local when a remote default is configured', async () => {
    const store = Store.open(':memory:')
    store.migrate()
    const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
    const session = sessions.create({})
    sessions.prompt(session.id, { text: 'admitted before model selection' })
    const catalog = new ProviderCatalog(config, {})
    const steps = new Steps(store, silentLogger(), { provider: catalog.resolve(), selectProvider: (id) => catalog.resolve(id) })
    try {
      const step = steps.start(session.id)!
      await until(() => store.step(step.id)?.status === 'succeeded')
      expect(store.step(step.id)?.model).toBe('local/echo')
    } finally { steps.stopAll(); store.close() }
  })
  test.each([
    { providers: [{ id: 'remote', adapter: 'unknown', models: [model] }] },
    { ...config, defaultModel: 'unknown' },
    { providers: [{ id: 'remote', adapter: 'openai', models: [{ ...model, reservedOutput: 999999 }] }] },
    { providers: [{ id: 'remote', adapter: 'openai', baseURL: `https://user:${credential}@example.com`, models: [model] }] },
  ])('invalid configuration is rejected without exposing its contents', (value) => {
    let error: any
    try { new ProviderCatalog(value as ProvidersConfig, {}) } catch (caught) { error = caught }
    expect(error.code).toBe('provider_configuration')
    expect(error.message).not.toContain(credential)
  })
})

describe('provider daemon integration', () => {
  test('HTTP streaming is visible before completion; model choice and parts survive restart', async () => {
    const home = tempHome()
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let calls = 0
    const upstream = Bun.serve({ port: 0, hostname: '127.0.0.1', async fetch(req) {
      calls++
      expect(req.headers.get('authorization')).toBe(`Bearer ${credential}`)
      expect((await req.json()).model).toBe(model.model)
      return new Response(new ReadableStream({ async start(controller) {
        for (const event of openAIEvents.slice(0, 6)) controller.enqueue(new TextEncoder().encode(frame(event)))
        await gate
        for (const event of openAIEvents.slice(6)) controller.enqueue(new TextEncoder().encode(frame(event)))
        controller.close()
      } }), { headers: { 'content-type': 'text/event-stream' } })
    } })
    writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'remote/chat', providers: [{
      id: 'remote', adapter: 'openai', apiKeyEnv: 'HIROSHI_TEST_KEY', baseURL: upstream.url.href.replace(/\/$/, ''), models: [model],
    }] }))
    const daemon = await startDaemon({ home, env: { HIROSHI_TEST_KEY: credential } })
    let restarted: Awaited<ReturnType<typeof startDaemon>> | undefined
    const feedAbort = new AbortController()
    let feedDone: Promise<void> | undefined
    try {
      expect((await daemon.client.models()).defaultModel).toBe('remote/chat')
      const { session } = await daemon.client.createSession({})
      const initial = await daemon.client.session({ id: session.id })
      let live = hydrate(initialSnapshot(), initial)
      feedDone = daemon.client.feed({ after: initial.seq, signal: feedAbort.signal,
        onEvent: (event) => { live = apply(live, event) } }).catch(() => {})
      const { item } = await daemon.client.prompt({ id: session.id, text: 'Read it', model: 'remote/chat', key: 'one' })
      expect(item.model).toBe('remote/chat')
      const duplicate = await daemon.client.prompt({ id: session.id, text: 'changed', model: 'unknown', key: 'one' })
      expect(duplicate.item.id).toBe(item.id)
      expect(duplicate.item.model).toBe('remote/chat')
      await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.output === 'Hello ')
      const partial = await daemon.client.session({ id: session.id })
      await until(() => live.parts.length === partial.parts.length && live.steps[0]?.output === 'Hello ')
      expect(partial.steps[0]!.status).toBe('running')
      expect(partial.parts.length).toBeGreaterThan(0)
      expect(engineTranscript(hydrate(initialSnapshot(), partial)).some((turn) => turn.kind === 'markdown' && turn.source === 'Hello ')).toBe(true)
      release()
      await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
      const finished = await daemon.client.session({ id: session.id })
      await until(() => live.steps[0]?.status === 'succeeded')
      expect(live.parts).toEqual(finished.parts)
      expect(finished.steps[0]!.model).toBe('remote/chat')
      expect(finished.steps[0]!.output).toBe('Hello world')
      expect(finished.messages.filter((m) => m.role === 'assistant')).toHaveLength(1)
      expect(finished.parts.filter((part) => part.kind === 'tool')).toHaveLength(4)
      expect(engineTranscript(hydrate(initialSnapshot(), finished)).filter((turn) => turn.kind === 'markdown' && turn.source === 'Hello world')).toHaveLength(1)
      expect(JSON.stringify(finished)).not.toContain(credential)
      expect(JSON.stringify(finished)).not.toContain(model.model)
      expect(readFileSync(daemon.paths.log, 'utf8')).not.toContain(credential)
      await daemon.crash()
      restarted = await startDaemon({ home, env: { HIROSHI_TEST_KEY: credential } })
      const restored = await restarted.client.session({ id: session.id })
      expect(restored.parts).toEqual(finished.parts)
      expect(restored.messages).toEqual(finished.messages)
      expect(calls).toBe(1)
    } finally { feedAbort.abort(); await feedDone; release(); upstream.stop(true); await (restarted ?? daemon).stop() }
  }, 60_000)

  test('a crash after reasoning but before text preserves the parts and never replays the call', async () => {
    const home = tempHome()
    let calls = 0
    let release!: () => void
    let cancelled = false
    const gate = new Promise<void>((resolve) => { release = resolve })
    const upstream = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() {
      calls++
      return new Response(new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode(frame(openAIEvents[0]!)))
          await gate
          if (!cancelled) controller.close()
        },
        cancel() { cancelled = true; release() },
      }), { headers: { 'content-type': 'text/event-stream' } })
    } })
    writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'remote/chat', providers: [{
      id: 'remote', adapter: 'openai', apiKeyEnv: 'HIROSHI_TEST_KEY', baseURL: upstream.url.href.replace(/\/$/, ''), models: [model],
    }] }))
    const daemon = await startDaemon({ home, env: { HIROSHI_TEST_KEY: credential } })
    let restarted: Awaited<ReturnType<typeof startDaemon>> | undefined
    try {
      const { session } = await daemon.client.createSession({})
      await daemon.client.prompt({ id: session.id, text: 'go' })
      await until(async () => (await daemon.client.session({ id: session.id })).parts.length === 1)
      const before = await daemon.client.session({ id: session.id })
      expect(before.steps[0]!.output).toBe('')
      await daemon.crash()
      restarted = await startDaemon({ home, env: { HIROSHI_TEST_KEY: credential } })
      const after = await restarted.client.session({ id: session.id })
      expect(after.steps[0]!.error?.code).toBe('engine_restart_mid_stream')
      expect(after.parts).toEqual(before.parts)
      expect(calls).toBe(1)
    } finally { release(); upstream.stop(true); await (restarted ?? daemon).stop() }
  }, 60_000)

  test('denied providers receive no requests and their denial appears in the cockpit transcript', async () => {
    const home = tempHome()
    let calls = 0
    const upstream = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch() { calls++; return new Response('unexpected') } })
    writeFileSync(join(home, 'providers.json'), JSON.stringify({ providers: [{
      id: 'remote', adapter: 'anthropic', baseURL: upstream.url.href.replace(/\/$/, ''), models: [model],
    }], policy: [{ provider: 'remote', action: 'deny' }] }))
    const daemon = await startDaemon({ home })
    try {
      expect((await daemon.client.models()).models.find((m) => m.id === 'remote/chat')?.reason).toBe('provider_denied')
      const { session } = await daemon.client.createSession({})
      await daemon.client.prompt({ id: session.id, text: 'go', model: 'remote/chat' })
      await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'failed')
      const detail = await daemon.client.session({ id: session.id })
      expect(detail.steps[0]!.error?.code).toBe('provider_denied')
      expect(JSON.stringify(engineTranscript(hydrate(initialSnapshot(), detail)))).toContain('provider_denied')
      expect(calls).toBe(0)
      await expect(daemon.client.prompt({ id: session.id, text: 'bad', model: 'unknown' })).rejects.toMatchObject({ code: 'unknown_model' })
    } finally { upstream.stop(true); await daemon.stop() }
  }, 60_000)
})
