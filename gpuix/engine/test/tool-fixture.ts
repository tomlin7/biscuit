/** A local provider that requests real tools, then checks their protocol results. */
export function toolFixture(adapter: 'openai' | 'anthropic' = 'openai', retryOnce = false) {
  const requests: any[] = []
  const frame = (value: object) => `data: ${JSON.stringify(value)}\n\n`
  const server = Bun.serve({ port: 0, hostname: '127.0.0.1', async fetch(req) {
    const body: any = await req.json()
    requests.push(body)
    if (retryOnce && requests.length === 1) return Response.json({ error: { type: 'rate_limit_error' } }, { status: 429 })
    const history = adapter === 'openai' ? body.input : body.messages
    const userIndex = history.findLastIndex((item: any) => item.role === 'user' &&
      (typeof item.content === 'string' || item.content?.some((part: any) => part.type === 'text')))
    const user = history[userIndex]
    const prompt = typeof user?.content === 'string' ? user.content : user?.content?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ') ?? ''
    const result = adapter === 'openai' ? history.slice(userIndex + 1).find((item: any) => item.type === 'function_call_output')
      : history.slice(userIndex).flatMap((item: any) => item.content ?? []).findLast((part: any) => part.type === 'tool_result')
    let events: object[]
    if (result) {
      const text = `Tool turn complete: ${prompt}`
      events = adapter === 'openai' ? [{ type: 'response.output_text.delta', delta: text }, { type: 'response.completed' }]
        : [{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }, { type: 'message_stop' }]
    } else {
      const name = prompt.includes('huge') ? 'read_file' : (prompt.includes('crash') || prompt.includes('model-shell')) ? 'shell' : 'write_file'
      const input = name === 'read_file' ? { path: 'huge.txt' } : name === 'shell' ? { command: prompt.includes('model-shell') ? 'echo model-shell-marker' : 'echo crash-marker', timeoutMs: 30000 }
        : { path: prompt.includes('deny') ? 'denied.txt' : 'approved.txt', content: 'approved from the model' }
      const id = `fixture_${requests.length}`
      events = adapter === 'openai' ? [
        { type: 'response.reasoning_summary_text.delta', delta: 'Use the declared tool.' },
        { type: 'response.output_item.done', item: { type: 'reasoning', id: `reason_${id}`, encrypted_content: 'opaque-reasoning', summary: [] } },
        { type: 'response.output_item.added', item: { type: 'function_call', id, call_id: id, name } },
        { type: 'response.function_call_arguments.delta', item_id: id, delta: JSON.stringify(input) },
        { type: 'response.output_item.done', item: { type: 'function_call', id, call_id: id, name } }, { type: 'response.completed' },
      ] : [
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Use the declared tool.' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'opaque-signature' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id, name, input: {} } },
        { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) } },
        { type: 'content_block_stop', index: 1 }, { type: 'message_stop' },
      ]
    }
    if (adapter === 'openai') {
      events = events.map((event: any) => event.type === 'response.completed' ? { ...event, response: { usage: { input_tokens: 120, output_tokens: 30 } } } : event)
    } else {
      events.unshift({ type: 'message_start', message: { usage: { input_tokens: 100, cache_read_input_tokens: 15, cache_creation_input_tokens: 5, output_tokens: 0 } } })
      events.splice(events.length - 1, 0, { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 30 } })
    }
    return new Response(events.map(frame).join(''), { headers: { 'content-type': 'text/event-stream' } })
  } })
  const provider = { id: 'fixture', adapter, apiKeyEnv: 'HIROSHI_TOOL_FIXTURE_KEY', baseURL: server.url.href.replace(/\/$/, ''),
    models: [{ id: 'tools', model: 'tool-fixture', label: 'Tool fixture', contextWindow: 131072, reservedOutput: 1024 }] }
  return { server, requests, provider }
}
