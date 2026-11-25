import { ProviderError, type Provider, type ProviderRequest, type ProviderPart, type RemoteModelOptions } from '../provider'
import { anthropicHistory, anthropicTools } from './history'
import { eventString, streamFailure, streamJSON, tokenCount } from './stream'

/** https://platform.claude.com/docs/en/build-with-claude/streaming */
export class AnthropicProvider implements Provider {
  readonly name: string
  readonly model: string
  readonly context: RemoteModelOptions['context']
  readonly #options: RemoteModelOptions
  constructor(options: RemoteModelOptions) {
    this.#options = options
    this.name = options.name
    this.model = options.model
    this.context = options.context
  }

  async stream(request: ProviderRequest, onText: (text: string) => void, onPart?: (part: ProviderPart) => void): Promise<void> {
    let completed = false
    const thinking = new Map<number, { thinking: string; signature: string }>()
    const calls = new Map<number, { id: string; name: string }>()
    await streamJSON(`${this.#options.baseURL}/messages`, {
      'x-api-key': this.#options.apiKey, 'anthropic-version': '2023-06-01',
    }, {
      model: this.#options.providerModel,
      system: [...request.instructions.map((s) => s.text), ...request.messages.filter((m) => m.role === 'system').map((m) => m.text)].join('\n\n'),
      messages: anthropicHistory(request.messages),
      ...(request.tools.length ? { tools: anthropicTools(request.tools) } : {}),
      max_tokens: request.reservedOutput, stream: true,
    }, request.signal, (event) => {
      if (completed) return false
      const usage = event.type === 'message_start' ? event.message?.usage : event.type === 'message_delta' ? event.usage : null
      if (usage) {
        const input = tokenCount(usage.input_tokens)
        const cacheRead = tokenCount(usage.cache_read_input_tokens) ?? 0
        const cacheWrite = tokenCount(usage.cache_creation_input_tokens) ?? 0
        onPart?.({ kind: 'usage', inputTokens: input === undefined ? undefined : input + cacheRead + cacheWrite, outputTokens: tokenCount(usage.output_tokens),
          ...(input === undefined ? {} : { cachedInputTokens: cacheRead, cacheWriteTokens: cacheWrite }) })
      }
      if (event.type === 'content_block_start' && event.content_block?.type === 'thinking') {
        thinking.set(event.index, { thinking: event.content_block.thinking ?? '', signature: '' })
      }
      if (event.type === 'content_block_start' && event.content_block?.type === 'redacted_thinking') {
        onPart?.({ kind: 'state', provider: 'anthropic', text: JSON.stringify(event.content_block) })
      }
      if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        const call = { id: eventString(event.content_block.id), name: eventString(event.content_block.name) }
        calls.set(event.index, call)
        onPart?.({ kind: 'tool', phase: 'start', callID: call.id, name: call.name, text: '' })
      }
      if (event.type === 'content_block_delta') {
        const delta = event.delta
        if (delta?.type === 'text_delta') onText(eventString(delta.text))
        if (delta?.type === 'thinking_delta') {
          const text = eventString(delta.thinking)
          onPart?.({ kind: 'reasoning', text })
          const state = thinking.get(event.index)
          if (state) state.thinking += text
        }
        if (delta?.type === 'signature_delta') {
          const state = thinking.get(event.index)
          if (state) state.signature += eventString(delta.signature)
        }
        if (delta?.type === 'input_json_delta') {
          const call = calls.get(event.index)
          if (!call) throw new ProviderError('provider_protocol', 'tool delta arrived without a tool block')
          onPart?.({ kind: 'tool', phase: 'delta', callID: call.id, text: eventString(delta.partial_json) })
        }
      }
      if (event.type === 'content_block_stop') {
        const state = thinking.get(event.index)
        if (state) {
          onPart?.({ kind: 'state', provider: 'anthropic', text: JSON.stringify({ type: 'thinking', ...state }) })
          thinking.delete(event.index)
        }
        const call = calls.get(event.index)
        if (call) { onPart?.({ kind: 'tool', phase: 'end', callID: call.id, name: call.name, text: '' }); calls.delete(event.index) }
      }
      if (event.type === 'error') throw streamFailure(event.error?.type)
      if (event.type === 'message_delta' && event.delta?.stop_reason === 'max_tokens') {
        throw new ProviderError('provider_incomplete', 'the provider reached the reserved output limit')
      }
      if (event.type === 'message_stop') {
        if (calls.size) throw new ProviderError('provider_protocol', 'the provider completed with unfinished tool arguments')
        completed = true
      }
      return !completed
    })
    if (!completed) throw new ProviderError('stream_truncated', 'the provider stream ended without a completion event', { retryable: true })
  }
}
