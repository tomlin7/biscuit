/**
 * A process that starts the engine and then exits, standing in for a window.
 *
 * The test that spawns this file is checking one thing: whether the engine is
 * still there afterwards. If it is not, the cockpit would lose every run the
 * moment a person closed the window.
 */

import { ensureEngine } from '../../../src/engine/supervisor'

const result = await ensureEngine({
  home: process.env.HIROSHI_HOME,
  workspace: process.env.HIROSHI_TEST_WORKSPACE || process.cwd(),
  timeoutMs: 25_000,
})

if (result.status !== 'ready') {
  console.error(JSON.stringify(result))
  process.exit(1)
}

console.log(JSON.stringify({ pid: result.health.pid, spawned: result.spawned }))
