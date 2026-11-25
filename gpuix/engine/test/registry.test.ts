import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ENGINE_NAME, ENGINE_VERSION, PROTOCOL_VERSION, type RegistryRecord } from '../src/protocol'
import {
  acquireStartLock,
  clearRegistry,
  discover,
  processAlive,
  readRegistry,
  releaseStartLock,
  writeRegistry,
} from '../src/registry'

function temp(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'hiroshi-registry-'))
}

/** A pid no kernel is handing out. */
const DEAD_PID = 2 ** 30

function record(overrides: Partial<RegistryRecord> = {}): RegistryRecord {
  return {
    name: ENGINE_NAME,
    version: ENGINE_VERSION,
    protocol: PROTOCOL_VERSION,
    url: 'http://127.0.0.1:9',
    host: '127.0.0.1',
    port: 9,
    pid: process.pid,
    token: 'a-test-token',
    startedAt: Date.now(),
    database: '/tmp/engine.db',
    log: '/tmp/engine.log',
    ...overrides,
  }
}

describe('the registry', () => {
  test('round-trips the record it wrote', () => {
    const file = path.join(temp(), 'engine.json')
    const written = record()
    writeRegistry(file, written)

    expect(readRegistry(file)).toEqual(written)
    // The token is in the file: it must not be world readable.
    if (process.platform !== 'win32') {
      const mode = readFileSync(file, { encoding: 'utf8' }) && require('node:fs').statSync(file).mode & 0o777
      expect(mode).toBe(0o600)
    }
  })

  test('a record whose process is gone is stale, not a daemon', async () => {
    const file = path.join(temp(), 'engine.json')
    writeRegistry(file, record({ pid: DEAD_PID }))

    const found = await discover(file)
    expect(found.state).toBe('stale')
    expect(processAlive(DEAD_PID)).toBe(false)
  })

  test('a corrupt file is no worse than a missing one', async () => {
    const file = path.join(temp(), 'engine.json')
    writeFileSync(file, '{ this is not json')

    expect(readRegistry(file)).toBeNull()
    expect((await discover(file)).state).toBe('absent')
  })

  test('clearing only removes the record of the process that owns it', () => {
    const file = path.join(temp(), 'engine.json')
    writeRegistry(file, record())
    clearRegistry(file, DEAD_PID)
    expect(readRegistry(file)).not.toBeNull()

    clearRegistry(file, process.pid)
    expect(readRegistry(file)).toBeNull()
  })
})

describe('the startup lock', () => {
  test('one owner at a time', () => {
    const file = path.join(temp(), 'engine.lock')
    expect(acquireStartLock(file)).toEqual({ ok: true })

    // This process already holds it, so a second start is refused.
    const second = acquireStartLock(file)
    expect(second.ok).toBe(false)

    releaseStartLock(file)
    expect(acquireStartLock(file)).toEqual({ ok: true })
    releaseStartLock(file)
  })

  test('a lock left by a dead process is taken over', () => {
    const file = path.join(temp(), 'engine.lock')
    writeFileSync(file, JSON.stringify({ pid: DEAD_PID, at: Date.now() }))

    const result = acquireStartLock(file)
    expect(result.ok).toBe(true)
    releaseStartLock(file)
  })

  test('a live owner keeps its lock even after the old startup grace period', () => {
    const file = path.join(temp(), 'engine.lock')
    // Our own pid, but pretending to have been starting for an hour.
    writeFileSync(file, JSON.stringify({ pid: process.pid, at: Date.now() - 3_600_000 }))

    expect(acquireStartLock(file)).toEqual({ ok: false, pid: process.pid })
    releaseStartLock(file)
  })
})
