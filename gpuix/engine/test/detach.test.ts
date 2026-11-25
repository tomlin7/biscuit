/**
 * The daemon has to outlive the thing that started it.
 *
 * A test that keeps its own process alive cannot prove this: the engine could
 * be a child of the test and still be "running". So the engine is started by a
 * separate launcher process that exits immediately, and everything after that
 * is asked of the daemon alone.
 */

import { describe, expect, test } from 'bun:test'
import path from 'node:path'

import { engineClient } from '../../src/engine/client'
import { processAlive } from '../src/registry'
import { discover } from '../src/registry'
import { sleep, tempHome, until } from './harness'

const FIXTURE = path.resolve(import.meta.dir, 'fixtures/detach.ts')
const ROOT = path.resolve(import.meta.dir, '../..')

describe('detachment', () => {
  test('the engine outlives the process that started it', async () => {
    const home = tempHome()
    const launcher = Bun.spawn({
      cmd: [process.execPath, FIXTURE],
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: ROOT,
      env: { ...process.env, HIROSHI_HOME: home },
    })

    const output = await new Response(launcher.stdout).text()
    const errors = await new Response(launcher.stderr).text()
    const code = await launcher.exited

    expect(code, errors).toBe(0)
    const started = JSON.parse(output.trim()) as { pid: number; spawned: boolean }
    expect(started.spawned).toBe(true)

    // The launcher has exited. Nothing else is holding the engine now.
    expect(processAlive(started.pid)).toBe(true)

    try {
      const found = await discover(path.join(home, 'engine.json'))
      if (found.state !== 'running') throw new Error(`the engine is ${found.state} after its launcher exited`)
      expect(found.record.pid).toBe(started.pid)

      // And it is not merely alive: it still accepts work and finishes it.
      const client = engineClient(found.record)
      const { session } = await client.createSession({ cwd: home, title: 'detached' })
      const { run } = await client.startRun({ id: session.id, command: 'echo still-here' })

      await until(
        async () => (await client.session({ id: session.id })).runs[0]?.status !== 'running',
        25_000,
      )

      const detail = await client.session({ id: session.id })
      expect(detail.runs[0]!.id).toBe(run.id)
      expect(detail.runs[0]!.status).toBe('succeeded')
      expect(detail.chunks.map((chunk) => chunk.data).join('')).toContain('still-here')

      await client.shutdown()
      await until(() => !processAlive(started.pid), 15_000)
    } finally {
      // Never leave a stray daemon behind, even when an assertion failed.
      if (processAlive(started.pid)) {
        try {
          process.kill(started.pid)
        } catch {
          // Already gone.
        }
        await sleep(100)
      }
    }
  }, 90_000)
})
