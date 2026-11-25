/**
 * The local provider: the seam's built-in, deterministic answer.
 *
 * It is not a model. It echoes the newest prompt back in a sentence, which is
 * enough to exercise the whole step lifecycle — a durable claim, a streamed
 * answer, an assistant message — on a machine with no credentials. `delayMs`
 * waits before every chunk; tests use it to hold a step open across a crash,
 * and it doubles as a way to watch a stream arrive in the cockpit.
 *
 * Remote adapters implement the same `Provider` interface.
 */

import { ProviderError, type Provider, type ProviderRequest } from '../provider'

export interface LocalProviderOptions {
  /** Milliseconds before every chunk. Zero streams as fast as the loop allows. */
  delayMs?: number
  /** Characters per streamed chunk. */
  chunkSize?: number
}

const DEFAULT_CHUNK = 24

export class LocalProvider implements Provider {
  readonly name = 'local'
  readonly model = 'local/echo'
  readonly #delayMs: number
  readonly #chunkSize: number

  constructor(options: LocalProviderOptions = {}) {
    this.#delayMs = Math.max(0, options.delayMs ?? 0)
    this.#chunkSize = Math.max(1, options.chunkSize ?? DEFAULT_CHUNK)
  }

  async stream(request: ProviderRequest, onText: (text: string) => void): Promise<void> {
    const text = replyFor(request)

    for (let index = 0; index < text.length; index += this.#chunkSize) {
      await this.#wait(request.signal)
      if (request.signal.aborted) {
        throw new ProviderError('cancelled', 'the step was stopped', { retryable: false })
      }
      onText(text.slice(index, index + this.#chunkSize))
    }
  }

  #wait(signal: AbortSignal): Promise<void> {
    if (this.#delayMs <= 0 || signal.aborted) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = setTimeout(done, this.#delayMs)
      function done(): void {
        clearTimeout(timer)
        signal.removeEventListener('abort', done)
        resolve()
      }
      signal.addEventListener('abort', done, { once: true })
    })
  }
}

function replyFor(request: ProviderRequest): string {
  const last = [...request.messages].reverse().find((message) => message.role === 'user')
  if (!last) return 'The local provider has nothing to answer yet.'
  const firstLine = last.text.split(/\r?\n/, 1)[0]!.trim()
  const excerpt = firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine
  return `The local provider received: ${excerpt}`
}
