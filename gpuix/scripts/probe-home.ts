import { lstatSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { discover } from '../engine/src/registry'

/** Live probes must never attach to a user's normal daemon or tunnel profile. */
export async function probeHome(requested?: string): Promise<string> {
  const home = requested ? resolve(requested) : mkdtempSync(join(tmpdir(), 'hiroshi-remote-probe-')), marker = join(home, 'remote-probe.json')
  if (!requested) writeFileSync(marker, JSON.stringify({ type: 'hiroshi.remote-probe', version: 1 }), { flag: 'wx', mode: 0o600 })
  if (lstatSync(home).isSymbolicLink() || statSync(marker).size > 1024) throw new Error('Use an isolated probe data directory.')
  const saved = JSON.parse(readFileSync(marker, 'utf8'))
  if (saved.type !== 'hiroshi.remote-probe' || saved.version !== 1) throw new Error('This directory is not owned by a remote acceptance probe.')
  const daemon = await discover(join(home, 'engine.json'))
  if (daemon.state === 'running' || daemon.state === 'unreachable') throw new Error('A daemon already owns this probe directory. Stop it before resuming.')
  return home
}
