/**
 * The cockpit's side of the daemon: refusing a stranger, replacing a corpse.
 *
 * Both tests run a real HTTP server and a real daemon. The refusal test points
 * the discovery file at a server that speaks another protocol; the reconnect
 * test kills a daemon mid-run and lets `ensureEngine` start the replacement on
 * the same data directory.
 */

import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { engineClient } from '../../src/engine/client'
import { localPaths } from '../../src/engine/discovery'
import { ensureEngine, stopEngine, type AttachResult } from '../../src/engine/supervisor'
import { PROTOCOL_VERSION, type Health, type RegistryRecord } from '../src/protocol'
import { startDaemon, until } from './harness'
import { daemonFetch } from '../src/local-transport'

function tempHome(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'hiroshi-supervisor-'))
}

interface FakeEngine {
  url: string
  token: string
  shutdowns: () => number
  health: () => Health
  stop: () => void
}

function fakeEngine(protocol: number): FakeEngine {
  let shutdowns = 0
  const health: Health = {
    name: 'hiroshi-engine',
    version: '9.9.9',
    protocol,
    pid: process.pid,
    startedAt: Date.now(),
    uptimeMs: 1,
    database: '',
    workspace: process.cwd(),
    lastSeq: 0,
  }
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === '/v1/health') return Response.json(health)
      if (url.pathname === '/v1/shutdown') {
        shutdowns += 1
        return new Response(null, { status: 204 })
      }
      return new Response(null, { status: 404 })
    },
  })
  return {
    url: `http://127.0.0.1:${server.port}`,
    token: 'the-other-token',
    shutdowns: () => shutdowns,
    health: () => health,
    stop: () => server.stop(true),
  }
}

function writeRegistry(home: string, fake: FakeEngine): void {
  const paths = localPaths(home)
  const port = Number(new URL(fake.url).port)
  const record: RegistryRecord = {
    name: 'hiroshi-engine',
    version: fake.health().version,
    protocol: fake.health().protocol,
    url: fake.url,
    host: '127.0.0.1',
    port,
    // A live pid: this test process answers `kill(pid, 0)`.
    pid: process.pid,
    token: fake.token,
    startedAt: Date.now(),
    database: paths.database,
    log: paths.log,
  }
  writeFileSync(paths.registry, JSON.stringify(record), 'utf8')
}

const homes: string[] = []

afterAll(() => {
  for (const home of homes) rmSync(home, { recursive: true, force: true })
})

describe('attaching to an engine', () => {
  test('refuses a daemon of another protocol instead of killing it', async () => {
    const home = tempHome()
    homes.push(home)
    const fake = fakeEngine(PROTOCOL_VERSION + 1)

    try {
      writeRegistry(home, fake)
      const started = Date.now()
      const attached = await ensureEngine({ home, workspace: home, timeoutMs: 5000 })
      const elapsed = Date.now() - started

      expect(attached.status).toBe('mismatch')
      if (attached.status !== 'mismatch') return

      expect(attached.health.protocol).toBe(PROTOCOL_VERSION + 1)
      expect(attached.expected).toBe(PROTOCOL_VERSION)
      expect(attached.pid).toBe(process.pid)
      expect(attached.url).toBe(fake.url)

      // Refused, not killed, and not timed out.
      expect(fake.shutdowns()).toBe(0)
      expect(elapsed).toBeLessThan(5000)
      const record = JSON.parse(readFileSync(localPaths(home).registry, 'utf8')) as RegistryRecord
      expect(record.pid).toBe(process.pid)

      // It is still there, still answering after the conversation.
      const health = await daemonFetch(`${fake.url}/v1/health`, {
        headers: { authorization: `Bearer ${fake.token}` },
      })
      expect(health.ok).toBe(true)
      expect(existsSync(localPaths(home).lock)).toBe(false)
    } finally {
      fake.stop()
    }
  })

  test('replaces a daemon that crashed and the transcript is complete', async () => {
    const home = tempHome()
    homes.push(home)
    const daemon = await startDaemon({ home })
    let attached: AttachResult | null = null

    try {
      const { session } = await daemon.client.createSession({ cwd: daemon.workspace, title: 'crash' })
      const command =
        process.platform === 'win32'
          ? 'Write-Output before-crash; Start-Sleep -Seconds 20'
          : 'echo before-crash; sleep 20'
      const { run } = await daemon.client.startRun({ id: session.id, command })

      // The output is durable before the process dies; that is what makes the
      // transcript reattachable at all.
      await until(async () => {
        const detail = await daemon.client.session({ id: session.id })
        return detail.chunks.some((chunk) => chunk.data.includes('before-crash'))
      }, 20_000)

      const before = await daemon.client.session({ id: session.id })
      await daemon.crash()

      attached = await ensureEngine({ home, workspace: daemon.workspace })
      expect(attached.status).toBe('ready')
      if (attached.status !== 'ready') return
      expect(attached.spawned).toBe(true)

      const reconnected = engineClient(attached)

      // The new daemon settles the run the crash left running.
      await until(async () => {
        const detail = await reconnected.session({ id: session.id })
        return detail.runs[0]?.status !== 'running'
      }, 20_000)

      const after = await reconnected.session({ id: session.id })
      expect(after.session.title).toBe('crash')
      expect(after.messages).toEqual(before.messages)
      expect(after.chunks.map((chunk) => chunk.data).join('')).toContain('before-crash')
      expect(after.runs.map((candidate) => candidate.id)).toEqual([run.id])
      expect(after.runs[0]!.status).toBe('interrupted')
      expect(after.seq).toBeGreaterThanOrEqual(before.seq)

      // The feed opens at the snapshot's watermark: the window is current, and
      // the next event it sees is the next event the daemon records.
      let watermark = -1
      const controller = new AbortController()
      const feed = reconnected.feed({
        after: after.seq,
        signal: controller.signal,
        onWatermark: (lastSeq) => {
          watermark = lastSeq
          controller.abort()
        },
        onEvent: () => {},
      })
      await feed.catch(() => {})
      expect(watermark).toBe(after.seq)
    } finally {
      await stopEngine({ home }).catch(() => {})
      rmSync(home, { recursive: true, force: true })
      homes.splice(homes.indexOf(home), 1)
    }
  }, 90_000)
})
