/**
 * Reading the discovery file from the cockpit's side.
 *
 * The engine writes `<data>/engine.json` with the URL, pid and token; this
 * module finds and validates it before the cockpit trusts it. `node:fs` is
 * required lazily so a browser bundle can carry this file and simply never
 * enable the engine.
 */

import { currentEngineHome } from '../../engine/src/home'
import type { Health, RegistryRecord } from '../../engine/src/protocol'
import { daemonFetch } from '../../engine/src/local-transport'

export interface LocalPaths {
  home: string
  database: string
  registry: string
  lock: string
  log: string
}

function nodePath(): typeof import('node:path') {
  return require('node:path')
}

export function localPaths(home: string = currentEngineHome()): LocalPaths {
  const path = nodePath()
  return {
    home,
    database: path.join(home, 'engine.db'),
    registry: path.join(home, 'engine.json'),
    lock: path.join(home, 'engine.lock'),
    log: path.join(home, 'logs', 'engine.log'),
  }
}

export function readRegistry(file: string): RegistryRecord | null {
  const fs = require('node:fs') as typeof import('node:fs')
  try {
    if (!fs.existsSync(file)) return null
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as RegistryRecord
    if (!parsed || typeof parsed.url !== 'string' || typeof parsed.token !== 'string') return null
    return parsed
  } catch {
    return null
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

export async function probe(
  record: RegistryRecord,
  timeoutMs = 2000,
  fetchImpl: typeof fetch = daemonFetch,
): Promise<Health | null> {
  try {
    const response = await fetchImpl(`${record.url}/v1/health`, {
      headers: { authorization: `Bearer ${record.token}` },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return null
    return (await response.json()) as Health
  } catch {
    return null
  }
}

export type Discovery =
  | { state: 'running'; record: RegistryRecord; health: Health }
  | { state: 'absent' }
  | { state: 'stale'; reason: string }
  | { state: 'unreachable'; record: RegistryRecord; reason: string }

export async function discover(file: string, fetchImpl: typeof fetch = daemonFetch): Promise<Discovery> {
  const record = readRegistry(file)
  if (!record) return { state: 'absent' }
  if (!processAlive(record.pid)) return { state: 'stale', reason: `pid ${record.pid} is gone` }
  const health = await probe(record, 2000, fetchImpl)
  if (!health) return { state: 'unreachable', record, reason: `pid ${record.pid} is alive but did not answer on ${record.url}; its discovery file was preserved` }
  return { state: 'running', record, health }
}
