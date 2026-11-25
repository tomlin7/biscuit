/**
 * The feed: one encoded frame per event, one bounded queue per client.
 *
 * The daemon publishes each durable event exactly once. The feed encodes it
 * once, hands the same bytes to every connection, and never waits for a
 * socket. Each connection holds its own queue with a fixed capacity, so the
 * cost of a slow reader is a number of frames we chose, not the daemon's
 * memory. A queue that fills closes that connection with an `overflow` frame
 * and nothing else changes: the run keeps going, the other windows keep
 * receiving, and order is untouched for everyone.
 *
 * A connection opens at a watermark. It announces where the log ends (`hello`),
 * replays the gap in pages and only then reads the live queue. The replay is
 * pulled: one page at a time, when the socket asks for a frame, so a long
 * reconnect never becomes one synchronous query and never fills the queue
 * before anything can drain.
 *
 * Order is by construction, not by timing. The connection joins the live
 * fan-out first, then the watermark is read, and there is no `await` between
 * the two on the daemon's only thread: every live frame it can receive has a
 * sequence above the watermark, so a replay frame and a live frame are never
 * the same event and never arrive out of order.
 *
 * Encoding is one `JSON.stringify` per event, not one per connection. A replay
 * encodes for the one connection it is replaying to, which is the whole work
 * that connection asked for.
 */

import {
  FEED_HELLO,
  FEED_OVERFLOW,
  type EngineEvent,
  type FeedHello,
  type FeedOverflow,
} from './protocol'
import type { Store } from './store'

/** Frames one connection may have waiting before it is dropped. */
export const FEED_CAPACITY = 1024

/** Events one replay query reads. The replay keeps asking until the watermark. */
export const FEED_PAGE = 256

/** How often an idle connection is told the feed is still alive. */
export const FEED_HEARTBEAT_MS = 15_000

const encoder = new TextEncoder()
const HEARTBEAT = encoder.encode(': heartbeat\n\n')

/** One durable event, as an SSE data frame. */
export function eventFrame(event: EngineEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

/** A named frame: `hello`, `overflow`, or whatever the feed grows next. */
export function namedFrame(name: string, body: unknown): Uint8Array {
  return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(body)}\n\n`)
}

export interface FeedConnectionOptions {
  /** Frames allowed to wait for this client. Defaults to `FEED_CAPACITY`. */
  capacity?: number
  /** Milliseconds between heartbeats. `0` disables them. */
  heartbeatMs?: number
  /**
   * The missed events, one frame per call, oldest first, then `null`.
   *
   * It is a function rather than an array so the stream pulls the replay at
   * the socket's pace. Only the feed can produce it; a bare connection (the
   * tests, a future Unix socket) can open with no replay at all.
   */
  replay?: () => Uint8Array | null
}

/**
 * One client's side of the feed: a bounded queue and the stream that drains it.
 *
 * `push` is called from the hub for every event and must never block. The
 * stream only takes a frame when it asks for one, so a socket that stops
 * reading grows this queue and nothing else.
 */
export class FeedConnection {
  readonly stream: ReadableStream<Uint8Array>
  readonly capacity: number

  #queue: Uint8Array[] = []
  #controller: ReadableStreamDefaultController<Uint8Array> | null = null
  #heartbeat: ReturnType<typeof setInterval> | null = null
  #closed = false
  #overflowed = false
  #onClose: (() => void) | null = null
  #hello: Uint8Array | null = null
  #replay: (() => Uint8Array | null) | null
  #replaying: boolean

  constructor(options: FeedConnectionOptions = {}) {
    this.capacity = Math.max(1, options.capacity ?? FEED_CAPACITY)
    this.#replay = options.replay ?? null
    this.#replaying = this.#replay !== null
    const heartbeatMs = options.heartbeatMs ?? FEED_HEARTBEAT_MS

    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.#controller = controller
        if (heartbeatMs > 0) {
          this.#heartbeat = setInterval(() => {
            // Only an idle connection needs a heartbeat; a queued event is
            // already something to read, and a full queue is an overflow.
            if (this.#queue.length === 0 && !this.#replaying) this.push(HEARTBEAT)
          }, heartbeatMs)
        }
      },
      pull: () => {
        this.#pump()
      },
      cancel: () => {
        this.close()
      },
    })
  }

  get closed(): boolean {
    return this.#closed
  }

  get overflowed(): boolean {
    return this.#overflowed
  }

  /** Live frames still waiting for this client. */
  get pending(): number {
    return this.#queue.length
  }

  /** Called once, whichever way this connection ends. */
  onClose(listener: () => void): void {
    this.#onClose = listener
  }

  /** The first frame: the watermark this connection opened at. */
  greet(frame: Uint8Array): void {
    this.#hello = frame
    this.#pump()
  }

  /** Queue one live frame. Returns false when the frame did not fit. */
  push(frame: Uint8Array): boolean {
    if (this.#closed) return false
    if (this.#queue.length >= this.capacity) {
      this.#overflow()
      return false
    }
    this.#queue.push(frame)
    this.#pump()
    return true
  }

  /** End the connection without an error: the client went away or the feed closed. */
  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#queue.length = 0
    this.#replay = null
    this.#stopHeartbeat()
    try {
      this.#controller?.close()
    } catch {
      // Already closed.
    }
    this.#onClose?.()
  }

  #stopHeartbeat(): void {
    if (!this.#heartbeat) return
    clearInterval(this.#heartbeat)
    this.#heartbeat = null
  }

  /**
   * Drop the backlog and tell the client why.
   *
   * The overflow frame is written past backpressure on purpose: a client that
   * stopped reading is exactly the one that has to be told, and one frame is
   * the whole of what this connection may still cost.
   */
  #overflow(): void {
    this.#overflowed = true
    this.#closed = true
    this.#queue.length = 0
    this.#replay = null
    this.#hello = null
    this.#stopHeartbeat()

    const controller = this.#controller
    if (controller) {
      try {
        controller.enqueue(
          namedFrame(FEED_OVERFLOW, { reason: 'client_too_slow', capacity: this.capacity } satisfies FeedOverflow),
        )
      } catch {
        // The client is already gone; closing below is all that is left.
      }
      try {
        controller.close()
      } catch {
        // Already closed.
      }
    }

    this.#onClose?.()
  }

  /**
   * Hand the stream the next frame: the hello, then the replay, then the queue.
   *
   * The stream's own buffer is the socket's; letting it grow would put the
   * queue we bound in two places. `desiredSize` is how it says "send me one".
   */
  #pump(): void {
    const controller = this.#controller
    if (!controller || this.#closed) return

    while (true) {
      const desired = controller.desiredSize
      if (desired !== null && desired <= 0) return

      let frame: Uint8Array | null = null
      if (this.#hello !== null) {
        frame = this.#hello
        this.#hello = null
      } else if (this.#replaying) {
        frame = this.#nextReplayFrame()
        // The replay just ended: the next lap takes the live queue.
        if (frame === null) continue
      } else if (this.#queue.length > 0) {
        frame = this.#queue.shift()!
      } else {
        return
      }

      try {
        controller.enqueue(frame)
      } catch {
        this.close()
        return
      }
    }
  }

  #nextReplayFrame(): Uint8Array | null {
    const replay = this.#replay
    if (!replay) {
      this.#replaying = false
      return null
    }
    // A replay that ends hands the stream back to the live queue.
    const frame = replay()
    if (frame === null) this.#replaying = false
    return frame
  }
}

export interface FeedOptions {
  capacity?: number
  pageSize?: number
  heartbeatMs?: number
  /** The encoder, injectable so a test can count how often it runs. */
  encode?: (event: EngineEvent) => Uint8Array
}

/**
 * The daemon's one feed.
 *
 * It subscribes to the store once, encodes each live event once and fans the
 * same bytes out to every connection. A connection is registered before its
 * watermark is read, so the replay and the live fan-out meet exactly at the
 * watermark.
 */
export class Feed {
  readonly #store: Store
  readonly #connections = new Set<FeedConnection>()
  readonly #capacity: number
  readonly #pageSize: number
  readonly #heartbeatMs: number
  readonly #encode: (event: EngineEvent) => Uint8Array
  readonly #unsubscribe: () => void
  #closed = false

  constructor(store: Store, options: FeedOptions = {}) {
    this.#store = store
    this.#capacity = Math.max(1, options.capacity ?? FEED_CAPACITY)
    this.#pageSize = Math.max(1, options.pageSize ?? FEED_PAGE)
    this.#heartbeatMs = options.heartbeatMs ?? FEED_HEARTBEAT_MS
    this.#encode = options.encode ?? eventFrame

    this.#unsubscribe = store.subscribe((event) => {
      if (this.#closed) return
      const frame = this.#encode(event)
      for (const connection of [...this.#connections]) {
        if (!connection.push(frame)) this.#connections.delete(connection)
      }
    })
  }

  /** Connections the hub is still feeding. */
  get size(): number {
    return this.#connections.size
  }

  /**
   * Open one connection at `after`.
   *
   * Register first, read the watermark second, with no `await` in between, so
   * every live frame is above the watermark and no event is replayed twice.
   * The replay is pulled page by page as the socket asks for frames.
   */
  open(after: number): FeedConnection {
    let watermark = after
    let cursor = after
    let page: EngineEvent[] = []
    let index = 0

    const replay = (): Uint8Array | null => {
      while (cursor < watermark) {
        if (index >= page.length) {
          page = this.#store.eventsSince(cursor, this.#pageSize)
          index = 0
          // The log cannot lose events between two reads from one thread, but
          // a page that comes back empty means it was truncated: stop asking.
          if (page.length === 0) return null
        }
        const event = page[index]!
        index += 1
        cursor = event.seq
        return this.#encode(event)
      }
      return null
    }

    const connection = new FeedConnection({
      capacity: this.#capacity,
      heartbeatMs: this.#heartbeatMs,
      replay,
    })
    connection.onClose(() => this.#connections.delete(connection))

    // Live first, watermark second, no `await` between: on this one thread no
    // event can be recorded in the gap, so nothing is both replayed and live.
    this.#connections.add(connection)
    watermark = this.#store.lastSeq()
    connection.greet(namedFrame(FEED_HELLO, { lastSeq: watermark, after } satisfies FeedHello))
    return connection
  }

  /** Stop following the store and end every connection. */
  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#unsubscribe()
    for (const connection of [...this.#connections]) connection.close()
    this.#connections.clear()
  }
}
