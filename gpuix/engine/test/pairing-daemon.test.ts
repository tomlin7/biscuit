import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import jsQR from 'jsqr'
import { startDaemon, tempHome, until } from './harness'
import { daemonFetch } from '../src/local-transport'
import { engineClient } from '../../src/engine/client'
import type { PairingConnection } from '../src/protocol'

function port() { const server = Bun.serve({ hostname: '0.0.0.0', port: 0, fetch: () => new Response() }); const value = server.port!; server.stop(true); return value }
/** Rasterize the emitted SVG's square modules, then use an independent QR decoder. */
function decode(svg: string): string {
  const width = Number(/viewBox="0 0 (\d+) (\d+)"/.exec(svg)?.[1]), scale = 4, pixels = width * scale
  if (!width || width > 200) throw new Error('Invalid QR dimensions')
  const image = new Uint8ClampedArray(pixels * pixels * 4).fill(255)
  for (const match of svg.matchAll(/M(\d+),(\d+)h1v1h-1z/g)) {
    const left = Number(match[1]) * scale, top = Number(match[2]) * scale
    for (let y = top; y < top + scale; y++) for (let x = left; x < left + scale; x++) { const offset = (y * pixels + x) * 4; image[offset] = image[offset + 1] = image[offset + 2] = 0 }
  }
  const result = jsQR(image, pixels, pixels)
  if (!result) throw new Error('The emitted QR code could not be decoded')
  return result.data
}
test('real daemon QR/link pairing reaches sessions and events, revokes one device, survives restart and obeys owner boundaries', async () => {
  const home = tempHome(); let daemon = await startDaemon({ home })
  const readers: ReadableStreamDefaultReader<Uint8Array>[] = []
  try {
    await expect(daemon.client.createPairing({})).rejects.toMatchObject({ code: 'pairing_network_disabled' })
    const original = await daemon.client.networkSettings(), listening = port(), base = `http://127.0.0.1:${listening}`
    await daemon.client.updateNetwork({ ...original, enabled: true, port: listening, origins: ['https://trusted.invalid'] })
    const invitation = await daemon.client.createPairing({}), payload = JSON.parse(decode(invitation.qr))
    expect(payload).toMatchObject({ type: 'hiroshi.pairing', version: 1 }); expect(payload.code).toHaveLength(43)
    expect(decode(invitation.qr)).toBe(invitation.payload)
    expect(invitation.links.every((link) => !new URL(link).hostname.startsWith('127.'))).toBe(true)
    expect(invitation.payload).not.toContain(daemon.record.token)
    expect(invitation.payload).not.toContain((await daemon.client.networkToken()).token)
    const link = base + new URL(invitation.links[0]!).pathname
    const preview = await daemonFetch(link)
    expect(preview.status).toBe(200); expect(await preview.text()).toContain('Pair with Hiroshi')
    expect((await daemon.client.pairingState()).devices).toHaveLength(0)
    const redeem = (code: string, name: string, extra: Record<string, string> = {}) => daemonFetch(`${base}/v1/pairing/redeem`, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify({ code, name }) })
    expect((await redeem(payload.code, 'Untrusted browser', { origin: 'https://evil.invalid' })).status).toBe(403)
    const response = await redeem(payload.code, 'Phone', { origin: 'https://trusted.invalid' })
    expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('access-control-allow-origin')).toBe('https://trusted.invalid')
    const phone = await response.json() as PairingConnection
    expect(phone.server).toMatchObject({ name: 'Hiroshi', transport: 'http-sse' }); expect(phone.server.id).toBe(payload.serverID)
    expect((await redeem(payload.code, 'Replay')).status).toBe(400)
    const client = engineClient({ url: base, token: phone.token })
    expect((await client.health()).pid).toBe(daemon.health.pid)
    for (const path of ['/v1/network/token/', '/v1/network/pairing/', '/v1/network/pairing/create', '/v1/network/devices/revoke']) {
      const request = await daemonFetch(base + path, { method: path.endsWith('pairing/') ? 'GET' : 'POST', headers: { authorization: `Bearer ${phone.token}`, 'content-type': 'application/json' }, body: path.endsWith('pairing/') ? undefined : '{}' })
      expect(request.status).toBe(403)
    }
    const { session } = await client.createSession({})
    await client.prompt({ id: session.id, text: 'paired device prompt', model: 'local/echo' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps[0]?.status === 'succeeded')
    const feed = await daemonFetch(base + '/v1/events', { headers: { authorization: `Bearer ${phone.token}` } })
    const reader = feed.body!.getReader(); readers.push(reader); await reader.read()
    const next = await daemon.client.createPairing({}), tablet = await (await redeem(JSON.parse(next.payload).code, 'Tablet')).json() as PairingConnection
    await daemon.client.revokePairedDevice({ deviceID: phone.device.id, revision: (await daemon.client.pairingState()).revision })
    const ended = await Promise.race([(async () => { for (let i = 0; i < 100; i++) if ((await reader.read()).done) return true; return false })().catch(() => true), Bun.sleep(2000).then(() => false)])
    expect(ended).toBe(true)
    await expect(client.health()).rejects.toMatchObject({ status: 401 })
    expect((await engineClient({ url: base, token: tablet.token }).health()).pid).toBe(daemon.health.pid)
    const saved = readFileSync(join(home, 'paired-devices.json'), 'utf8')
    expect(saved).not.toContain(tablet.token); expect(saved).not.toContain(phone.token)
    const pending = await daemon.client.createPairing({})
    await daemon.crash(); daemon = await startDaemon({ home })
    expect((await redeem(JSON.parse(pending.payload).code, 'Lost grant')).status).toBe(400)
    expect((await engineClient({ url: base, token: tablet.token }).health()).pid).toBe(daemon.health.pid)
    expect((await daemon.client.pairingState()).devices.map((d) => d.name)).toEqual(['Tablet'])
    await daemon.client.rotateNetworkToken({ revision: (await daemon.client.networkSettings()).revision })
    await expect(engineClient({ url: base, token: tablet.token }).health()).rejects.toMatchObject({ status: 401 })
    expect((await daemon.client.pairingState()).devices).toEqual([])
    expect(JSON.parse(readFileSync(join(home, 'network.json'), 'utf8')).serverID).toBe(phone.server.id)
  } finally { for (const reader of readers) await reader.cancel().catch(() => {}); await daemon.stop() }
}, 45000)

test('concurrent network redemption has one winner; body limits and cancellation do not leak or consume valid codes', async () => {
  const daemon = await startDaemon()
  try {
    const listening = port(), base = `http://127.0.0.1:${listening}`
    await daemon.client.updateNetwork({ ...(await daemon.client.networkSettings()), enabled: true, port: listening, origins: [] })
    const invitation = await daemon.client.createPairing({ address: 'https://my-endpoint.invalid' }), code = JSON.parse(invitation.payload).code
    expect(invitation.links[0]).toStartWith('https://my-endpoint.invalid/pair/')
    expect((await daemonFetch(base + '/v1/pairing/redeem', { method: 'POST', body: 'x'.repeat(5000) })).status).toBe(400)
    const attempt = () => daemonFetch(base + '/v1/pairing/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, name: 'Race winner' }) })
    const responses = await Promise.all([attempt(), attempt()])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400])
    expect((await daemon.client.pairingState()).devices).toHaveLength(1)
    const canceled = await daemon.client.createPairing({})
    await daemon.client.cancelPairing({ grantID: canceled.id })
    expect((await daemonFetch(base + '/v1/pairing/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: JSON.parse(canceled.payload).code, name: 'Canceled' }) })).status).toBe(400)
    await expect(daemon.client.createPairing({ address: 'http://untrusted.invalid' })).rejects.toMatchObject({ code: 'pairing_address' })
  } finally { await daemon.stop() }
}, 30000)
