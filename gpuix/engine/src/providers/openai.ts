import { ProviderError, type Provider, type ProviderRequest, type ProviderPart, type RemoteModelOptions } from '../provider'
import { openAIHistory, openAITools } from './history'
import { eventString, streamFailure, streamJSON, tokenCount } from './stream'

/** https://developers.openai.com/api/reference/resources/responses/streaming-events */
export class OpenAIProvider implements Provider {
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
    const calls = new Map<string, { id: string; name: string }>()
    await streamJSON(`${this.#options.baseURL}/responses`, { authorization: `Bearer ${this.#options.apiKey}` }, {
      model: this.#options.providerModel,
      input: openAIHistory(request.messages),
      ...(request.tools.length ? { tools: openAITools(request.tools), parallel_tool_calls: false } : {}),
      instructions: request.instructions.map((s) => s.text).join('\n\n'),
      max_output_tokens: request.reservedOutput, stream: true, store: false,
      include: ['reasoning.encrypted_content'],
    }, request.signal, (event) => {
      if (completed) return false
      switch (event.type) {
        case 'response.output_text.delta':
        case 'response.refusal.delta':
          onText(eventString(event.delta))
          break
        case 'response.reasoning_summary_text.delta':
          onPart?.({ kind: 'reasoning', text: eventString(event.delta) })
          break
        case 'response.output_item.added':
          if (event.item?.type === 'function_call') {
            const call = { id: eventString(event.item.call_id), name: eventString(event.item.name) }
            calls.set(eventString(event.item.id), call)
            onPart?.({ kind: 'tool', phase: 'start', callID: call.id, name: call.name, text: '' })
          }
          break
        case 'response.function_call_arguments.delta': {
          const call = calls.get(eventString(event.item_id))
          if (!call) throw new ProviderError('provider_protocol', 'tool delta arrived without a tool item')
          onPart?.({ kind: 'tool', phase: 'delta', callID: call.id, text: eventString(event.delta) })
          break
        }
        case 'response.output_item.done':
          if (event.item?.type === 'reasoning') onPart?.({ kind: 'state', provider: 'openai', text: JSON.stringify(event.item) })
          if (event.item?.type === 'function_call') {
            const itemID = eventString(event.item.id)
            const call = calls.get(itemID)
            if (!call) throw new ProviderError('provider_protocol', 'tool completion arrived without a tool item')
            onPart?.({ kind: 'tool', phase: 'end', callID: call.id, name: call.name, text: '' })
            calls.delete(itemID)
          }
          break
        case 'response.completed':
          if (calls.size) throw new ProviderError('provider_protocol', 'the provider completed with unfinished tool arguments')
          if (event.response?.usage) {
            const usage = event.response.usage
            onPart?.({ kind: 'usage', inputTokens: tokenCount(usage.input_tokens), outputTokens: tokenCount(usage.output_tokens),
              cachedInputTokens: tokenCount(usage.input_tokens_details?.cached_tokens), reasoningTokens: tokenCount(usage.output_tokens_details?.reasoning_tokens) })
          }
          completed = true
          break
        case 'response.failed':
        case 'error':
          throw streamFailure(event.response?.error?.code ?? event.code)
        case 'response.incomplete':
          throw new ProviderError('provider_incomplete', 'the provider ended before completing the response')
      }
      return !completed
    })
    if (!completed) throw new ProviderError('stream_truncated', 'the provider stream ended without a completion event', { retryable: true })
  }
}
