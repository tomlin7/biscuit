/**
 * The client half of the feed contract.
 *
 * A fake `fetch` returns the frames the daemon writes, cut wherever the test
 * wants them cut: `hello` is the watermark, an unnamed frame is an event, and
 * `overflow` is the daemon closing the connection on purpose.
 */

import { describe, expect, test } from 'vitest'

import type { EngineEvent } from '../../engine/src/protocol'
import { EngineRequestError, engineClient } from './client'

function event(seq: number): EngineEvent {
  return {
    seq,
    type: 'session.created',
    sessionID: 'ses_test',
    runID: null,
    at: 1,
    data: {},
  } as EngineEvent
}

function frames(...parts: string[]): string {
  return parts.join('')
}

function streamingFetch(body: string, splitAt?: number): typeof fetch {
  return (async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (splitAt === undefined) {
          controller.enqueue(encoder.encode(body))
        } else {
          controller.enqueue(encoder.encode(body.slice(0, splitAt)))
          controller.enqueue(encoder.encode(body.slice(splitAt)))
        }
        controller.close()
      },
    })
    return new Response(stream, { status: 200 })
  }) as unknown as typeof fetch
}

function client(fetchImpl: typeof fetch) {
  return engineClient({ url: 'http://engine.test', token: 'token' }, fetchImpl)
}

describe('the feed client', () => {
  test('routes the watermark, the events and the overflow frame', async () => {
    const seen: number[] = []
    let watermark = -1
    let overflow = ''

    const body = frames(
      'event: hello\ndata: {"lastSeq":7,"after":3}\n\n',
      `data: ${JSON.stringify(event(4))}\n\n`,
      'event: overflow\ndata: {"reason":"client_too_slow","capacity":4}\n\n',
    )

    await client(streamingFetch(body)).feed({
      after: 3,
      onEvent: (incoming) => seen.push(incoming.seq),
      onWatermark: (lastSeq) => {
        watermark = lastSeq
      },
      onOverflow: (reason) => {
        overflow = reason
      },
    })

    expect(watermark).toBe(7)
    expect(seen).toEqual([4])
    expect(overflow).toBe('client_too_slow')
  })

  test('reassembles a frame split across reads', async () => {
    const body = frames(`data: ${JSON.stringify(event(9))}\n\n`, `data: ${JSON.stringify(event(10))}\n\n`)
    const split = body.indexOf('\n\n') + 3
    const seen: number[] = []

    await client(streamingFetch(body, split)).feed({
      after: 8,
      onEvent: (incoming) => seen.push(incoming.seq),
    })

    expect(seen).toEqual([9, 10])
  })

  test('skips a named frame from a newer daemon instead of dropping the feed', async () => {
    const body = frames(
      'event: checkpoint\ndata: {"opaque":true}\n\n',
      `data: ${JSON.stringify(event(5))}\n\n`,
    )
    const seen: number[] = []

    await client(streamingFetch(body)).feed({
      after: 4,
      onEvent: (incoming) => seen.push(incoming.seq),
    })

    expect(seen).toEqual([5])
  })

  test('a log behind the watermark is an error, not a wait', async () => {
    const body = 'event: hello\ndata: {"lastSeq":9,"after":12}\n\n'

    const feed = client(streamingFetch(body)).feed({
      after: 12,
      onEvent: () => {},
    })

    await expect(feed).rejects.toBeInstanceOf(EngineRequestError)
    await expect(feed).rejects.toMatchObject({ code: 'feed_behind' })
  })
})
