import { expect, test } from 'bun:test'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { InternetAccess, type TunnelClient, type TunnelFactory } from '../src/internet-access'
import { NetworkAccess } from '../src/network-access'
import { tempHome, until } from './harness'
import { daemonFetch } from '../src/local-transport'

function fixture() {
  const home = tempHome(), network = new NetworkAccess(home, async (request) => Response.json({ owner: request.headers.get('authorization') }), 'local-owner')
  let opens = 0, disposed = 0, target = '', route = '', emit: Parameters<TunnelClient['connect']>[0]['onEvent'] = () => {}
  const factory: TunnelFactory = async (directory) => {
    expect(directory).toBe(home); opens++
    return { connect: async (input) => {
      route = Object.keys(input.routes)[0]!; target = input.routes[route]!; emit = input.onEvent
      expect(input.onRouteConflict).toBe('fail')
      const closed = new Promise<void>((resolve) => input.signal.addEventListener('abort', () => resolve(), { once: true }))
      return { urls: { [route]: `https://${route}.example.invalid` }, closed }
    }, dispose: async () => { disposed++ } }
  }
  return { home, network, factory, get opens() { return opens }, get disposed() { return disposed }, get target() { return target }, get route() { return route }, emit: (type: 'connected' | 'disconnected') => emit(type === 'connected' ? { type, session: 'test', routes: [route] } : { type, reason: 'network lost' }), cleanup: () => { network.close(); rmSync(home, { recursive: true, force: true }) } }
}

test('internet gateway stays independent of LAN exposure and enforces credentials, owner boundaries and rotation', async () => {
  const f = fixture(), internet = new InternetAccess(f.home, f.network, { factory: f.factory })
  try {
    expect(internet.snapshot()).toMatchObject({ enabled: false, state: 'disabled', url: null }); expect(f.opens).toBe(0)
    await internet.update({ revision: 0, enabled: true }); await until(() => internet.snapshot().state === 'connected')
    expect(f.network.snapshot().active).toBe(false)
    const url = `http://${f.target}`, invite = internet.invite(), code = JSON.parse(invite.payload).code
    expect(invite.links).toEqual([`${internet.snapshot().url}/pair/${code}`])
    const response = await daemonFetch(`${url}/v1/pairing/redeem`, { method: 'POST', headers: { origin: internet.snapshot().url! }, body: JSON.stringify({ code, name: 'Internet phone' }) })
    expect(response.status).toBe(200)
    const phone = await response.json() as { token: string }
    expect((await daemonFetch(`${url}/v1/health`)).status).toBe(401)
    const headers = { authorization: `Bearer ${phone.token}` }
    expect(await (await daemonFetch(`${url}/v1/health`, { headers })).json()).toEqual({ owner: 'Bearer local-owner' })
    for (const path of ['/v1/internet', '/v1/internet/', '/v1/network/token', '/v1/network/pairing', '/v1/shutdown']) expect((await daemonFetch(url + path, { headers })).status).toBe(403)
    const legacy = f.network.token(); f.network.rotate(f.network.snapshot().revision)
    expect((await daemonFetch(`${url}/v1/health`, { headers })).status).toBe(401)
    expect((await daemonFetch(`${url}/v1/health`, { headers: { authorization: `Bearer ${legacy}` } })).status).toBe(401)
    expect((await daemonFetch(`${url}/v1/health`, { headers: { authorization: `Bearer ${f.network.token()}` } })).status).toBe(200)
    await internet.update({ revision: 1, enabled: false })
    expect(internet.snapshot()).toMatchObject({ state: 'disabled', url: null }); expect(f.disposed).toBe(1)
    await expect(daemonFetch(`${url}/v1/health`)).rejects.toThrow()
  } finally { await internet.close(); f.cleanup() }
})

test('persistent intent/route, reconnect status, explicit retry and revision checks keep one connection', async () => {
  const f = fixture(); let internet = new InternetAccess(f.home, f.network, { factory: f.factory })
  try {
    const lan = f.network.pairing.create()
    await internet.update({ revision: 0, enabled: true }); await until(() => internet.snapshot().state === 'connected')
    expect(f.network.pairing.state().grants.find((g) => g.id === lan.id)?.state).toBe('pending')
    const original = internet.snapshot().url
    f.emit('disconnected'); expect(internet.snapshot()).toMatchObject({ state: 'reconnecting', url: null })
    expect(() => internet.invite()).toThrow('Wait for internet access')
    f.emit('connected'); expect(internet.snapshot().url).toBe(original)
    await expect(internet.update({ revision: 0, enabled: false })).rejects.toMatchObject({ code: 'internet_revision' })
    await internet.update({ revision: 1, enabled: true }); await until(() => internet.snapshot().state === 'connected')
    expect(f.opens).toBe(2); expect(f.disposed).toBe(1); expect(internet.snapshot().url).toBe(original)
    await internet.close()
    expect(f.network.pairing.state().grants.find((g) => g.id === lan.id)?.state).toBe('pending')
    internet = new InternetAccess(f.home, f.network, { factory: f.factory }); await until(() => internet.snapshot().state === 'connected')
    expect(internet.snapshot().url).toBe(original); expect(f.opens).toBe(3)
    expect(readFileSync(internet.file, 'utf8')).not.toContain('token')
  } finally { await internet.close(); f.cleanup() }
})

test('canceling setup fences stale events and rejects concurrent changes without launching another tunnel', async () => {
  const f = fixture(); let interrupted = false, emit: Parameters<TunnelClient['connect']>[0]['onEvent'] = () => {}, connections = 0
  const internet = new InternetAccess(f.home, f.network, { factory: async () => ({ connect: async (input) => { connections++; emit = input.onEvent; return await new Promise((_, reject) => input.signal.addEventListener('abort', () => { interrupted = true; reject(new Error('aborted')) })) }, dispose: async () => {} }) })
  try {
    await internet.update({ revision: 0, enabled: true }); await until(() => connections === 1)
    const stopping = internet.update({ revision: 1, enabled: false })
    await expect(internet.update({ revision: 2, enabled: true })).rejects.toMatchObject({ code: 'internet_busy' })
    await stopping; expect(interrupted).toBe(true)
    emit({ type: 'connected', session: 'stale', routes: [] })
    expect(internet.snapshot()).toMatchObject({ enabled: false, state: 'disabled', url: null }); expect(connections).toBe(1)
  } finally { await internet.close(); f.cleanup() }
})

test('setup timeout/fatal errors stop cleanly; malformed config is preserved without network setup', async () => {
  const f = fixture()
  let disposed = 0
  const internet = new InternetAccess(f.home, f.network, { setupTimeoutMs: 20, factory: async () => ({ connect: async (input) => await new Promise((_, reject) => input.signal.addEventListener('abort', () => reject(input.signal.reason))), dispose: async () => { disposed++ } }) })
  try {
    await internet.update({ revision: 0, enabled: true }); await until(() => internet.snapshot().state === 'failed')
    expect(internet.snapshot().error).toContain('timed out'); expect(disposed).toBe(1)
    await internet.close(); writeFileSync(internet.file, '{broken')
    const broken = new InternetAccess(f.home, f.network, { factory: f.factory })
    expect(broken.snapshot().state).toBe('failed'); expect(f.opens).toBe(0)
    await expect(broken.update({ revision: 0, enabled: true })).rejects.toMatchObject({ code: 'internet_configuration' })
    expect(readFileSync(broken.file, 'utf8')).toBe('{broken'); await broken.close()
  } finally { await internet.close(); f.cleanup() }
})

test('fatal setup errors are sanitized and require an explicit retry', async () => {
  const f = fixture(); let attempts = 0
  const internet = new InternetAccess(f.home, f.network, { factory: async () => { attempts++; throw new Error('private relay token must not escape') } })
  try {
    await internet.update({ revision: 0, enabled: true }); await until(() => internet.snapshot().state === 'failed')
    await Bun.sleep(30); expect(attempts).toBe(1)
    expect(JSON.stringify(internet.snapshot())).not.toContain('private relay token')
    await internet.update({ revision: 1, enabled: true }); await until(() => attempts === 2)
  } finally { await internet.close(); f.cleanup() }
})

test('a cleanup timeout never launches a replacement connection before old setup settles', async () => {
  const f = fixture(); let attempts = 0, finish: (() => void) | undefined
  const internet = new InternetAccess(f.home, f.network, { stopTimeoutMs: 20, factory: async () => ({ connect: async () => { attempts++; return await new Promise((_, reject) => { finish = () => reject(new Error('released')) }) }, dispose: async () => {} }) })
  try {
    await internet.update({ revision: 0, enabled: true }); await until(() => attempts === 1)
    await expect(internet.update({ revision: 1, enabled: false })).rejects.toMatchObject({ code: 'internet_stopping' })
    expect(internet.snapshot()).toMatchObject({ state: 'failed', url: null })
    await expect(internet.update({ revision: 2, enabled: true })).rejects.toMatchObject({ code: 'internet_stopping' })
    expect(attempts).toBe(1)
    finish!(); await internet.update({ revision: 3, enabled: false })
    expect(internet.snapshot().state).toBe('disabled')
  } finally { finish?.(); await internet.close(); f.cleanup() }
})
