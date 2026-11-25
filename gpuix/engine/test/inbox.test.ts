/**
 * The inbox's laws, without a window and without a model.
 *
 * A run is the engine's only step today, so the end of a run is the safe
 * boundary. These tests pin what that means: nothing is delivered while a
 * command is going, a steer lands ahead of a queue at the boundary, admission
 * is durable and idempotent, and an interrupt never throws the queue away.
 */

import { describe, expect, test } from 'bun:test'

import { Inbox } from '../src/inbox'
import { silentLogger } from '../src/log'
import { Runs } from '../src/runs'
import { Sessions } from '../src/sessions'
import { Store } from '../src/store'
import { until } from './harness'

function setup() {
  const store = Store.open(':memory:')
  store.migrate()
  const log = silentLogger()
  const inbox = new Inbox(store, log)
  const sessions = new Sessions(store, log, { cwd: process.cwd(), inbox })
  const runs = new Runs(store, log, { onIdle: (sessionID) => void inbox.deliver(sessionID) })
  const session = sessions.create({ title: 'inbox' })
  return { store, inbox, sessions, runs, session }
}

function longCommand(seconds: number): string {
  return process.platform === 'win32' ? `Start-Sleep -Seconds ${seconds}` : `sleep ${seconds}`
}

async function unwind(runs: Runs): Promise<void> {
  await until(() => runs.active === 0, 15_000)
}

describe('the session inbox', () => {
  test('an idle prompt is admitted and delivered as two durable facts', () => {
    const { store, sessions, session } = setup()

    const admitted = sessions.prompt(session.id, { text: 'hello', mode: 'steer' })

    expect(admitted.item.state).toBe('delivered')
    expect(admitted.item.deliveredAt).not.toBeNull()
    expect(admitted.message?.text).toBe('hello')
    expect(admitted.message?.mode).toBe('steer')
    expect(store.inbox(session.id, 'pending')).toEqual([])
    expect(store.messages(session.id)).toHaveLength(1)

    // Admission is written before delivery, not inferred from the message.
    expect(store.eventsSince(0).map((event) => event.type)).toEqual([
      'session.created',
      'prompt.admitted',
      'prompt.delivered',
    ])

    store.close()
  })

  test('a prompt admitted while a run is going waits, and a steer does not stop the run', async () => {
    const { store, sessions, runs, session } = setup()
    const run = runs.start(session.id, longCommand(30))

    const admitted = sessions.prompt(session.id, { text: 'also check the lock file', mode: 'steer' })

    expect(admitted.message).toBeNull()
    expect(admitted.item.state).toBe('pending')
    expect(store.inbox(session.id, 'pending').map((item) => item.text)).toEqual(['also check the lock file'])
    expect(store.messages(session.id)).toEqual([])
    // Steering is not cancelling.
    expect(store.run(run.id)?.status).toBe('running')

    runs.interrupt(session.id, 'the operator changed their mind')
    await unwind(runs)

    const detail = store.snapshot(session.id)!
    expect(detail.runs[0]!.status).toBe('cancelled')
    expect(detail.inbox).toEqual([])
    expect(detail.messages.map((message) => message.text)).toEqual(['also check the lock file'])
    expect(detail.messages[0]!.mode).toBe('steer')

    const output = store.chunks(run.id).map((chunk) => chunk.data).join('')
    expect(output).toContain('the operator changed their mind')

    store.close()
  })

  test('a steer is delivered before a queue at the same boundary', async () => {
    const { store, sessions, runs, session } = setup()
    runs.start(session.id, longCommand(30))

    sessions.prompt(session.id, { text: 'queued first', mode: 'queue' })
    sessions.prompt(session.id, { text: 'steer second', mode: 'steer' })

    runs.interrupt(session.id)
    await unwind(runs)

    expect(store.messages(session.id).map((message) => message.text)).toEqual(['steer second', 'queued first'])
    expect(store.messages(session.id).map((message) => message.seq)).toEqual([0, 1])

    store.close()
  })

  test('a queued prompt is delivered when the run ends on its own, exactly once', async () => {
    const { store, sessions, runs, session } = setup()
    const command = process.platform === 'win32' ? 'Start-Sleep -Milliseconds 700; echo done' : 'sleep 0.7; echo done'
    const run = runs.start(session.id, command)

    sessions.prompt(session.id, { text: 'and then explain the diff', mode: 'queue' })
    await until(() => store.messages(session.id).length === 1, 20_000)
    await until(() => store.run(run.id)?.status !== 'running', 20_000)

    expect(store.messages(session.id)).toHaveLength(1)
    expect(store.inbox(session.id, 'pending')).toEqual([])
    expect(store.eventsSince(0).filter((event) => event.type === 'prompt.delivered')).toHaveLength(1)

    store.close()
  }, 30_000)

  test('admitting the same key twice admits once, and the first one wins', () => {
    const { store, sessions, session } = setup()

    const first = sessions.prompt(session.id, { text: 'ship it', key: 'send-1' })
    const second = sessions.prompt(session.id, { text: 'ship it again', key: 'send-1' })

    expect(second.item.id).toBe(first.item.id)
    expect(second.message?.id).toBe(first.message?.id)
    expect(store.messages(session.id).map((message) => message.text)).toEqual(['ship it'])
    expect(store.eventsSince(0).filter((event) => event.type === 'prompt.admitted')).toHaveLength(1)

    store.close()
  })

  test('a retry while the first admission is still pending does not queue a second turn', async () => {
    const { store, sessions, runs, session } = setup()
    runs.start(session.id, longCommand(30))

    const first = sessions.prompt(session.id, { text: 'one', key: 'send-2' })
    const second = sessions.prompt(session.id, { text: 'two', key: 'send-2' })

    expect(second.item.id).toBe(first.item.id)
    expect(store.inbox(session.id, 'pending').map((item) => item.text)).toEqual(['one'])

    runs.interrupt(session.id)
    await unwind(runs)
    expect(store.messages(session.id).map((message) => message.text)).toEqual(['one'])

    store.close()
  })

  test('an interrupt stops every run the session holds and settles the rows', async () => {
    const { store, runs, session } = setup()
    const first = runs.start(session.id, longCommand(30))
    const second = runs.start(session.id, longCommand(30))

    const stopped = runs.interrupt(session.id, 'the build is wedged')

    expect(stopped.map((run) => run.id).sort()).toEqual([first.id, second.id].sort())
    expect(stopped.every((run) => run.status === 'cancelled')).toBe(true)
    expect(stopped.every((run) => run.endedAt !== null)).toBe(true)
    expect(store.runningRuns(session.id)).toEqual([])

    await unwind(runs)
    // The processes are gone, not merely forgotten.
    expect(store.runningRuns()).toEqual([])
    store.close()
  }, 30_000)

  test('interrupting a session with nothing running is not an error', () => {
    const { store, runs, session } = setup()
    expect(runs.interrupt(session.id)).toEqual([])
    expect(() => runs.interrupt('ses_missing')).toThrow()
    store.close()
  })

  test('an empty prompt and an unknown mode are refused before anything is recorded', () => {
    const { store, sessions, session } = setup()

    expect(() => sessions.prompt(session.id, { text: '   ' })).toThrow()
    expect(() => sessions.prompt(session.id, { text: 'x', mode: 'later' as never })).toThrow()
    expect(store.eventsSince(0).filter((event) => event.type.startsWith('prompt.'))).toHaveLength(0)

    store.close()
  })
})
