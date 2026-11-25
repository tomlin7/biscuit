/** Pin HTTP daemon requests to their own loopback origin. On Bun 1.3.5 an
 * empty proxy option still inherits HTTP_PROXY. An explicit origin routes the
 * connection directly to our server, using HTTP absolute-form request targets
 * (accepted by Bun.serve), without an external proxy or environment changes.
 * Disable socket reuse here: this Bun release can mis-reuse proxy connections.
 * Keep native fetch for streaming, cancellation and error response handling. */
export const daemonFetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname.toLowerCase())
  return fetch(input, typeof Bun !== 'undefined' && local ? { ...init, proxy: url.origin, redirect: 'manual', keepalive: false } : init)
}) as typeof fetch
