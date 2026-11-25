/**
 * The generated client for the engine.
 *
 * The transport below owns the one `fetch`. Above it, the surface is built by
 * walking the operations table in the shape module: no command hand writes a
 * path or a fetch, and the daemon routes on the same rows this client builds
 * its URLs from, so a route cannot exist on one side and not the other.
 *
 * Plain `fetch`, one runtime import (the table itself): the cockpit uses it,
 * the tests use it, and a browser build can carry it without dragging a
 * process API along.
 */

import {
  FEED_HELLO,
  FEED_OVERFLOW,
  FEED_PATH,
  operations,
  type EngineEvent,
  type FeedHello,
  type FeedOverflow,
  type NoInput,
  type Operation,
  type OperationName,
  type OperationRequest,
  type OperationResponse,
} from '../../engine/src/protocol'
import { daemonFetch } from '../../engine/src/local-transport'

export interface EngineConnection {
  url: string
  token: string
}

export class EngineRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'EngineRequestError'
  }
}

export interface FeedOptions {
  after: number
  signal?: AbortSignal
  onEvent: (event: EngineEvent) => void
  onOpen?: () => void
  /** The daemon's durable edge when the connection opened. */
  onWatermark?: (lastSeq: number) => void
  onOverflow?: (reason: string) => void
}

/** One method per operation, named after the row that declares it. */
export type EngineSurface = {
  [Name in OperationName]: OperationRequest<Name> extends NoInput
    ? () => Promise<OperationResponse<Name>>
    : (input: OperationRequest<Name>) => Promise<OperationResponse<Name>>
}

const REQUEST_TIMEOUT_MS = 15_000

/** URL, token, one request, and the feed's stream reader. */
class EngineTransport {
  readonly url: string
  readonly token: string
  readonly #fetch: typeof fetch

  constructor(connection: EngineConnection, fetchImpl: typeof fetch = daemonFetch) {
    this.url = connection.url.replace(/\/+$/, '')
    this.token = connection.token
    this.#fetch = fetchImpl
  }

  get connection(): EngineConnection {
    return { url: this.url, token: this.token }
  }

  #headers(): Record<string, string> {
    return { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }
  }

  /**
   * Turn one table row and one request into one HTTP call.
   *
   * The path template names the fields it consumes (`:id`); whatever the
   * request has left over is the body. That is the whole convention, and it is
   * why a command's path is declared only in the shape module.
   */
  async send<Name extends OperationName>(
    operation: Operation<Name>,
    input: OperationRequest<Name>,
  ): Promise<OperationResponse<Name>> {
    const fields: Record<string, unknown> = { ...(input as Record<string, unknown>) }
    let path = operation.path
    for (const segment of operation.path.split('/')) {
      if (!segment.startsWith(':')) continue
      const name = segment.slice(1)
      path = path.replace(segment, encodeURIComponent(String(fields[name] ?? '')))
      delete fields[name]
    }

    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await this.#fetch(`${this.url}${path}`, {
        method: operation.method,
        headers: this.#headers(),
        body: operation.method === 'GET' ? undefined : JSON.stringify(fields),
        signal,
      })
    } catch (error) {
      throw new EngineRequestError(0, 'unreachable', `the engine did not answer: ${String(error)}`)
    }

    const text = await response.text()
    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }

    if (!response.ok) {
      const code = parsed?.error?.code ?? 'request_failed'
      const message = parsed?.error?.message ?? `${operation.method} ${path} failed with ${response.status}`
      throw new EngineRequestError(response.status, code, message)
    }

    return parsed as OperationResponse<Name>
  }

  /**
   * Follow the durable feed from `after` until the stream ends.
   *
   * Resolves when the daemon closes the connection (a slow client, a
   * shutdown) or the caller aborts. The caller decides how to reconnect: the
   * engine keeps the sequence numbers, so a reconnect resumes exactly where
   * the last received event left off.
   */
  async feed(options: FeedOptions): Promise<void> {
    let response: Response
    try {
      response = await this.#fetch(`${this.url}${FEED_PATH}?after=${options.after}`, {
        headers: { authorization: `Bearer ${this.token}`, accept: 'text/event-stream' },
        signal: options.signal,
      })
    } catch (error) {
      if (options.signal?.aborted) return
      throw new EngineRequestError(0, 'unreachable', `the engine feed did not open: ${String(error)}`)
    }

    if (!response.ok || !response.body) {
      throw new EngineRequestError(response.status, 'feed_failed', `the engine feed answered ${response.status}`)
    }

    options.onOpen?.()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const frame = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          this.#dispatch(frame, options)
          boundary = buffer.indexOf('\n\n')
        }
      }
    } catch (error) {
      // An aborted feed is a feed the caller meant to close.
      if (options.signal?.aborted) return
      // A frame the client cannot use ends this connection; close the socket
      // instead of leaving the daemon feeding a reader nobody owns.
      await reader.cancel().catch(() => {})
      throw error
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // Already released.
      }
    }
  }

  /**
   * One SSE frame, routed by name.
   *
   * An event frame has no name. `hello` is the feed's watermark, `overflow`
   * is the feed closing this connection because the reader fell behind, and
   * any other name is a frame from a newer daemon: skip it rather than drop
   * the feed the client can still use.
   */
  #dispatch(frame: string, options: FeedOptions): void {
    let eventName = ''
    const data: string[] = []

    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue
      if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim()
      else if (line.startsWith('data:')) data.push(line.slice('data:'.length).trimStart())
    }

    if (eventName === FEED_HELLO) {
      let hello: FeedHello | null = null
      try {
        hello = JSON.parse(data.join('\n')) as FeedHello
      } catch {
        hello = null
      }
      if (!hello || typeof hello.lastSeq !== 'number') return
      // The log ends behind the watermark this client asked from: replaying
      // cannot fill a gap that is not there anymore, so the caller has to
      // take a fresh snapshot instead of waiting for events that will not come.
      if (hello.lastSeq < options.after) {
        throw new EngineRequestError(
          0,
          'feed_behind',
          `the engine log ends at ${hello.lastSeq}, behind this client's watermark of ${options.after}`,
        )
      }
      options.onWatermark?.(hello.lastSeq)
      return
    }

    if (eventName === FEED_OVERFLOW) {
      let reason = 'client_too_slow'
      try {
        reason = (JSON.parse(data.join('\n')) as FeedOverflow).reason ?? reason
      } catch {
        // Keep the default reason.
      }
      options.onOverflow?.(reason)
      return
    }

    if (eventName !== '') return
    if (data.length === 0) return
    try {
      options.onEvent(JSON.parse(data.join('\n')) as EngineEvent)
    } catch {
      // A frame the engine cannot have written. Skip it rather than drop the feed.
    }
  }
}

export type EngineClient = EngineTransport & EngineSurface

/**
 * Build the client: the transport, plus one method per operation.
 *
 * The loop is the generator, and it is why this file names no command. A row
 * added to the table appears on every client (the cockpit, the tests, a
 * command line) with its request and its answer already typed, and nothing
 * hand written can fall behind the wire.
 */
export function engineClient(connection: EngineConnection, fetchImpl: typeof fetch = daemonFetch): EngineClient {
  const transport = new EngineTransport(connection, fetchImpl)
  const surface = {} as EngineSurface
  for (const operation of operations) {
    Object.defineProperty(surface, operation.name, {
      enumerable: true,
      value: (input: never) => transport.send(operation, input),
    })
  }
  return Object.assign(transport, surface)
}
