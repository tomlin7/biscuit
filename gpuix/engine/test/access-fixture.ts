/** A loopback HTTP model that requests real tools and independently reviews them. */
export function accessFixture() {
  const requests: any[] = [], reviews: any[] = []
  let review: 'allow' | 'ask' | 'invalid' | 'error' | 'hold' | 'tool' = 'allow'
  let holdTurns = false, releaseTurn = () => {}, releaseReview = () => {}
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(req) {
    const body: any = await req.json(); requests.push(body)
    const isReview = body.instructions?.includes('action reviewer')
    const frame = (value: object) => `data: ${JSON.stringify(value)}\n\n`
    const answer = (text: string) => new Response([
      frame({ type: 'response.output_text.delta', delta: text }),
      frame({ type: 'response.completed', response: { usage: { input_tokens: 13, output_tokens: 4 } } }),
    ].join(''), { headers: { 'content-type': 'text/event-stream' } })
    if (isReview) {
      reviews.push(body)
      if (review === 'hold') await new Promise<void>((resolve) => { releaseReview = resolve })
      if (review === 'error') return Response.json({ error: 'private-fixture-secret' }, { status: 401 })
      if (review === 'tool') return new Response(frame({ type: 'response.output_item.added', item: { type: 'function_call', id: 'bad', call_id: 'bad', name: 'shell' } }), { headers: { 'content-type': 'text/event-stream' } })
      return answer(review === 'invalid' ? 'private-fixture-secret malformed review' : JSON.stringify({ decision: review === 'ask' ? 'ask' : 'allow' }))
    }
    if (holdTurns) await new Promise<void>((resolve) => { releaseTurn = resolve })
    const history = body.input, last = history.findLastIndex((item: any) => item.role === 'user')
    if (history.slice(last + 1).some((item: any) => item.type === 'function_call_output')) return answer('The real tool result was received.')
    const content = history[last].content
    const text = typeof content === 'string' ? content : content.map((part: any) => part.text ?? '').join('')
    const command = JSON.parse(text), id = `call_${requests.length}`
    return new Response([
      frame({ type: 'response.output_item.added', item: { type: 'function_call', id, call_id: id, name: command.tool } }),
      frame({ type: 'response.function_call_arguments.delta', item_id: id, delta: JSON.stringify(command.input) }),
      frame({ type: 'response.output_item.done', item: { type: 'function_call', id, call_id: id, name: command.tool } }),
      frame({ type: 'response.completed', response: { usage: { input_tokens: 17, output_tokens: 6 } } }),
    ].join(''), { headers: { 'content-type': 'text/event-stream' } })
  } })
  return { server, requests, reviews,
    setReview: (value: typeof review) => { review = value },
    holdTurns: () => { holdTurns = true }, releaseTurn: () => { holdTurns = false; releaseTurn() }, releaseReview: () => releaseReview(),
    provider: { id: 'fixture', adapter: 'openai', apiKeyEnv: 'HIROSHI_ACCESS_TEST_KEY', baseURL: server.url.href,
      models: [{ id: 'tools', model: 'fixture', label: 'Approval fixture', contextWindow: 32768, reservedOutput: 1024 }] } }
}
