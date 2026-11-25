import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { renderSVG } from 'uqr'
import type { EngineHandle } from '../engine/use-engine'
import type { InternetSettings as State } from '../../engine/src/protocol'
import { InternetSettings } from './InternetSettings'
import { DevicePairing } from './DevicePairing'

;(hasNativeTestRenderer ? describe : describe.skip)('internet controls', () => {
  it('explicitly enables, reports progress and HTTPS readiness, retries failure and disables setup', async () => {
    let state: State = { revision: 0, enabled: false, state: 'disabled', url: null, error: null }
    const updates: boolean[] = []
    const engine = { snapshot: { status: 'ready' }, internetSettings: async () => state, updateInternet: async (input: { revision: number; enabled: boolean }) => {
      expect(input.revision).toBe(state.revision); updates.push(input.enabled)
      state = { revision: state.revision + 1, enabled: input.enabled, state: input.enabled ? 'starting' : 'disabled', url: null, error: null }; return state
    } } as unknown as EngineHandle
    let received: State | null = null
    const receive = (next: State | null) => { received = next }
    const { render, renderer } = createTestRoot({ width: 900, height: 600 })
    render(<div style={{ width: 900, height: 600, backgroundColor: '#191919' }}><InternetSettings engine={engine} onChange={receive} /></div>)
    const app = await connectTest(renderer)
    try {
      await expect.poll(() => app.getByTestId('internet-status').textContent()).toContain('Off'); expect(updates).toEqual([])
      await app.getByTestId('internet-toggle').click()
      await expect.poll(() => app.getByTestId('internet-status').textContent()).toContain('Setting up')
      await new Promise((r) => setTimeout(r, 50))
      state = { ...state, state: 'connected', url: 'https://route.example.invalid' }
      await app.getByTestId('internet-refresh').click()
      await expect.poll(() => app.getByTestId('internet-url').textContent()).toBe(state.url)
      expect(received).toMatchObject({ state: 'connected' })
      await new Promise((r) => setTimeout(r, 50))
      state = { ...state, state: 'failed', url: null, error: 'Connection failed' }
      await app.getByTestId('internet-refresh').click(); await app.getByTestId('internet-retry').waitFor()
      await new Promise((r) => setTimeout(r, 50))
      await app.getByTestId('internet-retry').click()
      await expect.poll(() => updates).toEqual([true, true])
      await new Promise((r) => setTimeout(r, 50))
      await app.getByTestId('internet-toggle').click()
      await expect.poll(() => updates).toEqual([true, true, false])
      await expect.poll(() => app.getByTestId('internet-status').textContent()).toContain('Off')
    } finally { await app.close() }
  })
  it('pairs over the connected internet route with LAN disabled and removes stale QR codes on disconnection', async () => {
    let requests: unknown[] = []
    const engine = { snapshot: { status: 'ready' }, internetSettings: async () => state, pairingState: async () => ({ revision: 0, devices: [], grants: [] }), createPairing: async (...input: unknown[]) => {
      requests.push(input); return { id: 'invite', state: 'pending', expiresAt: Date.now() + 300000, payload: 'invitation', qr: renderSVG('invitation'), links: ['https://route.example.invalid/pair/test'] }
    } } as unknown as EngineHandle
    let state: State = { revision: 1, enabled: true, state: 'connected', url: 'https://route.example.invalid', error: null }
    const { render, renderer } = createTestRoot({ width: 900, height: 600 })
    const paint = () => render(<div style={{ width: 900, height: 600, backgroundColor: '#191919' }}><DevicePairing engine={engine} active={false} networkRevision={0} internet={state} /></div>)
    paint(); const app = await connectTest(renderer)
    try {
      await new Promise((r) => setTimeout(r, 50))
      await app.getByTestId('pairing-create').click(); await app.getByTestId('pairing-qr').waitFor()
      expect(requests).toEqual([[undefined, true]])
      for (let i = 0; i < 3; i++) { state = { ...state }; paint(); await new Promise((r) => setTimeout(r, 30)) }
      expect(await app.getByTestId('pairing-qr').all()).toHaveLength(1)
      state = { ...state, state: 'reconnecting', url: null }; paint()
      await expect.poll(() => app.getByTestId('pairing-qr').all()).toHaveLength(0)
      await app.getByTestId('pairing-create').click(); expect(requests).toHaveLength(1)
      expect(await app.getByTestId('pairing-unavailable').textContent()).toContain('Wait for internet access')
      await app.getByTestId('pairing-route-lan').click()
      await app.getByTestId('pairing-address').waitFor()
      expect(await app.getByTestId('pairing-unavailable').textContent()).toContain('Expose managed daemon')
    } finally { await app.close() }
  })
})
