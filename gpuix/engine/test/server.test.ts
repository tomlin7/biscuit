import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { engineClient } from '../../src/engine/client'
import { PROTOCOL_VERSION, type EngineEvent, type Session } from '../src/protocol'
import { startDaemon, until, type Daemon } from './harness'

let daemon: Daemon

beforeAll(async () => {
  daemon = await startDaemon()
}, 60_000)

afterAll(async () => {
  await daemon?.stop()
}, 30_000)

describe('the HTTP surface', () => {
  test('refuses a request without the bearer token', async () => {
    const bare = await fetch(`${daemon.record.url}/v1/health`)
    expect(bare.status).toBe(401)

    const wrong = await fetch(`${daemon.record.url}/v1/health`, {
      headers: { authorization: 'Bearer not-the-token' },
    })
    expect(wrong.status).toBe(401)

    const health = await daemon.client.health()
    expect(health.protocol).toBe(PROTOCOL_VERSION)
    expect(health.pid).toBe(daemon.record.pid)
    expect(health.name).toBe('hiroshi-engine')
  })

  test('reports its health, its database and its watermark', async () => {
    const health = await daemon.client.health()
    expect(health.database).toBe(daemon.paths.database)
    expect(health.uptimeMs).toBeGreaterThan(0)
    expect(health.lastSeq).toBeGreaterThanOrEqual(0)
  })

  test('creates, lists and reads a session', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'http' })
    expect(session.id.startsWith('ses_')).toBe(true)
    expect(session.title).toBe('http')

    const { sessions } = await daemon.client.listSessions()
    expect(sessions.some((candidate) => candidate.id === session.id)).toBe(true)

    const detail = await daemon.client.session({ id: session.id })
    expect(detail.session.id).toBe(session.id)
    expect(detail.messages).toEqual([])
    expect(detail.runs).toEqual([])
    expect(detail.steps).toEqual([])
    expect(detail.toolCalls).toEqual([])
    expect(detail.seq).toBeGreaterThan(0)
  })

  test('a prompt is recorded and names the session', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace })
    const { item, message } = await daemon.client.prompt({ id: session.id, text: 'make the drag feel native' })

    expect(item.state).toBe('delivered')
    expect(message?.role).toBe('user')
    expect(message?.text).toBe('make the drag feel native')

    // Delivery starts a step: the local provider answers, and the answer is a
    // durable assistant message, not a client-side placeholder.
    await until(async () => {
      const current = await daemon.client.session({ id: session.id })
      return current.steps.length === 1 && current.steps[0]?.status !== 'running'
    })

    const detail = await daemon.client.session({ id: session.id })
    expect(detail.messages[0]!.id).toBe(message!.id)
    expect(detail.messages.map((entry) => entry.role)).toEqual(['user', 'assistant'])
    expect(detail.messages[1]!.text).toContain('make the drag feel native')
    expect(detail.session.title).toBe('make the drag feel native')
    expect(detail.inbox).toEqual([])
    expect(detail.steps[0]!.status).toBe('succeeded')
    expect(detail.steps[0]!.attempt).toBe(1)
  })

  test('a prompt sent while a run is going waits, and an interrupt delivers it', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'inbox' })
    const command = process.platform === 'win32' ? 'Start-Sleep -Seconds 30' : 'sleep 30'
    const { run } = await daemon.client.startRun({ id: session.id, command })

    const admitted = await daemon.client.prompt({
      id: session.id,
      text: 'also update the changelog',
      mode: 'steer',
      key: 'http-send-1',
    })

    expect(admitted.message).toBeNull()
    expect(admitted.item.state).toBe('pending')
    expect(admitted.item.mode).toBe('steer')

    // The same send twice is one prompt: the first one wins.
    const retried = await daemon.client.prompt({
      id: session.id,
      text: 'a different text that must be ignored',
      mode: 'steer',
      key: 'http-send-1',
    })
    expect(retried.item.id).toBe(admitted.item.id)

    const mid = await daemon.client.session({ id: session.id })
    expect(mid.inbox.map((item) => item.id)).toEqual([admitted.item.id])
    expect(mid.messages).toEqual([])
    expect(mid.runs[0]!.status).toBe('running')

    const { runs, steps } = await daemon.client.interrupt({ id: session.id, reason: 'the build is wedged' })
    expect(runs.map((entry) => entry.id)).toEqual([run.id])
    expect(runs[0]!.status).toBe('cancelled')
    // The run was the only work in flight, so no step was cancelled here. The
    // boundary it creates delivers the steer, which starts one.
    expect(steps).toEqual([])

    await until(async () => {
      const current = await daemon.client.session({ id: session.id })
      return current.steps.length === 1 && current.steps[0]?.status !== 'running'
    })

    const detail = await daemon.client.session({ id: session.id })
    expect(detail.inbox).toEqual([])
    expect(detail.messages.map((entry) => entry.role)).toEqual(['user', 'assistant'])
    expect(detail.messages[0]!.text).toBe('also update the changelog')
    expect(detail.messages[0]!.mode).toBe('steer')
    expect(detail.messages[1]!.text).toContain('also update the changelog')
    expect(detail.runs[0]!.status).toBe('cancelled')
    expect(detail.toolCalls[0]!.status).toBe('cancelled')
    expect(detail.toolCalls[0]!.error).toContain('the build is wedged')

    const output = detail.chunks.filter((chunk) => chunk.runID === run.id).map((chunk) => chunk.data).join('')
    expect(output).toContain('the build is wedged')
  }, 30_000)

  test('an interrupt with nothing running answers with an empty list', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'idle' })
    expect(await daemon.client.interrupt({ id: session.id })).toEqual({ runs: [], steps: [] })
  })

  test('a run started over HTTP lands in the session snapshot', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'run' })
    const { run } = await daemon.client.startRun({ id: session.id, command: 'echo over-http' })

    await until(async () => (await daemon.client.session({ id: session.id })).runs[0]?.status !== 'running')

    const detail = await daemon.client.session({ id: session.id })
    expect(detail.runs).toHaveLength(1)
    expect(detail.runs[0]!.id).toBe(run.id)
    expect(detail.runs[0]!.status).toBe('succeeded')
    expect(detail.toolCalls).toHaveLength(1)
    expect(detail.toolCalls[0]!.tool).toBe('shell')
    expect(detail.toolCalls[0]!.runID).toBe(run.id)
    expect(detail.toolCalls[0]!.status).toBe('succeeded')
    const output = detail.chunks.filter((chunk) => chunk.runID === run.id).map((chunk) => chunk.data).join('')
    expect(output).toContain('over-http')
  }, 30_000)

  test('a bad request is a typed error, not a stack trace', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace })

    await expect(daemon.client.startRun({ id: session.id, command: '   ' })).rejects.toMatchObject({
      code: 'empty_command',
    })
    await expect(daemon.client.session({ id: 'ses_missing' })).rejects.toMatchObject({ status: 404 })

    const response = await fetch(`${daemon.record.url}/v1/nope`, {
      headers: { authorization: `Bearer ${daemon.record.token}` },
    })
    expect(response.status).toBe(404)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('not_found')
  })

  test('a path the table declares with another method is not a route', async () => {
    // The row says `GET /v1/sessions`; the router must not answer `DELETE`.
    const response = await fetch(`${daemon.record.url}/v1/sessions`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${daemon.record.token}` },
    })
    expect(response.status).toBe(404)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('not_found')
  })

  test('cancelling over HTTP ends the run', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'cancel' })
    const command = process.platform === 'win32' ? 'Start-Sleep -Seconds 30' : 'sleep 30'
    const { run } = await daemon.client.startRun({ id: session.id, command })

    await daemon.client.cancelRun({ id: run.id })
    await until(async () => (await daemon.client.session({ id: session.id })).runs[0]?.status !== 'running', 15_000)

    const detail = await daemon.client.session({ id: session.id })
    expect(detail.runs[0]!.status).toBe('cancelled')
    expect(detail.toolCalls[0]!.status).toBe('cancelled')
  }, 30_000)
})

describe('the event feed', () => {
  test('replays what a client missed, then follows', async () => {
    const seen: EngineEvent[] = []
    const controller = new AbortController()
    const feed = daemon.client.feed({
      after: 0,
      signal: controller.signal,
      onEvent: (event) => seen.push(event),
    })

    await until(() => seen.length > 0)
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'feed' })
    await until(() => seen.some((event) => event.type === 'session.created' && event.sessionID === session.id))
    controller.abort()
    await feed.catch(() => {})

    expect(seen.every((event, index) => index === 0 || event.seq > seen[index - 1]!.seq)).toBe(true)
    expect(seen[0]!.type).toBe('session.created')
  }, 30_000)

  test('resumes exactly after the last sequence it saw', async () => {
    // The watermark has to be taken before the event we are waiting for.
    const head = await daemon.client.health()

    const seen: EngineEvent[] = []
    const controller = new AbortController()
    const feed = daemon.client.feed({
      after: head.lastSeq,
      signal: controller.signal,
      onEvent: (event) => seen.push(event),
    })

    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'resume' })

    await until(() => seen.length > 0)
    expect(seen[0]!.seq).toBeGreaterThan(head.lastSeq)
    expect(seen[0]!.sessionID).toBe(session.id)

    controller.abort()
    await feed.catch(() => {})
  }, 30_000)

  test('opens with the watermark it will replay to, then follows', async () => {
    // Taken before the feed opens, so the next event must land exactly after it.
    const head = await daemon.client.health()
    let watermark = -1
    const seen: EngineEvent[] = []
    const controller = new AbortController()

    const feed = daemon.client.feed({
      after: head.lastSeq,
      signal: controller.signal,
      onWatermark: (lastSeq) => {
        watermark = lastSeq
      },
      onEvent: (event) => seen.push(event),
    })

    await until(() => watermark >= 0)
    expect(watermark).toBe(head.lastSeq)

    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'watermark' })
    await until(() => seen.length > 0)
    expect(seen[0]!.seq).toBe(head.lastSeq + 1)
    expect(seen[0]!.sessionID).toBe(session.id)

    controller.abort()
    await feed.catch(() => {})
  }, 30_000)

  test('two clients on one feed see the same run', async () => {
    const first: EngineEvent[] = []
    const second: EngineEvent[] = []
    const stopFirst = new AbortController()
    const stopSecond = new AbortController()

    void daemon.client.feed({ after: 0, signal: stopFirst.signal, onEvent: (event) => first.push(event) }).catch(() => {})
    void daemon.client.feed({ after: 0, signal: stopSecond.signal, onEvent: (event) => second.push(event) }).catch(() => {})

    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'broadcast' })
    const { run } = await daemon.client.startRun({ id: session.id, command: 'echo both-cockpits' })

    await until(() => first.some((event) => event.type === 'run.ended' && event.runID === run.id), 20_000)
    await until(() => second.some((event) => event.type === 'run.ended' && event.runID === run.id), 20_000)

    stopFirst.abort()
    stopSecond.abort()

    const types = (events: EngineEvent[]) => events.filter((event) => event.runID === run.id).map((event) => event.type)

    expect(types(first)[0]).toBe('run.started')
    expect(types(first).at(-1)).toBe('run.ended')
    expect(types(second)).toEqual(types(first))
  }, 30_000)

  test('a client that attaches sees sessions it never created', async () => {
    const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'another window' })
    const second = engineClient(daemon.record)

    const detail = await second.session({ id: session.id })
    expect((detail.session as Session).title).toBe('another window')
  })
})
