/**
 * Ensuring a daemon, and attaching to it.
 *
 * The cockpit never runs a command itself. It finds the engine's discovery
 * file, or spawns the engine and waits for the file to appear. The daemon is
 * detached: closing the cockpit leaves it running, which is the whole point of
 * having one.
 *
 * A daemon of another protocol version is reported as a mismatch and left
 * alone. Killing it would be the easy answer and the wrong one: it may be
 * running commands for the person who is about to press the button.
 */

import { ENGINE_VERSION, PROTOCOL_VERSION, type Health } from '../../engine/src/protocol'
import { daemonFetch } from '../../engine/src/local-transport'
import { packagedBuild, allowEngineSpawn, allowSourceRuntime } from '../shell/runtime'
import { discover, localPaths, probe, readRegistry, processAlive, type LocalPaths } from './discovery'

export type AttachResult =
  | { status: 'ready'; url: string; token: string; health: Health; spawned: boolean }
  | { status: 'mismatch'; health: Health; expected: number; expectedVersion: string; url: string; pid: number }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; reason: string }

export interface EnsureOptions {
  home?: string
  /** The directory new sessions start in. */
  workspace?: string
  timeoutMs?: number
}

function nodePath(): typeof import('node:path') {
  return require('node:path')
}

function engineCommand(home: string, workspace: string): string[] {
  const explicit = typeof process !== 'undefined' ? process.env.HIROSHI_ENGINE : undefined
  if (explicit) {
    if (nodePath().resolve(explicit).toLowerCase() === nodePath().resolve(process.execPath).toLowerCase()) throw new Error('The cockpit cannot be its own engine')
    return [explicit, 'serve', '--data-dir', home, '--workspace', workspace]
  }

  const path = nodePath()
  if (packagedBuild) {
    const suffix = process.platform === 'win32' ? '.exe' : ''
    return [path.join(path.dirname(process.execPath), `hiroshi-engine${suffix}`), 'serve', '--data-dir', home, '--workspace', workspace]
  }

  // Running from source: the cockpit and the engine are the same checkout.
  allowSourceRuntime(path.basename(process.execPath))
  const entry = path.resolve(import.meta.dir, '../../engine/src/index.ts')
  return [process.execPath, entry, 'serve', '--data-dir', home, '--workspace', workspace]
}

interface Child {
  pid: number
  exited: Promise<number>
  /** What the engine wrote to its own log after this spawn. */
  diagnostics: () => string
}

function logSize(file: string): number {
  try {
    return (require('node:fs') as typeof import('node:fs')).statSync(file).size
  } catch {
    return 0
  }
}

/** The log lines the engine added since we spawned it. */
function logSince(file: string, offset: number): string {
  const fs = require('node:fs') as typeof import('node:fs')
  try {
    const size = fs.statSync(file).size
    if (size <= offset) return ''
    const start = Math.max(offset, size - 4096)
    const length = size - start
    const buffer = new Uint8Array(length)
    const fd = fs.openSync(file, 'r')
    try {
      fs.readSync(fd, buffer, 0, length, start)
    } finally {
      fs.closeSync(fd)
    }
    return new TextDecoder().decode(buffer).trim()
  } catch {
    return ''
  }
}

function spawnEngine(home: string, workspace: string, log: string): Child {
  allowEngineSpawn(process.env.HIROSHI_ENGINE_LAUNCH_DEPTH)
  // `node:child_process` is required lazily, like `node:path`, so a browser
  // bundle can carry this module and never reach a spawn.
  const { spawn } = require('node:child_process') as typeof import('node:child_process')
  const command = engineCommand(home, workspace)
  const offset = logSize(log)

  const [file, ...args] = command
  if (!file) throw new Error('the engine command is empty')

  // `detached` + `unref` is what makes this a daemon: the cockpit can close and
  // the engine keeps its runs. Nothing is left behind that links the two — no
  // pipe for the engine to write into after the window is gone, and no handle
  // for the engine's lifetime to keep the window's process alive.
  const proc = spawn(file, args, {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
    env: { ...process.env, HIROSHI_HOME: home, HIROSHI_ENGINE_LAUNCH_DEPTH: '1' },
  })
  proc.unref()

  if (typeof proc.pid !== 'number') throw new Error('the engine did not get a process id')

  const exited = new Promise<number>((resolve) => {
    proc.once('exit', (code) => resolve(code ?? 0))
    proc.once('error', () => resolve(-1))
  })

  return { pid: proc.pid, exited, diagnostics: () => logSince(log, offset) }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ready(record: { url: string; token: string }, health: Health, spawned: boolean): AttachResult {
  return { status: 'ready', url: record.url, token: record.token, health, spawned }
}

/**
 * Attach to a running engine, starting one when there is none.
 *
 * Idempotent: two windows calling this at the same moment end up on the same
 * daemon (the engine's own startup lock makes the loser adopt the winner).
 */
export async function ensureEngine(options: EnsureOptions = {}): Promise<AttachResult> {
  if (typeof Bun === 'undefined') {
    return { status: 'unavailable', reason: 'this build has no local process to start an engine with' }
  }

  const paths: LocalPaths = localPaths(options.home)
  const workspace = options.workspace || process.cwd()
  const timeoutMs = options.timeoutMs ?? 20_000

  const existing = await discover(paths.registry)
  if (existing.state === 'unreachable') return { status: 'failed', reason: existing.reason }
  if (existing.state === 'running') {
    if (existing.health.protocol !== PROTOCOL_VERSION || existing.health.version !== ENGINE_VERSION) {
      return {
        status: 'mismatch',
        health: existing.health,
        expected: PROTOCOL_VERSION,
        expectedVersion: ENGINE_VERSION,
        url: existing.record.url,
        pid: existing.record.pid,
      }
    }
    return ready(existing.record, existing.health, false)
  }

  let child: Child
  try {
    child = spawnEngine(paths.home, workspace, paths.log)
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
  const deadline = Date.now() + timeoutMs
  let exitCode: number | null = null
  void child.exited.then((code) => {
    exitCode = code
  })

  while (Date.now() < deadline) {
    await sleep(120)
    const current = await discover(paths.registry)
    if (current.state === 'running') {
      if (current.health.protocol !== PROTOCOL_VERSION || current.health.version !== ENGINE_VERSION) {
        return {
          status: 'mismatch',
          health: current.health,
          expected: PROTOCOL_VERSION,
          expectedVersion: ENGINE_VERSION,
          url: current.record.url,
          pid: current.record.pid,
        }
      }
      return ready(current.record, current.health, true)
    }

    if (exitCode !== null) {
      // Another launch may hold the startup lock before writing its registry.
      // Wait for that owner within the existing deadline; do not respawn.
      if (exitCode === 3) continue
      const record = readRegistry(paths.registry)
      if (record && record.pid !== child.pid && processAlive(record.pid)) {
        // Another window won the race; adopt its daemon.
        const health = await probe(record)
        if (health) return health.protocol === PROTOCOL_VERSION && health.version === ENGINE_VERSION ? ready(record, health, false)
          : { status: 'mismatch', health, expected: PROTOCOL_VERSION, expectedVersion: ENGINE_VERSION, url: record.url, pid: record.pid }
      }
      const detail = child.diagnostics()
      return {
        status: 'failed',
        reason: detail
          ? `the engine exited with code ${exitCode}: ${detail}`
          : `the engine exited with code ${exitCode} before it was listening`,
      }
    }
  }

  return { status: 'failed', reason: exitCode === 3
    ? 'another live process holds the daemon startup lock but did not publish a reachable engine; no replacement was started'
    : `the engine did not start within ${Math.round(timeoutMs / 1000)}s` }
}

/** Ask the daemon to stop and wait for it to be gone. */
export async function stopEngine(options: EnsureOptions = {}): Promise<boolean> {
  const paths = localPaths(options.home)
  const record = readRegistry(paths.registry)
  if (!record) return true

  try {
    await daemonFetch(`${record.url}/v1/shutdown`, {
      method: 'POST',
      headers: { authorization: `Bearer ${record.token}` },
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Already on its way out.
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!processAlive(record.pid)) return true
    await sleep(100)
  }
  return !processAlive(record.pid)
}
