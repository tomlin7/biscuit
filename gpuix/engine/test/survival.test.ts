/**
 * The acceptance criteria for the engine, as tests.
 *
 * A run belongs to the engine, not to the window that asked for it. These
 * tests close the client, attach another one, and crash the daemon on purpose.
 * If any of that loses a run, the engine is not an engine.
 */

import { describe, expect, test } from 'bun:test'
import path from 'node:path'

import { engineClient } from '../../src/engine/client'
import { discover, processAlive } from '../src/registry'
import { sleep, startDaemon, until } from './harness'

const ENTRY = path.resolve(import.meta.dir, '../src/index.ts')

function longCommand(seconds: number): string {
  return process.platform === 'win32' ? `Start-Sleep -Seconds ${seconds}; echo done` : `sleep ${seconds}; echo done`
}

describe('survival', () => {
  test('a run outlives the client that started it, and a second client sees it', async () => {
    const daemon = await startDaemon()

    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'survives' })
      const { run } = await daemon.client.startRun({ id: session.id, command: longCommand(2) })

      // The cockpit closes: nothing holds the run, nothing is subscribed.
      await sleep(700)

      const found = await discover(daemon.paths.registry)
      expect(found.state).toBe('running')
      if (found.state !== 'running') throw new Error('the daemon vanished')

      // A second cockpit attaches from the discovery file alone.
      const second = engineClient(found.record)
      const midway = await second.session({ id: session.id })
      expect(midway.runs.find((candidate) => candidate.id === run.id)?.status).toBe('running')

      await until(
        async () =>
          (await second.session({ id: session.id })).runs.find((candidate) => candidate.id === run.id)?.status !==
          'running',
        20_000,
      )

      const finished = await second.session({ id: session.id })
      const record = finished.runs.find((candidate) => candidate.id === run.id)!
      expect(record.status).toBe('succeeded')

      const output = finished.chunks
        .filter((chunk) => chunk.runID === run.id)
        .map((chunk) => chunk.data)
        .join('')
      expect(output).toContain('done')

      // And the client that never closed the window sees the same ending.
      const fromFirst = await daemon.client.session({ id: session.id })
      expect(fromFirst.runs.find((candidate) => candidate.id === run.id)?.status).toBe('succeeded')
    } finally {
      await daemon.stop()
    }
  }, 60_000)

  test('a run the engine died inside is settled as interrupted on the next start', async () => {
    const daemon = await startDaemon()

    let restarted: Awaited<ReturnType<typeof startDaemon>> | null = null
    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'crash' })
      const { run } = await daemon.client.startRun({ id: session.id, command: longCommand(30) })
      await sleep(600)

      // No shutdown, no cleanup: this is what a kill or a power cut looks like.
      await daemon.crash()

      restarted = await startDaemon({ home: daemon.home })
      const detail = await restarted.client.session({ id: session.id })
      const record = detail.runs.find((candidate) => candidate.id === run.id)!

      expect(record.status).toBe('interrupted')
      expect(record.endedAt).not.toBeNull()
      expect(record.error).toContain('was not resumed')
      expect(detail.toolCalls).toHaveLength(1)
      expect(detail.toolCalls[0]!.runID).toBe(run.id)
      expect(detail.toolCalls[0]!.status).toBe('interrupted')
      expect(detail.toolCalls[0]!.error).toContain('was not resumed')

      const output = detail.chunks
        .filter((chunk) => chunk.runID === run.id)
        .map((chunk) => chunk.data)
        .join('')
      expect(output).toContain('was not resumed')
    } finally {
      if (restarted) await restarted.stop()
      else await daemon.stop()
    }
  }, 90_000)

  test('a prompt admitted before a crash is delivered on the next start', async () => {
    const daemon = await startDaemon()

    let restarted: Awaited<ReturnType<typeof startDaemon>> | null = null
    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'inbox crash' })
      await daemon.client.startRun({ id: session.id, command: longCommand(30) })

      const admitted = await daemon.client.prompt({
        id: session.id,
        text: 'after the crash, do the next thing',
        mode: 'queue',
        key: 'crash-send',
      })
      expect(admitted.item.state).toBe('pending')
      expect(admitted.message).toBeNull()

      // The prompt was admitted, not delivered: crash the daemon at exactly
      // the moment nothing may be delivered.
      await daemon.crash()

      restarted = await startDaemon({ home: daemon.home })
      // The delivered prompt starts a step; let the local provider finish so
      // the transcript below is the settled one.
      await until(async () => {
        const current = await restarted!.client.session({ id: session.id })
        return current.steps.length === 1 && current.steps[0]?.status !== 'running'
      })
      const detail = await restarted.client.session({ id: session.id })

      expect(detail.inbox).toEqual([])
      expect(detail.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
      expect(detail.messages[0]!.text).toBe('after the crash, do the next thing')
      expect(detail.messages[0]!.mode).toBe('queue')
      expect(detail.steps[0]!.status).toBe('succeeded')
      // The run it was waiting behind is settled, not silently kept alive.
      expect(detail.runs[0]!.status).toBe('interrupted')

      const retried = await restarted.client.prompt({
        id: session.id,
        text: 'a retry of the same send',
        mode: 'queue',
        key: 'crash-send',
      })
      expect(retried.item.id).toBe(admitted.item.id)
      expect(retried.message?.id).toBe(detail.messages[0]!.id)
    } finally {
      if (restarted) await restarted.stop()
      else await daemon.stop()
    }
  }, 90_000)

  test('a crash before a step produced output resumes the same step', async () => {
    // The local provider holds its first chunk for four seconds, which is the
    // window the crash needs: the step is claimed, and has produced nothing.
    const daemon = await startDaemon({ env: { HIROSHI_PROVIDER_DELAY_MS: '4000' } })

    let restarted: Awaited<ReturnType<typeof startDaemon>> | null = null
    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'step crash' })
      await daemon.client.prompt({ id: session.id, text: 'survive the restart' })

      let claimedID = ''
      const claimed: { by: number | null } = { by: null }
      await until(async () => {
        const detail = await daemon.client.session({ id: session.id })
        const step = detail.steps[0]
        if (!step || step.status !== 'running' || step.output.length > 0) return false
        claimedID = step.id
        claimed.by = step.claim
        return true
      }, 20_000)
      expect(claimed.by).toBe(daemon.record.pid)

      // No shutdown: the running row is the only claim left behind.
      await daemon.crash()

      // The new daemon streams slowly enough to see the claim it took over.
      restarted = await startDaemon({ home: daemon.home, env: { HIROSHI_PROVIDER_DELAY_MS: '300' } })
      const resumed: { by: number | null } = { by: null }
      await until(async () => {
        const detail = await restarted!.client.session({ id: session.id })
        const step = detail.steps[0]
        if (step?.status === 'running') resumed.by = step.claim
        return step?.status === 'succeeded'
      }, 25_000)

      const detail = await restarted.client.session({ id: session.id })
      expect(detail.steps).toHaveLength(1)
      expect(detail.steps[0]!.id).toBe(claimedID)
      expect(detail.steps[0]!.attempt).toBe(2)
      expect(resumed.by).toBe(restarted.record.pid)
      // The claim is released when the step ends.
      expect(detail.steps[0]!.claim).toBeNull()
      expect(detail.messages.filter((message) => message.role === 'user')).toHaveLength(1)
      expect(detail.messages.filter((message) => message.role === 'assistant')).toHaveLength(1)
    } finally {
      if (restarted) await restarted.stop()
      else await daemon.stop()
    }
  }, 120_000)

  test('a crash after a step produced output fails it instead of replaying it', async () => {
    const daemon = await startDaemon({ env: { HIROSHI_PROVIDER_DELAY_MS: '4000' } })

    let restarted: Awaited<ReturnType<typeof startDaemon>> | null = null
    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'step mid stream' })
      await daemon.client.prompt({ id: session.id, text: 'do not duplicate this answer' })

      let claimedID = ''
      await until(async () => {
        const detail = await daemon.client.session({ id: session.id })
        const step = detail.steps[0]
        if (!step || step.status !== 'running' || step.output.length === 0) return false
        claimedID = step.id
        return true
      }, 25_000)

      // The provider wrote a chunk and is holding the next one: a retry could
      // only duplicate the transcript, so the engine must fail the step.
      await daemon.crash()

      restarted = await startDaemon({ home: daemon.home, env: { HIROSHI_PROVIDER_DELAY_MS: '0' } })
      await until(async () => {
        const detail = await restarted!.client.session({ id: session.id })
        return detail.steps.length === 1 && detail.steps[0]?.status !== 'running'
      }, 20_000)

      const detail = await restarted.client.session({ id: session.id })
      expect(detail.steps).toHaveLength(1)
      expect(detail.steps[0]!.id).toBe(claimedID)
      expect(detail.steps[0]!.status).toBe('failed')
      expect(detail.steps[0]!.attempt).toBe(1)
      expect(detail.steps[0]!.error?.code).toBe('engine_restart_mid_stream')
      expect(detail.steps[0]!.error?.message).toContain('not re-run')
      expect(detail.messages.filter((message) => message.role === 'assistant')).toHaveLength(0)
    } finally {
      if (restarted) await restarted.stop()
      else await daemon.stop()
    }
  }, 120_000)

  test('a shut down engine settles the run it was holding', async () => {
    const daemon = await startDaemon()

    let restarted: Awaited<ReturnType<typeof startDaemon>> | null = null
    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'shutdown' })
      const { run } = await daemon.client.startRun({ id: session.id, command: longCommand(30) })
      await sleep(600)

      // A graceful stop still owns the run: it may not hand the next start a
      // row that claims to be running.
      await daemon.client.shutdown().catch(() => {})
      await until(() => !processAlive(daemon.record.pid), 15_000)

      restarted = await startDaemon({ home: daemon.home })
      const detail = await restarted.client.session({ id: session.id })
      const record = detail.runs.find((candidate) => candidate.id === run.id)!

      // An asked-for stop cancels the run; it does not leave a `running` row
      // for the next start to reinterpret as a crash.
      expect(record.status).toBe('cancelled')
      expect(record.endedAt).not.toBeNull()
      expect(detail.toolCalls[0]!.status).toBe('cancelled')
      expect(detail.toolCalls[0]!.error).toContain('was shut down')

      const output = detail.chunks
        .filter((chunk) => chunk.runID === run.id)
        .map((chunk) => chunk.data)
        .join('')
      expect(output).toContain('was shut down')
    } finally {
      if (restarted) await restarted.stop()
      else await daemon.stop()
    }
  }, 90_000)

  test('closing and reopening the cockpit leaves one daemon, not two', async () => {
    const daemon = await startDaemon()
    try {
      const found = await discover(daemon.paths.registry)
      expect(found.state).toBe('running')
      if (found.state !== 'running') throw new Error('the daemon vanished')

      // A second `serve` against the same data directory must adopt the first.
      const second = Bun.spawn({
        cmd: [process.execPath, ENTRY, 'serve', '--data-dir', daemon.home],
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, HIROSHI_HOME: daemon.home },
      })
      const text = await new Response(second.stdout).text()
      const code = await second.exited

      expect(code).toBe(0)
      expect(text).toContain('already running')

      const still = await discover(daemon.paths.registry)
      expect(still.state).toBe('running')
      if (still.state === 'running') expect(still.record.pid).toBe(daemon.record.pid)
    } finally {
      await daemon.stop()
    }
  }, 60_000)
})
