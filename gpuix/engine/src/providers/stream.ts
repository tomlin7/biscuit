/** Bounded SSE transport shared by adapters; no response body enters errors. */
import { ProviderError } from '../provider'

/** Missing or malformed counts remain unknown rather than becoming zero. */
export function tokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

export function eventString(value: unknown): string {
  if (typeof value !== 'string') throw new ProviderError('provider_protocol', 'a provider event is missing a string field')
  return value
}

export function streamFailure(code: unknown): ProviderError {
  if (['context_length_exceeded', 'context_overflow', 'request_too_large'].includes(String(code))) {
    return new ProviderError('context_overflow', 'the provider rejected the context size')
  }
  return new ProviderError('provider_failed', 'the provider reported a failed response', {
    retryable: ['rate_limit_exceeded', 'rate_limit_error', 'overloaded_error', 'server_error'].includes(String(code)),
  })
}

export async function streamJSON(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
  onEvent: (event: Record<string, any>) => boolean | void,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
      redirect: 'error',
    })
  } catch {
    throw new ProviderError(signal.aborted ? 'cancelled' : 'provider_transport', 'the provider connection failed', { retryable: !signal.aborted })
  }
  if (!response.ok) {
    // Only inspect the error classification. Providers may echo secrets or
    // prompt text in their message, so never forward that message to the log.
    let code = ''
    try {
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let body = ''
      while (reader && body.length < 16384) {
        const next = await reader.read()
        if (next.done) break
        body += decoder.decode(next.value.slice(0, 16384 - body.length), { stream: true })
      }
      await reader?.cancel()
      const error = JSON.parse(body)
      code = String(error.error?.code ?? error.error?.type ?? '')
    } catch { /* A status code is enough to classify an unknown error. */ }
    if (['context_length_exceeded', 'request_too_large', 'context_overflow'].includes(code) || response.status === 413) {
      throw new ProviderError('context_overflow', 'the provider rejected the context size')
    }
    throw new ProviderError(
      response.status === 401 || response.status === 403 ? 'provider_authentication' : 'provider_http',
      `the provider returned HTTP ${response.status}`,
      { retryable: response.status === 429 || response.status >= 500 },
    )
  }
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    await response.body?.cancel()
    throw new ProviderError('provider_protocol', 'the provider did not return an event stream')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let ended = false
  const frame = (value: string) => {
    const data = value.split('\n').filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart()).join('\n')
    if (!data || data === '[DONE]') return
    let event: Record<string, any>
    try { event = JSON.parse(data) } catch { throw new ProviderError('provider_protocol', 'invalid provider event JSON') }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      throw new ProviderError('provider_protocol', 'invalid provider event shape')
    }
    if (onEvent(event) === false) ended = true
  }
  try {
    for (;;) {
      const next = await reader.read()
      buffer = (buffer + decoder.decode(next.value, { stream: !next.done })).replace(/\r\n/g, '\n')
      if (buffer.length > 1024 * 1024) throw new ProviderError('provider_protocol', 'the provider event exceeded the buffer limit')
      let edge: number
      while (!ended && (edge = buffer.indexOf('\n\n')) !== -1) {
        frame(buffer.slice(0, edge))
        buffer = buffer.slice(edge + 2)
      }
      if (ended) break
      if (next.done) { if (buffer.trim()) frame(buffer); break }
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error
    throw new ProviderError(signal.aborted ? 'cancelled' : 'provider_transport', 'the provider stream disconnected', { retryable: !signal.aborted })
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
