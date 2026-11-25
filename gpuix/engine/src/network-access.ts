import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { hostname, networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { conflict, invalid, EngineError } from './errors'
import { Pairing } from './pairing'
import { ENGINE_VERSION, PROTOCOL_VERSION, matchOperation } from './protocol'
import { renderSVG } from 'uqr'
import type { NetworkSettings, NetworkUpdate } from './protocol'

interface Saved { version: 1; revision: number; enabled: boolean; port: number; origins: string[]; token: string; serverID?: string }
const equal = (a: string, b: string) => { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right) }
const localOnly = new Set(['/v1/network', '/v1/network/settings', '/v1/network/token', '/v1/network/rotate', '/v1/shutdown'])
const ownerOperations = new Set(['networkSettings', 'updateNetwork', 'networkToken', 'rotateNetworkToken', 'shutdown', 'pairingState', 'createPairing', 'cancelPairing', 'revokePairedDevice', 'internetSettings', 'updateInternet'])
export function networkAddresses(port: number): string[] {
  const addresses = Object.values(networkInterfaces()).flatMap((items) => items ?? []).filter((item) => !item.internal && item.family === 'IPv4' && !item.address.startsWith('127.')).map((item) => item.address)
  const rank = (address: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.)/.test(address) ? 0 : 1
  return [...new Set(addresses)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).slice(0, 8).map((ip) => `http://${ip}:${port}`).concat(`http://${hostname()}:${port}`)
}

export function networkOrigins(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 32) throw invalid('network_origins', 'Provide at most 32 exact HTTP or HTTPS origins.')
  return [...new Set(value.map((origin: unknown) => {
    if (typeof origin !== 'string' || origin.length > 2048) throw invalid('network_origins', 'Browser origins must be exact HTTP or HTTPS origins.')
    let url: URL
    try { url = new URL(origin) } catch { throw invalid('network_origins', 'Browser origins must be exact HTTP or HTTPS origins.') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || origin.includes('*')) {
      throw invalid('network_origins', 'Origins cannot contain paths, credentials, queries, fragments or wildcards.')
    }
    return url.origin
  }))]
}

/** A separate listener and credential. Configuration is available only through
 * the private loopback server; no token enters discovery, health, or the feed. */
export class NetworkAccess {
  #saved: Saved = { version: 1, revision: 0, enabled: false, port: 34123, origins: [], token: randomBytes(32).toString('hex') }
  #server: ReturnType<typeof Bun.serve> | null = null
  #error: string | null = null
  #invalid = false
  readonly #file: string
  readonly pairing: Pairing
  #connections = new Map<AbortController, string | null>()
  #redeeming = 0
  constructor(home: string, readonly dispatch: (request: Request) => Promise<Response>, readonly localToken: string) {
    this.#file = join(home, 'network.json')
    try {
      const raw = readFileSync(this.#file, 'utf8')
      if (raw.length > 128 * 1024) throw new Error('size')
      const value = JSON.parse(raw) as Saved
      if (value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error('shape')
      this.#validate(value)
      if (value.serverID !== undefined && (typeof value.serverID !== 'string' || !/^[a-f0-9-]{36}$/.test(value.serverID))) throw new Error('server identity')
      this.#saved = { ...value, serverID: value.serverID ?? randomUUID(), origins: networkOrigins(value.origins) }
      if (!value.serverID) this.#persist(this.#saved)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.#saved.serverID = randomUUID()
        try { this.#persist(this.#saved) } catch { this.#invalid = true; this.#error = 'Could not save network credentials. Network access is disabled; local access remains available.' }
      }
      else { this.#invalid = true; this.#error = 'Saved network configuration is invalid and has been preserved. Network access is disabled.' }
    }
    this.pairing = new Pairing(home, () => this.#saved.token)
    if (this.#saved.enabled && !this.#invalid) {
      try { this.#server = this.#listen(this.#saved) } catch { this.#error = `Could not listen on port ${this.#saved.port}. Local access is still available.` }
    }
  }
  #validate(input: Pick<Saved, 'enabled' | 'port' | 'origins'>) {
    if (typeof input.enabled !== 'boolean' || !Number.isInteger(input.port) || input.port < 1024 || input.port > 65535) {
      throw invalid('network_settings', 'Choose a port between 1024 and 65535 and an explicit exposure setting.')
    }
    networkOrigins(input.origins)
  }
  #persist(saved: Saved) {
    const temporary = `${this.#file}.${randomUUID()}.tmp`
    try { writeFileSync(temporary, JSON.stringify(saved), { flag: 'wx', mode: 0o600 }); renameSync(temporary, this.#file) }
    finally { try { unlinkSync(temporary) } catch {} }
  }
  #listen(saved: Saved, hostname = '0.0.0.0', port = saved.port, owned = new Set<AbortController>(), publicOrigin?: () => string | null) {
    return Bun.serve({ hostname, port, maxRequestBodySize: 2 * 1024 * 1024, idleTimeout: 60, development: false,
      fetch: async (request: Request) => {
        const config = publicOrigin ? this.#saved : saved
        const url = new URL(request.url), origin = request.headers.get('origin')
        const deny = (status: number, message: string) => Response.json({ error: { code: 'network_access', message } }, { status })
        const operation = matchOperation(request.method, url.pathname)?.operation.name
        if (localOnly.has(url.pathname) || operation && ownerOperations.has(operation)) return deny(403, 'This operation is available only through the private local listener.')
        if (url.pathname === '/v1/pairing/redeem' || /^\/pair\/[A-Za-z0-9_-]{43}$/.test(url.pathname)) return this.#redeem(request, publicOrigin?.())
        if (origin !== null && !config.origins.includes(origin)) return deny(403, 'This browser origin is not allowed.')
        const cors: Record<string, string> = { 'cache-control': 'no-store', vary: 'Origin' }
        if (origin) cors['access-control-allow-origin'] = origin
        if (request.method === 'OPTIONS') {
          const method = request.headers.get('access-control-request-method')
          const headers = (request.headers.get('access-control-request-headers') ?? '').toLowerCase().split(',').map((value) => value.trim()).filter(Boolean)
          if (!origin || !['GET', 'POST'].includes(method ?? '') || headers.some((name) => !['authorization', 'content-type'].includes(name))) return deny(403, 'Unsupported browser preflight.')
          return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'authorization, content-type' } })
        }
        const credential = request.headers.get('authorization') ?? ''
        let response: Response
        const device = credential.startsWith('Bearer ') ? this.pairing.authenticate(credential.slice(7)) : null
        if (!equal(credential, `Bearer ${config.token}`) && !device) response = deny(401, 'A network bearer token is required.')
        else {
          if (this.#connections.size >= 64) return deny(429, 'Too many active network requests.')
          const controller = new AbortController()
          this.#connections.set(controller, device?.id ?? null)
          owned.add(controller)
          const lease = setTimeout(() => controller.abort(), Math.min(600000, device ? device.expiresAt - Date.now() : 600000))
          const cleanup = () => { clearTimeout(lease); this.#connections.delete(controller); owned.delete(controller) }
          let responseReader: ReadableStreamDefaultReader<Uint8Array> | undefined
          controller.signal.addEventListener('abort', () => { cleanup(); void responseReader?.cancel().catch(() => {}) }, { once: true })
          const headers = new Headers(request.headers); headers.set('authorization', `Bearer ${this.localToken}`)
          try {
            response = await this.dispatch(new Request(request, { headers, signal: AbortSignal.any([request.signal, controller.signal]) }))
            if (!response.body) cleanup()
            else {
              const reader = response.body.getReader()
              responseReader = reader
              response = new Response(new ReadableStream({
                async pull(stream) { try { const next = await reader.read(); if (next.done) { cleanup(); stream.close() } else stream.enqueue(next.value) } catch (error) { cleanup(); stream.error(error) } },
                async cancel() { controller.abort(); cleanup(); await reader.cancel().catch(() => {}) },
              }), { status: response.status, headers: response.headers })
            }
          } catch { controller.abort(); cleanup(); return deny(503, 'The network request could not be completed.') }
        }
        for (const [key, value] of Object.entries(cors)) response.headers.set(key, value)
        return response
      },
    })
  }
  snapshot(): NetworkSettings {
    return { revision: this.#saved.revision, enabled: this.#saved.enabled, active: !!this.#server, port: this.#saved.port,
      origins: [...this.#saved.origins], urls: this.#server ? networkAddresses(this.#saved.port) : [], error: this.#error,
      transport: 'HTTP / Server-Sent Events' }
  }
  token() { return this.#saved.token }
  /** The TLS tunnel gets a public-auth gateway, never the private owner listener. */
  openGateway(publicOrigin: () => string | null) {
    if (this.#invalid) throw invalid('network_configuration', this.#error!)
    const owned = new Set<AbortController>(), server = this.#listen(this.#saved, '127.0.0.1', 0, owned, publicOrigin)
    return { target: `127.0.0.1:${server.port}`, close: () => { for (const controller of owned) controller.abort(); owned.clear(); server.stop(true) } }
  }
  inviteRemote(address: string) {
    const [origin] = networkOrigins([address])
    if (!origin?.startsWith('https://')) throw invalid('pairing_address', 'Internet pairing requires an HTTPS endpoint.')
    return this.#invitation([origin])
  }
  invite(address?: string) {
    if (!this.#server || !this.#saved.enabled || this.#invalid) throw conflict('pairing_network_disabled', 'Enable network access before pairing a device.')
    let urls = this.snapshot().urls.slice(0, 4)
    if (address !== undefined && address !== '') {
      if (address.length > 512) throw invalid('pairing_address', 'The pairing address must be at most 512 characters.')
      const [origin] = networkOrigins([address])
      if (!origin!.startsWith('https://') && !this.snapshot().urls.includes(origin!)) throw invalid('pairing_address', 'Choose an advertised LAN address or an HTTPS endpoint you control.')
      urls = [origin!]
    }
    return this.#invitation(urls)
  }
  #invitation(urls: string[]) {
    const grant = this.pairing.create()
    const payload = JSON.stringify({ type: 'hiroshi.pairing', version: 1, serverID: this.#saved.serverID, protocol: PROTOCOL_VERSION, code: grant.code, urls, expiresAt: grant.expiresAt })
    return { id: grant.id, expiresAt: grant.expiresAt, state: grant.state, links: urls.map((url) => `${url}/pair/${grant.code}`), payload,
      qr: renderSVG(payload, { border: 4, ecc: 'M', pixelSize: 1 }) }
  }
  revokeDevice(id: string, revision: number) {
    const state = this.pairing.revoke(id, revision)
    for (const [controller, device] of this.#connections) if (device === id) { controller.abort(); this.#connections.delete(controller) }
    return state
  }
  async #redeem(request: Request, publicOrigin?: string | null): Promise<Response> {
    const headers: Record<string, string> = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', vary: 'Origin', 'content-security-policy': "default-src 'none'; form-action 'self'; style-src 'unsafe-inline'" }
    const url = new URL(request.url), origin = request.headers.get('origin')
    const fail = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status, headers })
    if (origin && origin !== url.origin && origin !== publicOrigin && !this.#saved.origins.includes(origin)) return fail(403, 'network_origin', 'This browser origin is not allowed.')
    if (origin) headers['access-control-allow-origin'] = origin
    if (request.method === 'OPTIONS') {
      if (!origin || request.headers.get('access-control-request-method') !== 'POST' || (request.headers.get('access-control-request-headers') ?? '').toLowerCase().split(',').some((h) => h.trim() && h.trim() !== 'content-type')) return fail(403, 'pairing_preflight', 'Unsupported pairing preflight.')
      return new Response(null, { status: 204, headers: { ...headers, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } })
    }
    const code = /^\/pair\/([A-Za-z0-9_-]{43})$/.exec(url.pathname)?.[1]
    if (request.method === 'GET' && code) return new Response('<!doctype html><html><meta name="viewport" content="width=device-width"><title>Pair with Hiroshi</title><body style="font:16px system-ui;max-width:32rem;margin:4rem auto;padding:1rem"><h1>Pair with Hiroshi</h1><p>This single-use link connects a trusted device to your Hiroshi daemon. It expires after five minutes.</p><p>A paired device can access tasks, files, and agents on this computer.</p><form method="post"><label>Device name <input name="name" maxlength="80" required autocomplete="off"></label><p><button>Pair this device</button></p></form><p>A Hiroshi-compatible client can also scan the desktop QR code. No mobile application is installed by this page.</p></body></html>', { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } })
    if (request.method !== 'POST') return fail(405, 'pairing_method', 'Redeem pairing codes with POST.')
    if (this.#redeeming >= 8) return fail(429, 'pairing_busy', 'Too many concurrent pairing requests.')
    this.#redeeming++
    const reader = request.body?.getReader()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      let size = 0; const chunks: Uint8Array[] = []
      const read = async () => { if (!reader) return ''; for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 4096) throw invalid('pairing_body', 'Pairing requests are limited to 4 KiB.'); chunks.push(next.value) } return Buffer.concat(chunks).toString('utf8') }
      const text = await Promise.race([read(), new Promise<never>((_, reject) => { timer = setTimeout(() => { void reader?.cancel().catch(() => {}); reject(invalid('pairing_timeout', 'The pairing request timed out.')) }, 5000) })])
      let input: { code?: unknown; name?: unknown }
      if (code) input = { code, name: new URLSearchParams(text).get('name') }
      else { try { input = JSON.parse(text) } catch { throw invalid('pairing_body', 'Provide a JSON pairing request.') } }
      const result = this.pairing.redeem(input?.code, input?.name)
      return Response.json({ type: 'hiroshi.connection', version: 1, server: { id: this.#saved.serverID, name: 'Hiroshi', version: ENGINE_VERSION, protocol: PROTOCOL_VERSION, transport: 'http-sse', capabilities: ['sessions', 'prompts', 'events', 'permissions', 'device-revocation'] }, ...result }, { headers })
    } catch (error) { if (error instanceof EngineError) return fail(error.status, error.code, error.message); return fail(400, 'pairing_request', 'The pairing request could not be completed.') }
    finally { this.#redeeming--; if (timer) clearTimeout(timer); if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock() } }
  }
  update(input: NetworkUpdate, rotate = false): NetworkSettings {
    if (this.#invalid) throw invalid('network_configuration', this.#error!)
    if (input.revision !== this.#saved.revision) throw conflict('network_revision', 'Network settings changed. Refresh before applying your changes.')
    this.#validate(input)
    const next: Saved = { version: 1, revision: this.#saved.revision + 1, enabled: input.enabled, port: input.port,
      origins: networkOrigins(input.origins), token: rotate ? randomBytes(32).toString('hex') : this.#saved.token, serverID: this.#saved.serverID }
    const old = this.#server, previous = this.#saved
    let candidate: typeof old = null, stoppedOld = false
    try {
      if (old && next.enabled && next.port === previous.port) { old.stop(true); stoppedOld = true }
      if (next.enabled) candidate = this.#listen(next)
      this.#persist(next)
      if (old && !stoppedOld) old.stop(true)
      this.#saved = next; this.#server = candidate; this.#error = null
      this.pairing.cancel()
      for (const controller of this.#connections.keys()) controller.abort()
      this.#connections.clear()
    } catch {
      candidate?.stop(true)
      if (stoppedOld) {
        try { this.#server = this.#listen(previous) } catch { this.#server = null; this.#error = 'The network listener could not be restored. Local access remains available.' }
      }
      throw invalid('network_apply', `Could not apply network settings on port ${next.port}. Check port availability and file permissions; previous settings were retained.`)
    }
    return this.snapshot()
  }
  rotate(revision: number) { return this.update({ ...this.#saved, revision }, true) }
  close() { this.pairing.cancel(); for (const controller of this.#connections.keys()) controller.abort(); this.#connections.clear(); this.#server?.stop(true); this.#server = null }
}
