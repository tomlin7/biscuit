/** One daemon-owned tunnel. Intent persists; connection state and invitations do not. */
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, statSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { conflict, invalid } from './errors'
import type { InternetSettings } from './protocol'
import type { NetworkAccess } from './network-access'
import type { OpenTunnelClientEvent, OpenTunnelConnection } from '@opentunnel/client'

interface Saved { version: 1; revision: number; enabled: boolean; route: string }
export interface TunnelClient {
  connect(input: { routes: Record<string, string>; signal: AbortSignal; onRouteConflict: 'fail'; onEvent: (event: OpenTunnelClientEvent) => void }): Promise<Pick<OpenTunnelConnection, 'urls' | 'closed'>>
  dispose(): Promise<void>
}
export type TunnelFactory = (home: string) => Promise<TunnelClient>
export const openTunnel: TunnelFactory = async (home) => {
  const { create, OpenTunnelStorage } = await import('@opentunnel/client')
  // Keep identity/certificates separate from other applications and CLI profiles.
  const client = create({ store: OpenTunnelStorage.xdg({ env: { XDG_DATA_HOME: join(home, 'remote') }, home }) })
  return { connect: (input) => client.tunnel.connect(input), dispose: () => client.dispose() }
}
export class InternetAccess {
  readonly file: string
  #saved: Saved = { version: 1, revision: 0, enabled: false, route: randomBytes(16).toString('hex') }
  #state: InternetSettings['state'] = 'disabled'
  #error: string | null = null
  #invalid = false
  #origin: string | null = null
  #grantID?: string
  #generation = 0
  #controller?: AbortController
  #gateway?: ReturnType<NetworkAccess['openGateway']>
  #task?: Promise<void>
  #changing = false
  #closed = false
  constructor(readonly home: string, readonly network: NetworkAccess, readonly options: { factory?: TunnelFactory; setupTimeoutMs?: number; stopTimeoutMs?: number } = {}) {
    this.file = join(home, 'internet.json')
    try {
      if (statSync(this.file).size > 4096) throw new Error('size')
      const saved = JSON.parse(readFileSync(this.file, 'utf8')) as Saved
      if (saved.version !== 1 || !Number.isSafeInteger(saved.revision) || saved.revision < 0 || typeof saved.enabled !== 'boolean' || !/^[a-f0-9]{32}$/.test(saved.route)) throw new Error('shape')
      this.#saved = saved
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') { this.#invalid = true; this.#state = 'failed'; this.#error = 'Saved internet configuration is invalid and has been preserved. Local access remains available.' } }
    if (this.#saved.enabled && !this.#invalid) this.#start()
  }
  snapshot(): InternetSettings { return { revision: this.#saved.revision, enabled: this.#saved.enabled, state: this.#state, url: this.#state === 'connected' ? this.#origin : null, error: this.#error } }
  invite() {
    if (this.#state !== 'connected' || !this.#origin) throw conflict('internet_unavailable', 'Wait for internet access to connect before creating a remote invitation.')
    const invitation = this.network.inviteRemote(this.#origin)
    this.#grantID = invitation.id
    return invitation
  }
  #persist(next: Saved) {
    const temporary = `${this.file}.${randomUUID()}.tmp`
    try { writeFileSync(temporary, JSON.stringify(next), { flag: 'wx', mode: 0o600 }); renameSync(temporary, this.file) }
    finally { try { unlinkSync(temporary) } catch {} }
    this.#saved = next
  }
  async update(input: { revision: number; enabled: boolean }) {
    if (this.#closed) throw conflict('internet_closed', 'The daemon is shutting down.')
    if (this.#invalid) throw invalid('internet_configuration', this.#error!)
    if (this.#changing) throw conflict('internet_busy', 'Wait for the previous internet access change to finish.')
    if (input?.revision !== this.#saved.revision) throw conflict('internet_revision', 'Internet settings changed. Refresh before applying changes.')
    if (typeof input?.enabled !== 'boolean') throw invalid('internet_settings', 'Choose an explicit internet access setting.')
    this.#changing = true
    try {
      this.#persist({ ...this.#saved, revision: this.#saved.revision + 1, enabled: input.enabled })
      await this.#stop()
      this.#state = 'disabled'; this.#error = null
      if (input.enabled) this.#start()
      return this.snapshot()
    } finally { this.#changing = false }
  }
  #start() {
    const generation = ++this.#generation, controller = new AbortController()
    this.#controller = controller; this.#state = 'starting'; this.#error = null
    const live = () => generation === this.#generation && !controller.signal.aborted
    this.#task = (async () => {
      let client: TunnelClient | undefined, timer: ReturnType<typeof setTimeout> | undefined
      try {
        this.#gateway = this.network.openGateway(() => this.#origin)
        timer = setTimeout(() => controller.abort(new Error('setup timeout')), this.options.setupTimeoutMs ?? 300000)
        client = await (this.options.factory ?? openTunnel)(this.home)
        controller.signal.throwIfAborted()
        const connection = await client.connect({ routes: { [this.#saved.route]: this.#gateway.target }, signal: controller.signal, onRouteConflict: 'fail', onEvent: (event) => {
          if (!live()) return
          if (event.type === 'connected' && this.#origin) this.#state = 'connected'
          if (['disconnected', 'reconnecting', 'connecting'].includes(event.type) && this.#origin) this.#state = 'reconnecting'
        } })
        clearTimeout(timer); timer = undefined
        if (!live()) return
        const origin = connection.urls[this.#saved.route]
        const url = new URL(origin ?? '')
        if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw new Error('invalid tunnel URL')
        this.#origin = origin!; this.#state = 'connected'
        await connection.closed
        if (live()) { this.#state = 'failed'; this.#error = 'The internet tunnel stopped. Retry to reconnect.' }
      } catch {
        if (generation === this.#generation) { this.#state = 'failed'; this.#error = controller.signal.aborted ? 'Internet setup timed out. Check your connection and retry.' : 'Could not connect the internet tunnel. Check proxy, network and certificate settings, then retry.' }
      } finally {
        if (timer) clearTimeout(timer)
        if (generation === this.#generation) { this.#origin = null; this.#gateway?.close(); this.#gateway = undefined }
        await client?.dispose().catch(() => {})
      }
    })()
  }
  async #stop() {
    ++this.#generation
    this.#state = 'disabled'
    this.#controller?.abort(); this.#gateway?.close(); this.#gateway = undefined; this.#origin = null
    if (this.#grantID) this.network.pairing.cancel(this.#grantID)
    this.#grantID = undefined
    if (this.#task) {
      let timer: ReturnType<typeof setTimeout> | undefined
      try { await Promise.race([this.#task, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(conflict('internet_stopping', 'Internet cleanup is still pending. Retry after it finishes.')), this.options.stopTimeoutMs ?? 10000) })]) }
      catch (error) { this.#state = 'failed'; this.#error = 'Internet cleanup is still pending. Retry after it finishes.'; throw error }
      finally { if (timer) clearTimeout(timer) }
      this.#task = undefined
    }
  }
  close() { this.#closed = true; this.#state = 'disabled'; return this.#stop() }
}
