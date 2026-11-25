/**
 * Discovery: how a client finds a daemon it did not start.
 *
 * The daemon writes one JSON file next to its database with the URL, the pid
 * and the bearer token. The client reads it, checks the pid is alive and asks
 * the daemon for its health before it trusts the file. A file left behind by a
 * dead process is garbage, not configuration, so it is reported as stale and
 * the caller is free to replace it.
 *
 * Two windows launching at the same moment must not start two engines, which
 * is what the startup lock is for: it is created exclusively and only taken
 * over when its owner is gone. A live owner is never displaced by a timeout.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { Health, RegistryRecord } from './protocol'
import { daemonFetch } from './local-transport'

const PROBE_TIMEOUT_MS = 2_000

export type Discovery =
  | { state: 'running'; record: RegistryRecord; health: Health }
  | { state: 'absent' }
  | { state: 'stale'; reason: string }
  | { state: 'unreachable'; record: RegistryRecord; reason: string }

export function readRegistry(file: string): RegistryRecord | null {
  try {
    if (!existsSync(file)) return null
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as RegistryRecord
    if (!parsed || typeof parsed.url !== 'string' || typeof parsed.token !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function writeRegistry(file: string, record: RegistryRecord): void {
  mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  // Token-bearing: readable by the user who owns it, nobody else.
  writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporary, file)
}

/** Remove the file only when it still describes this pid. */
export function clearRegistry(file: string, pid: number = process.pid): void {
  const record = readRegistry(file)
  if (!record || record.pid !== pid) return
  removeRegistry(file)
}

/** Remove the file unconditionally, for a record already known to be dead. */
export function removeRegistry(file: string): void {
  try {
    unlinkSync(file)
  } catch {
    // Already gone.
  }
}

export function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export async function probe(record: RegistryRecord, fetchImpl: typeof fetch = daemonFetch): Promise<Health | null> {
  try {
    const response = await fetchImpl(`${record.url}/v1/health`, {
      headers: { authorization: `Bearer ${record.token}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as Health
  } catch {
    return null
  }
}

export async function discover(file: string, fetchImpl: typeof fetch = daemonFetch): Promise<Discovery> {
  const record = readRegistry(file)
  if (!record) return { state: 'absent' }
  if (!processAlive(record.pid)) return { state: 'stale', reason: `pid ${record.pid} is gone` }
  const health = await probe(record, fetchImpl)
  if (!health) return { state: 'unreachable', record, reason: `pid ${record.pid} is alive but did not answer on ${record.url}; its discovery file was preserved` }
  return { state: 'running', record, health }
}

// -- startup lock ----------------------------------------------------------

interface StartLock {
  pid: number
  at: number
}

export type StartLockResult = { ok: true } | { ok: false; pid: number | null }

/**
 * Take the startup lock, or report who holds it.
 *
 * A dead owner's lock can be reclaimed. A live owner keeps the lock regardless
 * of its age: a failed health check must not create a second database writer.
 */
export function acquireStartLock(file: string): StartLockResult {
  mkdirSync(path.dirname(file), { recursive: true })
  const write = () => writeFileSync(file, JSON.stringify({ pid: process.pid, at: Date.now() }), { mode: 0o600 })

  try {
    writeFileSync(file, JSON.stringify({ pid: process.pid, at: Date.now() }), { flag: 'wx', mode: 0o600 })
    return { ok: true }
  } catch {
    let existing: StartLock | null = null
    try {
      existing = JSON.parse(readFileSync(file, 'utf8')) as StartLock
    } catch {
      existing = null
    }
    if (existing && processAlive(existing.pid)) {
      return { ok: false, pid: existing.pid }
    }
    write()
    return { ok: true }
  }
}

export function releaseStartLock(file: string): void {
  try {
    const existing = JSON.parse(readFileSync(file, 'utf8')) as StartLock
    if (existing.pid === process.pid) unlinkSync(file)
  } catch {
    // Not ours, or already gone.
  }
}
