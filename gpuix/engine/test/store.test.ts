import { describe, expect, test } from 'bun:test'

import { silentLogger } from '../src/log'
import { Sessions } from '../src/sessions'
import { Store } from '../src/store'
import type { Run, Session, Step, ToolCall } from '../src/protocol'

function setup() {
  const store = Store.open(':memory:')
  store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
  return { store, sessions }
}

describe('store', () => {
  test('migrations are idempotent', () => {
    const { store } = setup()
    store.migrate()
    store.migrate()
    expect(store.sessions()).toEqual([])
    store.close()
  })

  test('a session is a durable event, not a row nobody can replay', () => {
    const { store, sessions } = setup()
    const session = sessions.create({ title: 'first' })

    const events = store.eventsSince(0)
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('session.created')
    expect(events[0]!.sessionID).toBe(session.id)
    expect((events[0]!.data as { session: Session }).session.id).toBe(session.id)
    expect(store.session(session.id)?.title).toBe('first')

    store.close()
  })

  test('the first prompt names an untitled session, and only the first', () => {
    const { store, sessions } = setup()
    const session = sessions.create({})
    expect(session.title).toBe('New task')

    sessions.prompt(session.id, { text: 'ship the drag fix\nand then the rest' })
    expect(store.session(session.id)?.title).toBe('ship the drag fix')

    sessions.prompt(session.id, { text: 'something else entirely' })
    expect(store.session(session.id)?.title).toBe('ship the drag fix')

    store.close()
  })

  test('a subscriber is told only after the projection is visible', () => {
    const { store, sessions } = setup()
    const session = sessions.create({})

    let sawAdmitted = false
    let sawDelivered = false
    let sawRun = false
    store.subscribe((event) => {
      if (event.type === 'prompt.admitted') sawAdmitted = store.inbox(session.id, 'pending').length === 1
      if (event.type === 'prompt.delivered') sawDelivered = store.messages(session.id).length === 1
      if (event.type === 'run.ended') sawRun = store.run(event.runID!)?.status === 'succeeded'
    })

    sessions.prompt(session.id, { text: 'hello' })

    const running: Run = {
      id: 'run_projection',
      sessionID: session.id,
      command: 'true',
      cwd: session.cwd,
      shell: 'sh',
      status: 'running',
      exitCode: null,
      error: null,
      startedAt: Date.now(),
      endedAt: null,
    }
    store.insertRun(running)

    const ended: Run = { ...running, status: 'succeeded', exitCode: 0, endedAt: Date.now() }
    store.record({
      type: 'run.ended',
      sessionID: session.id,
      runID: ended.id,
      data: { run: ended, toolCall: null },
      project: () => store.finishRun(ended.id, 'succeeded', 0, ended.endedAt ?? Date.now()),
    })

    expect(sawAdmitted).toBe(true)
    expect(sawDelivered).toBe(true)
    expect(sawRun).toBe(true)

    store.close()
  })

  test('chunk sequence numbers are contiguous per run', () => {
    const { store, sessions } = setup()
    const session = sessions.create({})
    store.insertRun({
      id: 'run_chunks',
      sessionID: session.id,
      command: 'true',
      cwd: session.cwd,
      shell: 'sh',
      status: 'running',
      exitCode: null,
      error: null,
      startedAt: Date.now(),
      endedAt: null,
    })

    store.appendChunk('run_chunks', 'stdout', 'one', 1)
    store.appendChunk('run_chunks', 'stderr', 'two', 2)
    store.appendChunk('run_chunks', 'stdout', 'three', 3)

    expect(store.chunks('run_chunks').map((chunk) => chunk.seq)).toEqual([0, 1, 2])
    store.close()
  })

  test('the snapshot carries the watermark it was read at', () => {
    const { store, sessions } = setup()
    const session = sessions.create({})
    sessions.prompt(session.id, { text: 'one' })
    sessions.prompt(session.id, { text: 'two' })

    const detail = store.snapshot(session.id)!
    expect(detail.seq).toBe(store.lastSeq())
    expect(detail.messages).toHaveLength(2)
    expect(detail.messages.map((message) => message.seq)).toEqual([0, 1])

    store.close()
  })

  test('a step is one per message, and a snapshot carries steps and tool calls', () => {
    const { store, sessions } = setup()
    const session = sessions.create({})
    sessions.prompt(session.id, { text: 'go' })
    const message = store.lastUserMessage(session.id)!
    expect(message.role).toBe('user')
    expect(message.text).toBe('go')

    const at = Date.now()
    const step: Step = {
      id: 'step_store',
      sessionID: session.id,
      messageID: message.id,
      provider: 'local',
      model: 'local/echo',
      attempt: 1,
      status: 'running',
      claim: 4242,
      output: '',
      truncated: false,
      error: null,
      startedAt: at,
      endedAt: null,
    }
    store.insertStep(step)

    const call: ToolCall = {
      id: 'tool_store',
      sessionID: session.id,
      stepID: step.id,
      runID: null,
      tool: 'shell',
      input: 'ls',
      status: 'running',
      error: null,
      createdAt: at,
      endedAt: null,
    }
    store.insertToolCall(call)

    expect(store.stepForMessage(message.id)?.id).toBe(step.id)
    expect(store.runningSteps().map((entry) => entry.id)).toEqual([step.id])
    expect(store.toolCallForRun('nothing')).toBeNull()

    const detail = store.snapshot(session.id)!
    expect(detail.steps.map((entry) => entry.id)).toEqual([step.id])
    expect(detail.toolCalls.map((entry) => entry.id)).toEqual([call.id])

    // One step per prompt is a database law, not a convention.
    expect(() => store.insertStep({ ...step, id: 'step_second' })).toThrow()

    store.close()
  })

  test('the replay limit is the caller’s, never a cap nobody named', () => {
    const { store, sessions } = setup()
    for (let index = 0; index < 25; index += 1) sessions.create({ title: `s${index}` })

    // No limit means everything after the watermark.
    expect(store.eventsSince(0)).toHaveLength(25)
    expect(store.eventsSince(10)).toHaveLength(15)

    // An explicit page is a page, and paging covers the log exactly once.
    expect(store.eventsSince(0, 4).map((event) => event.seq)).toEqual([1, 2, 3, 4])

    const seen: number[] = []
    let cursor = 0
    while (true) {
      const page = store.eventsSince(cursor, 7)
      if (page.length === 0) break
      for (const event of page) {
        expect(event.seq).toBeGreaterThan(cursor)
        cursor = event.seq
        seen.push(event.seq)
      }
    }
    expect(seen).toEqual(Array.from({ length: 25 }, (_, index) => index + 1))

    store.close()
  })

  test('a replay longer than the old default is not silently cut short', () => {
    const { store, sessions } = setup()
    // The feed used to ask for 2000 and drop the rest without saying so.
    for (let index = 0; index < 2100; index += 1) sessions.create({ title: `s${index}` })

    expect(store.eventsSince(0)).toHaveLength(2100)
    expect(store.eventsSince(0, 2000)).toHaveLength(2000)
    expect(store.eventsSince(2000)).toHaveLength(100)

    store.close()
  }, 30_000)
})
