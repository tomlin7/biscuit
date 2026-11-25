/**
 * Test harness: a real daemon, in a real process, on a throwaway data
 * directory.
 *
 * Nothing here stubs the HTTP layer. The tests talk to a spawned
 * `hiroshi-engine` exactly like the cockpit does, which is the only way to
 * prove that a run survives the client that started it.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { engineClient, type EngineClient } from '../../src/engine/client'
import { enginePaths, type EnginePaths } from '../src/paths'
import { discover } from '../src/registry'
import type { Health, RegistryRecord } from '../src/protocol'

export const ENTRY = path.resolve(import.meta.dir, '../src/index.ts')

export interface Daemon {
  home: string
  paths: EnginePaths
  workspace: string
  client: EngineClient
  record: RegistryRecord
  health: Health
  /** Ask it to shut down the way the cockpit's restart does. */
  stop: () => Promise<void>
  /** Kill it without a shutdown, the way a crash looks. */
  crash: () => Promise<void>
  stderr: () => string
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function until(check: () => boolean | Promise<boolean>, timeoutMs = 8000, stepMs = 50): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await sleep(stepMs)
  }
  throw new Error(`condition was not met within ${timeoutMs}ms`)
}

export function tempHome(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'hiroshi-engine-'))
}

export async function startDaemon(options: { home?: string; workspace?: string; env?: Record<string, string>; executable?: string } = {}): Promise<Daemon> {
  const home = options.home ?? tempHome()
  const paths = enginePaths(home)
  const workspace = options.workspace ?? home

  const proc = Bun.spawn({
    cmd: [...(options.executable ? [options.executable] : [process.execPath, ENTRY]), 'serve', '--data-dir', home, '--workspace', workspace],
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, ...options.env, HIROSHI_HOME: home },
    windowsHide: true,
  })

  let stderr = ''
  const decoder = new TextDecoder()
  const stderrStream = proc.stderr
  if (stderrStream) {
    void (async () => {
      const reader = stderrStream.getReader()
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) stderr += decoder.decode(value)
        }
      } catch {
        // Gone.
      }
    })()
  }

  try {
    await until(async () => (await discover(paths.registry)).state === 'running', 30_000)
  } catch (error) {
    proc.kill()
    throw new Error(`the daemon did not start: ${stderr || String(error)}`)
  }

  const found = await discover(paths.registry)
  if (found.state !== 'running') throw new Error(`the daemon did not start: ${stderr}`)

  const stop = async () => {
    try {
      const fresh = await discover(paths.registry)
      if (fresh.state === 'running') await engineClient(fresh.record).shutdown()
    } catch {
      // Already gone.
    }
    await Promise.race([proc.exited, sleep(5000)])
    if (proc.exitCode === null) proc.kill()
    await sleep(100)
    try {
      rmSync(home, { recursive: true, force: true })
    } catch {
      // Windows may still hold the database for a moment; the temp dir is disposable.
    }
  }

  const crash = async () => {
    // SIGTERM is a shutdown the engine handles; a crash is the kill it cannot.
    // Without this the test would exercise the graceful path on Linux and the
    // crash path on Windows, and pass for the wrong reason on one of them.
    proc.kill(process.platform === 'win32' ? undefined : 'SIGKILL')
    await Promise.race([proc.exited, sleep(3000)])
  }

  return {
    home,
    paths,
    workspace,
    client: engineClient(found.record),
    record: found.record,
    health: found.health,
    stop,
    crash,
    stderr: () => stderr,
  }
}
