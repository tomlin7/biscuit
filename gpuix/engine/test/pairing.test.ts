import { expect, test } from 'bun:test'
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { Pairing } from '../src/pairing'
import { tempHome } from './harness'

test('single-use pairing persists only hashed device credentials, survives restart and supports independent revocation', () => {
  const home = tempHome(); let authority = 'owner-network-key'
  try {
    const pairing = new Pairing(home, () => authority), first = pairing.create(), result = pairing.redeem(first.code, 'My phone')
    expect(pairing.authenticate(result.token)?.name).toBe('My phone')
    expect(() => pairing.redeem(first.code, 'Replay')).toThrow('already been used')
    expect(JSON.stringify(pairing.state())).not.toContain(result.token)
    const saved = readFileSync(pairing.file, 'utf8')
    expect(saved).not.toContain(result.token); expect(saved).not.toContain(first.code); expect(saved).not.toContain(authority)
    const next = new Pairing(home, () => authority)
    expect(next.authenticate(result.token)?.id).toBe(result.device.id)
    const second = next.redeem(next.create().code, 'Tablet')
    next.revoke(result.device.id, next.state().revision)
    expect(next.authenticate(result.token)).toBeNull(); expect(next.authenticate(second.token)).not.toBeNull()
    expect(new Pairing(home, () => authority).authenticate(result.token)).toBeNull()
    expect(() => next.revoke(second.device.id, 0)).toThrow('changed')
    authority = 'rotated-network-key'
    expect(next.authenticate(second.token)).toBeNull(); expect(next.state().devices).toEqual([])
  } finally { rmSync(home, { recursive: true, force: true }) }
})
test('expiry, regeneration, cancellation, restart and rate/capacity limits fail closed', () => {
  const home = tempHome(); let now = 100000
  try {
    const pairing = new Pairing(home, () => 'key', () => now), old = pairing.create(), fresh = pairing.create()
    expect(() => pairing.redeem(old.code, 'Old')).toThrow('canceled')
    pairing.cancel(fresh.id); expect(() => pairing.redeem(fresh.code, 'Canceled')).toThrow('canceled')
    const expiring = pairing.create(); now = expiring.expiresAt
    expect(() => pairing.redeem(expiring.code, 'Expired')).toThrow('expired')
    expect(pairing.state().grants.find((g) => g.id === expiring.id)?.state).toBe('expired')
    const lost = pairing.create(), restart = new Pairing(home, () => 'key', () => now)
    expect(() => restart.redeem(lost.code, 'After restart')).toThrow('expired')
    for (let i = 0; i < 60; i++) { try { pairing.redeem('bad', 'Invalid') } catch {} }
    expect(() => pairing.redeem(pairing.create().code, 'Limited')).toThrow('Too many')
    now += 60000
    for (let i = 0; i < 32; i++) pairing.redeem(pairing.create().code, `Device ${i}`)
    expect(() => pairing.create()).toThrow('unused device')
    expect(pairing.state().grants.length).toBeLessThanOrEqual(16)
    now += 91 * 86400000
    expect(pairing.state().devices).toHaveLength(0)
  } finally { rmSync(home, { recursive: true, force: true }) }
})
test('invalid persisted credentials are preserved and device input cannot corrupt the registry', () => {
  const home = tempHome()
  try {
    const pairing = new Pairing(home, () => 'key'), grant = pairing.create()
    expect(() => pairing.redeem(grant.code, 'bad\nname')).toThrow('device name')
    expect(() => pairing.redeem(grant.code, '')).toThrow('device name')
    expect(pairing.redeem(grant.code, 'Good phone').token).toMatch(/^hd_/)
    writeFileSync(pairing.file, '{broken')
    const broken = new Pairing(home, () => 'key')
    expect(broken.authenticate('hd_' + 'a'.repeat(43))).toBeNull()
    expect(() => broken.create()).toThrow('preserved')
    expect(readFileSync(pairing.file, 'utf8')).toBe('{broken')
  } finally { rmSync(home, { recursive: true, force: true }) }
})

test('a failed credential write does not consume the invitation', () => {
  const home = tempHome()
  try {
    const pairing = new Pairing(home, () => 'key'), grant = pairing.create()
    mkdirSync(pairing.file)
    expect(() => pairing.redeem(grant.code, 'Phone')).toThrow()
    expect(pairing.state().grants[0]?.state).toBe('pending')
    expect(pairing.state().devices).toHaveLength(0)
    rmSync(pairing.file, { recursive: true })
    expect(pairing.authenticate(pairing.redeem(grant.code, 'Phone').token)?.name).toBe('Phone')
  } finally { rmSync(home, { recursive: true, force: true }) }
})
