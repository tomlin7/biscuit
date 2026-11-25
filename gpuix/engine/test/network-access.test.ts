import { expect, test } from 'bun:test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { startDaemon, tempHome, until } from './harness'
import { daemonFetch } from '../src/local-transport'
import { engineClient } from '../../src/engine/client'

function port() { const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response() }); const port = server.port!; server.stop(true); return port }
test('opt-in network access preserves the local listener, enforces origins/auth, rotates connections and survives restart', async () => {
  const home = tempHome(); let daemon = await startDaemon({ home })
  try {
    let state = await daemon.client.networkSettings()
    expect(state).toMatchObject({ enabled: false, active: false, urls: [] })
    const initialToken = (await daemon.client.networkToken()).token
    expect(JSON.stringify(state)).not.toContain(initialToken)
    expect(JSON.stringify(await daemon.client.health())).not.toContain(initialToken)
    await expect(daemon.client.updateNetwork({ ...state, enabled: true, origins: ['https://*.invalid'] })).rejects.toMatchObject({ code: 'network_origins' })
    const listening = port()
    state = await daemon.client.updateNetwork({ ...state, port: listening, enabled: true, origins: ['http://localhost:3001'] })
    const url = `http://127.0.0.1:${listening}`
    expect(state.active).toBe(true)
    const remote = engineClient({ url, token: initialToken })
    expect((await remote.health()).pid).toBe(daemon.health.pid)
    expect((await daemonFetch(`${url}/v1/health`, { headers: { authorization: `Bearer ${daemon.record.token}` } })).status).toBe(401)
    expect((await daemonFetch(`${url}/v1/health`, { headers: { authorization: `Bearer ${initialToken}`, origin: 'http://localhost:3001.evil.invalid' } })).status).toBe(403)
    const allowed = await daemonFetch(`${url}/v1/health`, { headers: { authorization: `Bearer ${initialToken}`, origin: 'http://localhost:3001' } })
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:3001')
    const preflight = await daemonFetch(`${url}/v1/sessions`, { method: 'OPTIONS', headers: { origin: 'http://localhost:3001', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type' } })
    expect(preflight.status).toBe(204)
    await expect(remote.networkToken()).rejects.toMatchObject({ status: 403 })
    await expect(remote.updateNetwork({ ...state, enabled: false })).rejects.toMatchObject({ status: 403 })
    await expect(remote.rotateNetworkToken({ revision: state.revision })).rejects.toMatchObject({ status: 403 })
    await expect(remote.shutdown()).rejects.toMatchObject({ status: 403 })
    const { session } = await remote.createSession({})
    await remote.prompt({ id: session.id, text: 'network response remains durable', model: 'local/echo' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
    const feed = await daemonFetch(`${url}/v1/events`, { headers: { authorization: `Bearer ${initialToken}` } })
    const reader = feed.body!.getReader(); await reader.read()
    state = await daemon.client.rotateNetworkToken({ revision: state.revision })
    const ended = await Promise.race([reader.read().then((value) => value.done, () => true), Bun.sleep(1500).then(() => false)])
    expect(ended).toBe(true); await reader.cancel().catch(() => {})
    const replacement = (await daemon.client.networkToken()).token
    expect(replacement).not.toBe(initialToken)
    await expect(remote.health()).rejects.toMatchObject({ status: 401 })
    const occupied = Bun.serve({ port: 0, hostname: '0.0.0.0', fetch: () => new Response() })
    try {
      await expect(daemon.client.updateNetwork({ ...state, port: occupied.port! })).rejects.toMatchObject({ code: 'network_apply' })
      expect((await daemon.client.networkSettings()).port).toBe(listening)
      expect((await engineClient({ url, token: replacement }).health()).pid).toBe(daemon.health.pid)
    } finally { occupied.stop(true) }
    const saved = readFileSync(join(home, 'network.json'), 'utf8')
    expect(saved).toContain(replacement)
    await daemon.crash(); daemon = await startDaemon({ home })
    expect((await daemon.client.networkToken()).token).toBe(replacement)
    expect((await daemon.client.networkSettings()).active).toBe(true)
    state = await daemon.client.networkSettings()
    await daemon.client.updateNetwork({ ...state, enabled: false })
    expect((await daemon.client.networkSettings()).active).toBe(false)
    expect((await daemon.client.session({ id: session.id })).steps[0]?.status).toBe('succeeded')
  } finally { await daemon.stop() }
}, 30000)

test('malformed network configuration cannot prevent local engine startup or silently expose a listener', async () => {
  const home = tempHome(); writeFileSync(join(home, 'network.json'), '{broken')
  const daemon = await startDaemon({ home })
  try {
    expect(await daemon.client.networkSettings()).toMatchObject({ active: false, enabled: false })
    await expect(daemon.client.updateNetwork({ revision: 0, enabled: true, port: port(), origins: [] })).rejects.toMatchObject({ code: 'network_configuration' })
    expect(readFileSync(join(home, 'network.json'), 'utf8')).toBe('{broken')
  } finally { await daemon.stop() }
}, 15000)
