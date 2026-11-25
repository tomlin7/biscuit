import { expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { discover as discoverEngine, writeRegistry } from '../src/registry'
import { discover as discoverWindow } from '../../src/engine/discovery'
import { ensureEngine } from '../../src/engine/supervisor'
import { daemonFetch } from '../src/local-transport'
import { ENGINE_NAME, ENGINE_VERSION, PROTOCOL_VERSION, type RegistryRecord } from '../src/protocol'

test('inherited HTTP proxies receive no daemon credentials or traffic', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'hiroshi-proxy-'))
  const proxyRequests: { url: string; authorization: boolean }[] = []
  const proxy = Bun.serve({ port: 0, fetch: (request) => { proxyRequests.push({ url: request.url, authorization: request.headers.has('authorization') }); return new Response('test proxy', { status: 502 }) } })
  const proxyURL = `http://127.0.0.1:${proxy.port}`
  const child = Bun.spawn([process.execPath, path.join(import.meta.dir, 'fixtures/local-transport.ts'), home], {
    env: { ...process.env, HTTP_PROXY: proxyURL, HTTPS_PROXY: proxyURL, ALL_PROXY: proxyURL, http_proxy: proxyURL, https_proxy: proxyURL, all_proxy: proxyURL, NO_PROXY: '', no_proxy: '' },
    stdout: 'pipe', stderr: 'pipe', windowsHide: true,
  })
  try {
    const [code, output, errors] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    if (code !== 0) console.error('Proxy fixture failed:', output, errors)
    expect(errors).toBe('')
    expect(code).toBe(0)
    expect(output).toContain('discovery, RPC, feed, reuse and CLI shutdown')
    expect(proxyRequests.map((request) => ({ ...request, url: new URL(request.url).href }))).toEqual([{ url: 'http://provider.invalid/test', authorization: false }])
  } finally {
    child.kill(); proxy.stop(true)
    for (let attempt = 0; attempt < 10; attempt++) {
      try { rmSync(home, { recursive: true, force: true }); break }
      catch { await Bun.sleep(100) }
    }
  }
}, 25000)

test('an unreachable live daemon is preserved and never replaced by window or CLI startup', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'hiroshi-unreachable-'))
  const server = Bun.serve({ port: 0, fetch: () => new Response('temporarily unavailable', { status: 503 }) })
  const file = path.join(home, 'engine.json')
  const record: RegistryRecord = { name: ENGINE_NAME, version: ENGINE_VERSION, protocol: PROTOCOL_VERSION, url: `http://127.0.0.1:${server.port}`, host: '127.0.0.1', port: server.port!, pid: process.pid, token: 'local-test', startedAt: Date.now(), database: path.join(home, 'engine.db'), log: path.join(home, 'logs/engine.log') }
  writeRegistry(file, record)
  const before = readFileSync(file, 'utf8')
  try {
    expect((await discoverEngine(file)).state).toBe('unreachable')
    expect((await discoverWindow(file)).state).toBe('unreachable')
    expect((await ensureEngine({ home })).status).toBe('failed')
    for (const command of ['serve', 'stop']) {
      const child = Bun.spawn([process.execPath, path.join(import.meta.dir, '../src/index.ts'), command, '--data-dir', home], { stdout: 'ignore', stderr: 'ignore', windowsHide: true })
      expect(await child.exited).toBe(4)
    }
    expect(readFileSync(file, 'utf8')).toBe(before)
    expect(existsSync(record.database)).toBe(false)
    expect(existsSync(path.join(home, 'engine.lock'))).toBe(false)
  } finally { server.stop(true); rmSync(home, { recursive: true, force: true }) }
}, 15000)

test('daemon redirects cannot forward the bearer token to another endpoint', async () => {
  let forwarded = 0
  const target = Bun.serve({ port: 0, fetch: () => { forwarded++; return new Response('unexpected') } })
  const source = Bun.serve({ port: 0, fetch: () => new Response(null, { status: 302, headers: { location: `http://127.0.0.1:${target.port}` } }) })
  try {
    const response = await daemonFetch(`http://127.0.0.1:${source.port}`, { headers: { authorization: 'Bearer local-test' } })
    expect(response.status).toBe(302)
    await response.text()
    expect(forwarded).toBe(0)
  } finally { source.stop(true); target.stop(true) }
})
