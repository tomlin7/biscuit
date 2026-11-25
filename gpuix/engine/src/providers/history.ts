import type { Message, ToolDefinition } from '../protocol'

export function openAIHistory(messages: Message[]): unknown[] {
  return messages.flatMap((message): unknown[] => {
    if (message.toolResult) return [{ type: 'function_call_output', call_id: message.toolResult.callID, output: message.text }]
    const items: unknown[] = message.text ? [{ role: message.role, content: message.text }] : []
    for (const state of message.providerState ?? []) if (state.provider === 'openai') items.push(state.value)
    for (const call of message.toolCalls ?? []) items.push({ type: 'function_call', call_id: call.id, name: call.name, arguments: call.arguments })
    return items
  })
}

export function anthropicHistory(messages: Message[]): { role: 'user' | 'assistant'; content: unknown[] }[] {
  const result: { role: 'user' | 'assistant'; content: unknown[] }[] = []
  for (const message of messages) {
    if (message.role === 'system') continue
    const role = message.role === 'assistant' ? 'assistant' : 'user'
    const content: unknown[] = []
    for (const state of message.providerState ?? []) if (state.provider === 'anthropic') content.push(state.value)
    if (message.toolResult) {
      content.push({ type: 'tool_result', tool_use_id: message.toolResult.callID, content: message.text,
        is_error: ['failed', 'cancelled', 'interrupted'].includes(message.toolResult.status) })
    } else {
      if (message.text) content.push({ type: 'text', text: message.text })
      for (const call of message.toolCalls ?? []) {
        let input: unknown
        try { input = JSON.parse(call.arguments) } catch { input = {} }
        content.push({ type: 'tool_use', id: call.id, name: call.name, input })
      }
    }
    if (!content.length) continue
    const previous = result.at(-1)
    if (previous?.role === role) previous.content.push(...content)
    else result.push({ role, content })
  }
  return result
}

export function openAITools(tools: unknown[]): unknown[] {
  return (tools as ToolDefinition[]).map((tool) => ({ type: 'function', name: tool.name,
    description: tool.description, parameters: tool.inputSchema, strict: false }))
}

export function anthropicTools(tools: unknown[]): unknown[] {
  return (tools as ToolDefinition[]).map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema }))
}
