import { describe, expect, test } from 'bun:test'

import { silentLogger } from '../src/log'
import { Runs } from '../src/runs'
import { Sessions } from '../src/sessions'
import { Store } from '../src/store'
import { sleep, until } from './harness'

function setup(options: { outputLimit?: number } = {}) {
  const store = Store.open(':memory:')
  store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: process.cwd() })
  const runs = new Runs(store, silentLogger(), options)
  const session = sessions.create({ title: 'runs' })
  return { store, runs, session }
}

async function settle(store: Store, runID: string, timeoutMs = 20_000): Promise<void> {
  await until(() => store.run(runID)?.status !== 'running', timeoutMs)
}

describe('runs', () => {
  test('records the output and the exit code', async () => {
    const { store, runs, session } = setup()
    const run = runs.start(session.id, 'echo hello')

    // The call is durable before the process has done anything.
    const calls = store.toolCalls(session.id)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.tool).toBe('shell')
    expect(calls[0]!.input).toBe('echo hello')
    expect(calls[0]!.runID).toBe(run.id)
    expect(calls[0]!.status).toBe('running')

    await settle(store, run.id)

    expect(store.run(run.id)?.status).toBe('succeeded')
    expect(store.run(run.id)?.exitCode).toBe(0)
    expect(store.run(run.id)?.error).toBeNull()
    const output = store.chunks(run.id).map((chunk) => chunk.data).join('')
    expect(output).toContain('hello')

    const ended = store.toolCallForRun(run.id)!
    expect(ended.status).toBe('succeeded')
    expect(ended.error).toBeNull()
    expect(ended.endedAt).not.toBeNull()

    const events = store.eventsSince(0).map((event) => event.type)
    expect(events).toContain('run.started')
    expect(events).toContain('run.output')
    expect(events).toContain('run.ended')

    store.close()
  }, 30_000)

  test('a non-zero exit is a failed run, not a thrown request', async () => {
    const { store, runs, session } = setup()
    const run = runs.start(session.id, 'exit 7')

    await settle(store, run.id)

    expect(store.run(run.id)?.status).toBe('failed')
    expect(store.run(run.id)?.exitCode).toBe(7)
    expect(store.toolCallForRun(run.id)?.status).toBe('failed')
    expect(store.toolCallForRun(run.id)?.error).toBe('exit code 7')

    store.close()
  }, 30_000)

  test('a cancelled run stops and says so', async () => {
    const { store, runs, session } = setup()
    const command = process.platform === 'win32' ? 'Start-Sleep -Seconds 30' : 'sleep 30'
    const run = runs.start(session.id, command)

    await sleep(400)
    expect(store.run(run.id)?.status).toBe('running')
    expect(store.toolCallForRun(run.id)?.status).toBe('running')

    runs.cancel(run.id)
    await settle(store, run.id, 15_000)

    expect(store.run(run.id)?.status).toBe('cancelled')
    expect(runs.active).toBe(0)
    expect(store.toolCallForRun(run.id)?.status).toBe('cancelled')

    store.close()
  }, 30_000)

  test('an empty command is rejected before anything is recorded', () => {
    const { store, runs, session } = setup()
    expect(() => runs.start(session.id, '   ')).toThrow()
    expect(store.eventsSince(0).filter((event) => event.type === 'run.started')).toHaveLength(0)
    store.close()
  })

  test('output is bounded and the run is marked truncated', async () => {
    const { store, runs, session } = setup({ outputLimit: 200 })
    const run = runs.start(session.id, `bun -e "process.stdout.write('x'.repeat(5000))"`)

    await settle(store, run.id)

    const stored = store.chunks(run.id).reduce((total, chunk) => total + chunk.data.length, 0)
    expect(stored).toBeLessThan(600)
    expect(store.eventsSince(0).map((event) => event.type)).toContain('run.truncated')
    expect(store.run(run.id)?.status).toBe('succeeded')

    store.close()
  }, 30_000)

  test('a run the previous process left behind is settled as interrupted', () => {
    const { store, runs, session } = setup()
    const at = Date.now()
    store.insertRun({
      id: 'run_orphan',
      sessionID: session.id,
      command: 'sleep 30',
      cwd: session.cwd,
      shell: 'sh',
      status: 'running',
      exitCode: null,
      error: null,
      startedAt: at,
      endedAt: null,
    })

    const settled = runs.settleInterrupted('the engine stopped while this command was running')

    expect(settled).toBe(1)
    expect(store.run('run_orphan')?.status).toBe('interrupted')
    expect(store.run('run_orphan')?.error).toBe('the engine stopped while this command was running')
    const output = store.chunks('run_orphan').map((chunk) => chunk.data).join('')
    expect(output).toContain('the engine stopped while this command was running')
    // A pre-upgrade run has no tool call; settlement must still work. A run
    // that does have one ends it with the same reason.
    expect(store.toolCallForRun('run_orphan')).toBeNull()

    // Settling twice must not write a second ending.
    expect(runs.settleInterrupted('again')).toBe(0)
    store.close()
  })

  test('a crash ends the tool call with the reason and never replays it', () => {
    const { store, runs, session } = setup()
    const at = Date.now()
    store.insertRun({
      id: 'run_crashed',
      sessionID: session.id,
      command: 'rm -rf build',
      cwd: session.cwd,
      shell: 'sh',
      status: 'running',
      exitCode: null,
      error: null,
      startedAt: at,
      endedAt: null,
    })
    store.insertToolCall({
      id: 'tool_crashed',
      sessionID: session.id,
      stepID: null,
      runID: 'run_crashed',
      tool: 'shell',
      input: 'rm -rf build',
      status: 'running',
      error: null,
      createdAt: at,
      endedAt: null,
    })

    // The process is gone: the next start settles what it left running.
    runs.settleInterrupted('the engine stopped while this tool call was running; it was not replayed')

    expect(store.run('run_crashed')?.status).toBe('interrupted')
    expect(store.run('run_crashed')?.error).toContain('it was not replayed')
    const call = store.toolCallForRun('run_crashed')!
    expect(call.status).toBe('interrupted')
    expect(call.error).toContain('it was not replayed')
    // The command was not started again: one run, one call, one ending.
    expect(store.runs(session.id)).toHaveLength(1)
    expect(store.toolCalls(session.id)).toHaveLength(1)

    store.close()
  })
})
