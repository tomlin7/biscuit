/**
 * The feed law, tested without a socket.
 *
 * The queue is where the interesting failures live: an event encoded once per
 * client, a slow client that takes the whole feed down with it, a replay that
 * skips or repeats. So these tests open real connections, read their streams
 * and count encoder calls, instead of asserting on the HTTP handler.
 */

import { describe, expect, test } from 'bun:test'

import { Feed, FeedConnection, eventFrame } from '../src/feed'
import { silentLogger } from '../src/log'
import { Sessions } from '../src/sessions'
import { Store } from '../src/store'
import { FEED_HELLO, type EngineEvent } from '../src/protocol'

function setup(options: { capacity?: number; pageSize?: number; heartbeatMs?: number } = {}) {
  const store = Store.open(':memory:')
  store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
  let encodes = 0
  const feed = new Feed(store, {
    ...options,
    encode: (event: EngineEvent) => {
      encodes += 1
      return eventFrame(event)
    },
  })
  return {
    store,
    sessions,
    feed,
    encodes: () => encodes,
    close: () => {
      feed.close()
      store.close()
    },
  }
}

/** An SSE stream, read one frame at a time. */
class Frames {
  readonly #reader: ReadableStreamDefaultReader<Uint8Array>
  readonly #decoder = new TextDecoder()
  #buffer = ''
  #done = false

  constructor(stream: ReadableStream<Uint8Array>) {
    this.#reader = stream.getReader()
  }

  async next(): Promise<string | null> {
    while (true) {
      const boundary = this.#buffer.indexOf('\n\n')
      if (boundary >= 0) {
        const frame = this.#buffer.slice(0, boundary)
        this.#buffer = this.#buffer.slice(boundary + 2)
        return frame
      }
      if (this.#done) return null
      const { value, done } = await this.#reader.read()
      if (done) {
        this.#done = true
        continue
      }
      this.#buffer += this.#decoder.decode(value, { stream: true })
    }
  }

  async take(count: number): Promise<string[]> {
    const frames: string[] = []
    while (frames.length < count) {
      const frame = await this.next()
      if (frame === null) break
      frames.push(frame)
    }
    return frames
  }

  async rest(): Promise<string[]> {
    const frames: string[] = []
    while (true) {
      const frame = await this.next()
      if (frame === null) return frames
      frames.push(frame)
    }
  }
}

function helloOf(frame: string): { lastSeq: number; after: number } {
  expect(frame.startsWith(`event: ${FEED_HELLO}\n`)).toBe(true)
  return JSON.parse(frame.slice(frame.indexOf('data: ') + 'data: '.length)) as {
    lastSeq: number
    after: number
  }
}

function eventOf(frame: string): EngineEvent {
  expect(frame.startsWith('data: ')).toBe(true)
  return JSON.parse(frame.slice('data: '.length)) as EngineEvent
}

describe('the feed', () => {
  test('encodes each event once, for every connection', async () => {
    const { store, sessions, feed, encodes, close } = setup()

    const readers = [feed.open(store.lastSeq()), feed.open(store.lastSeq()), feed.open(store.lastSeq())].map(
      (connection) => new Frames(connection.stream),
    )
    for (const reader of readers) await reader.take(1) // hello

    for (let index = 0; index < 5; index += 1) sessions.create({ title: `s${index}` })

    expect(encodes()).toBe(5)

    const perClient = await Promise.all(readers.map((reader) => reader.take(5)))
    for (const frames of perClient) {
      expect(frames.map(eventOf).map((event) => event.seq)).toEqual([1, 2, 3, 4, 5])
    }
    expect(perClient[0]).toEqual(perClient[1])
    expect(perClient[1]).toEqual(perClient[2])

    close()
  })

  test('a client that stops reading loses only its own connection', async () => {
    const { store, sessions, feed, close } = setup({ capacity: 8 })

    const stalled = feed.open(store.lastSeq())
    const healthy = feed.open(store.lastSeq())
    const reader = new Frames(healthy.stream)

    expect(helloOf((await reader.next())!).lastSeq).toBe(store.lastSeq())

    for (let index = 0; index < 20; index += 1) {
      sessions.create({ title: `s${index}` })
      // Read as the run writes, the way a live window does.
      const frame = await reader.next()
      expect(eventOf(frame!).seq).toBe(store.lastSeq())
    }

    expect(stalled.overflowed).toBe(true)
    expect(feed.size).toBe(1)
    expect(healthy.overflowed).toBe(false)

    close()
  })

  test('the overflowed connection is told why, then ends', async () => {
    const { store, sessions, feed, close } = setup({ capacity: 4 })

    const connection = feed.open(store.lastSeq())
    for (let index = 0; index < 10; index += 1) sessions.create({ title: `s${index}` })

    expect(connection.overflowed).toBe(true)

    const frames = await new Frames(connection.stream).rest()
    const last = frames.at(-1)!
    expect(last.startsWith('event: overflow\n')).toBe(true)
    expect(JSON.parse(last.slice(last.indexOf('data: ') + 6))).toEqual({
      reason: 'client_too_slow',
      capacity: 4,
    })
    // The backlog was dropped: the client resumes from the last sequence it
    // applied, not from 1024 events it will never read.
    expect(frames.length).toBeLessThan(10)

    close()
  })

  test('a reconnect replays to the watermark, then follows, without a gap or a duplicate', async () => {
    const { store, sessions, feed, close } = setup()

    for (let index = 0; index < 12; index += 1) sessions.create({ title: `s${index}` })
    const watermark = store.lastSeq()

    const connection = feed.open(3)
    const frames = new Frames(connection.stream)

    const hello = helloOf((await frames.next())!)
    expect(hello).toEqual({ lastSeq: watermark, after: 3 })

    // Live events recorded after the connection opened.
    for (let index = 0; index < 5; index += 1) sessions.create({ title: `live${index}` })

    const events = (await frames.take(watermark - 3 + 5)).map(eventOf)
    const seqs = events.map((event) => event.seq)
    expect(seqs).toEqual(Array.from({ length: watermark - 3 + 5 }, (_, index) => 4 + index))
    expect(new Set(seqs).size).toBe(seqs.length)

    close()
  })

  test('a replay longer than one page is complete', async () => {
    const { store, sessions, feed, close } = setup({ pageSize: 7 })

    for (let index = 0; index < 50; index += 1) sessions.create({ title: `s${index}` })
    const watermark = store.lastSeq()

    const frames = new Frames(feed.open(0).stream)
    expect(helloOf((await frames.next())!).lastSeq).toBe(watermark)

    const events = (await frames.take(watermark)).map(eventOf)
    expect(events).toHaveLength(50)
    expect(events.map((event) => event.seq)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1))

    close()
  })

  test('a replay longer than the queue still completes', async () => {
    const { store, sessions, feed, close } = setup({ capacity: 4, pageSize: 3 })

    for (let index = 0; index < 20; index += 1) sessions.create({ title: `s${index}` })

    const connection = feed.open(0)
    const frames = new Frames(connection.stream)
    expect(helloOf((await frames.next())!).lastSeq).toBe(20)

    // The replay is pulled, not queued up front: a small queue is a small
    // live backlog, not a cap on how much history a reconnect can recover.
    const events = (await frames.take(20)).map(eventOf)
    expect(events.map((event) => event.seq)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1))
    expect(connection.overflowed).toBe(false)

    close()
  })

  test('an idle connection is kept alive', async () => {
    const connection = new FeedConnection({ heartbeatMs: 20 })
    const frame = await new Frames(connection.stream).next()
    expect(frame).toBe(': heartbeat')
    connection.close()
    expect(connection.closed).toBe(true)
  })

  test('closing a connection takes it out of the hub', () => {
    const { store, feed, close } = setup()

    const connection = feed.open(store.lastSeq())
    expect(feed.size).toBe(1)

    connection.close()
    expect(connection.closed).toBe(true)
    expect(feed.size).toBe(0)

    close()
  })

  test('closing the hub ends every connection and stops following the store', () => {
    const store = Store.open(':memory:')
    store.migrate()
    const feed = new Feed(store)
    const connection = feed.open(0)

    feed.close()
    expect(connection.closed).toBe(true)
    expect(feed.size).toBe(0)

    // Nothing is left listening: a write after close cannot reach a connection.
    const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
    expect(() => sessions.create({ title: 'after' })).not.toThrow()
    store.close()
  })
})
