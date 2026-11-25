import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { renderSVG } from 'uqr'
import type { EngineHandle } from '../engine/use-engine'
import type { PairingState } from '../../engine/src/protocol'
import { DevicePairing } from './DevicePairing'

;(hasNativeTestRenderer ? describe : describe.skip)('device pairing controls', () => {
  it('creates a visible QR/link, cancels the invitation, and revokes a saved device', async () => {
    let state: PairingState = { revision: 1, grants: [], devices: [{ id: 'phone', name: 'My phone', createdAt: Date.now(), expiresAt: Date.now() + 86400000 }] }
    let created = 0, canceled = '', revoked = ''
    const engine = { snapshot: { status: 'ready' }, pairingState: async () => state,
      createPairing: async () => { created++; const grant = { id: 'grant', state: 'pending' as const, expiresAt: Date.now() + 300000 }; state = { ...state, grants: [grant] }; return { ...grant, payload: 'test invitation', qr: renderSVG('test invitation'), links: ['http://192.168.1.2:34123/pair/test'] } },
      cancelPairing: async (id: string) => { canceled = id; state = { ...state, grants: [] }; return state },
      revokePairedDevice: async (id: string, revision: number) => { expect(revision).toBe(1); revoked = id; state = { ...state, revision: 2, devices: [] }; return state },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 900, height: 600 })
    render(<div style={{ width: 900, height: 600, overflowY: 'scroll', backgroundColor: '#191919' }}><DevicePairing engine={engine} active networkRevision={1} /></div>)
    const app = await connectTest(renderer)
    try {
      await expect.poll(() => app.getByTestId('pairing-device-count').textContent()).toBe('Paired devices · 1')
      await app.getByTestId('pairing-create').click()
      await app.getByTestId('pairing-qr').waitFor()
      expect(created).toBe(1)
      expect(await app.getByTestId('pairing-link-0').textContent()).toContain('/pair/test')
      await new Promise((r) => setTimeout(r, 50))
      await app.getByTestId('pairing-cancel').click()
      await expect.poll(() => canceled).toBe('grant')
      await expect.poll(() => app.getByTestId('pairing-notice').textContent()).toBe('Invitation canceled.')
      await new Promise((r) => setTimeout(r, 50))
      await app.getByTestId('pairing-revoke-phone').click()
      await expect.poll(() => revoked).toBe('phone')
      await expect.poll(() => app.getByTestId('pairing-device-count').textContent()).toBe('Paired devices · 0')
    } finally { await app.close() }
  })
  it('keeps pairing disabled while exposure is off and reports server failures', async () => {
    let calls = 0
    const engine = { snapshot: { status: 'ready' }, pairingState: async () => ({ revision: 0, devices: [], grants: [] }), createPairing: async () => { calls++; throw new Error('Listener unavailable') } } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 900, height: 600 })
    render(<div style={{ width: 900, height: 600 }}><DevicePairing engine={engine} active={false} networkRevision={0} /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('pairing-create').click(); expect(calls).toBe(0)
      render(<div style={{ width: 900, height: 600 }}><DevicePairing engine={engine} active networkRevision={1} /></div>)
      await new Promise((r) => setTimeout(r, 50))
      await app.getByTestId('pairing-create').click()
      await expect.poll(() => app.getByTestId('pairing-error').textContent()).toBe('Listener unavailable')
      expect(calls).toBe(1)
    } finally { await app.close() }
  })
})
