/** One-time grants never contain an owner token. Device secrets are returned once. */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync, statSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { conflict, invalid, EngineError } from './errors'
import type { PairedDevice, PairingGrant, PairingState } from './protocol'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const GRANT_TTL = 5 * 60_000, DEVICE_TTL = 90 * 86400_000, MAX_DEVICES = 32
interface Device extends PairedDevice { hash: string; authority: string }
interface Saved { version: 1; revision: number; devices: Device[] }
interface Grant { id: string; hash: string; authority: string; expiresAt: number; state: PairingGrant['state'] }
export class Pairing {
  readonly file: string
  #saved: Saved = { version: 1, revision: 0, devices: [] }
  #error: string | null = null
  #grants = new Map<string, Grant>()
  #bucket = { at: 0, count: 0 }
  constructor(home: string, readonly authority: () => string, readonly now: () => number = Date.now) {
    this.file = join(home, 'paired-devices.json')
    try {
      if (statSync(this.file).size > 64 * 1024) throw new Error('size')
      const value = JSON.parse(readFileSync(this.file, 'utf8')) as Saved
      if (value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.devices) || value.devices.length > MAX_DEVICES) throw new Error('shape')
      const ids = new Set<string>(), secrets = new Set<string>()
      for (const device of value.devices) {
        if (typeof device.id !== 'string' || !/^[a-f0-9-]{36}$/.test(device.id) || ids.has(device.id) || !/^[a-f0-9]{64}$/.test(device.hash) || secrets.has(device.hash) || !/^[a-f0-9]{64}$/.test(device.authority) || typeof device.name !== 'string' || !device.name.trim() || device.name.length > 80 || !Number.isSafeInteger(device.createdAt) || !Number.isSafeInteger(device.expiresAt) || device.expiresAt <= device.createdAt) throw new Error('device')
        ids.add(device.id); secrets.add(device.hash)
      }
      this.#saved = value
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') this.#error = 'Saved paired-device credentials are invalid and have been preserved. Pairing is unavailable; local access remains available.' }
  }
  #assert() { if (this.#error) throw invalid('pairing_configuration', this.#error) }
  #commit(next: Saved) {
    const file = `${this.file}.${randomUUID()}.tmp`
    try { writeFileSync(file, JSON.stringify(next), { flag: 'wx', mode: 0o600 }); renameSync(file, this.file) }
    finally { try { unlinkSync(file) } catch {} }
    this.#saved = next
  }
  #active() { return this.#saved.devices.filter((d) => d.expiresAt > this.now() && same(d.authority, hash(this.authority()))) }
  #expire() {
    for (const grant of this.#grants.values()) if (grant.state === 'pending' && (grant.expiresAt <= this.now() || !same(grant.authority, hash(this.authority())))) grant.state = grant.expiresAt <= this.now() ? 'expired' : 'canceled'
  }
  state(): PairingState {
    this.#assert(); this.#expire()
    return { revision: this.#saved.revision, devices: this.#active().map(({ id, name, createdAt, expiresAt }) => ({ id, name, createdAt, expiresAt })), grants: [...this.#grants.values()].map(({ id, expiresAt, state }) => ({ id, expiresAt, state })) }
  }
  create(): PairingGrant & { code: string } {
    this.#assert(); this.#expire()
    if (this.#active().length >= MAX_DEVICES) throw conflict('pairing_limit', 'Revoke an unused device before pairing another one.')
    this.cancel()
    const code = randomBytes(32).toString('base64url'), grant: Grant = { id: randomUUID(), hash: hash(code), authority: hash(this.authority()), expiresAt: this.now() + GRANT_TTL, state: 'pending' }
    this.#grants.set(grant.id, grant)
    while (this.#grants.size > 16) this.#grants.delete(this.#grants.keys().next().value!)
    return { id: grant.id, expiresAt: grant.expiresAt, state: 'pending', code }
  }
  cancel(id?: string) {
    for (const grant of this.#grants.values()) if (grant.state === 'pending' && (!id || grant.id === id)) grant.state = 'canceled'
  }
  redeem(code: unknown, name: unknown) {
    this.#assert(); this.#expire()
    if (this.now() - this.#bucket.at >= 60_000) this.#bucket = { at: this.now(), count: 0 }
    if (++this.#bucket.count > 60) throw new EngineError(429, 'pairing_rate_limit', 'Too many pairing attempts. Try again in a minute.')
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code) || typeof name !== 'string' || !name.trim() || name.trim().length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw invalid('pairing_request', 'Provide a pairing code and a device name of at most 80 characters.')
    const grant = [...this.#grants.values()].find((g) => same(g.hash, hash(code)) && g.state === 'pending')
    if (!grant) throw invalid('pairing_unavailable', 'This pairing code expired, was canceled, or has already been used.')
    if (this.#active().length >= MAX_DEVICES) throw conflict('pairing_limit', 'The paired-device limit has been reached.')
    const token = `hd_${randomBytes(32).toString('base64url')}`, device: Device = { id: randomUUID(), name: name.trim(), createdAt: this.now(), expiresAt: this.now() + DEVICE_TTL, hash: hash(token), authority: hash(this.authority()) }
    // Persist first. On disk failure the code remains redeemable and no
    // credential is issued; a successful exchange is never replayable.
    this.#commit({ version: 1, revision: this.#saved.revision + 1, devices: [...this.#active(), device] })
    grant.state = 'redeemed'
    return { token, device: { id: device.id, name: device.name, createdAt: device.createdAt, expiresAt: device.expiresAt } }
  }
  authenticate(token: string): PairedDevice | null {
    if (this.#error || !/^hd_[A-Za-z0-9_-]{43}$/.test(token)) return null
    const device = this.#active().find((d) => same(d.hash, hash(token)))
    return device ? { id: device.id, name: device.name, createdAt: device.createdAt, expiresAt: device.expiresAt } : null
  }
  revoke(id: string, revision: number) {
    this.#assert()
    if (revision !== this.#saved.revision) throw conflict('pairing_revision', 'Paired devices changed. Refresh before revoking access.')
    if (!this.#active().some((d) => d.id === id)) throw invalid('paired_device', 'Choose an active paired device.')
    this.#commit({ version: 1, revision: this.#saved.revision + 1, devices: this.#active().filter((d) => d.id !== id) })
    return this.state()
  }
}
