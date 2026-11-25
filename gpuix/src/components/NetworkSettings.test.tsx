import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import { NetworkSettings } from './NetworkSettings'

;(hasNativeTestRenderer ? describe : describe.skip)('daemon network settings', () => {
  it('applies listener settings, reveals/hides only on request and masks a regenerated token', async () => {
    let state = { revision: 0, enabled: false, active: false, port: 34123, origins: [], urls: [], error: null, transport: 'HTTP / Server-Sent Events' } as any
    let applied: any, revealed = 0, rotated = 0
    const engine = { networkSettings: async () => state, updateNetwork: async (input: any) => { applied = input; state = { ...input, revision: input.revision + 1, active: input.enabled, urls: input.enabled ? ['http://machine:34124'] : [], error: null, transport: state.transport }; return state },
      networkToken: async () => { revealed++; return 'private-network-token' }, rotateNetworkToken: async () => { rotated++; state = { ...state, revision: state.revision + 1 }; return state },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 1000, height: 800 })
    render(<NetworkSettings engine={engine} />)
    const app = await connectTest(renderer)
    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(revealed).toBe(0)
      await app.getByTestId('network-port').fill('34124')
      await app.getByTestId('network-origins').fill('http://localhost:3001')
      await app.getByTestId('network-toggle').click()
      await expect.poll(() => applied?.enabled).toBe(true)
      expect(applied).toMatchObject({ port: 34124, origins: ['http://localhost:3001'] })
      await expect.poll(async () => app.getByTestId('network-url').textContent()).toBe('http://machine:34124')
      await app.getByTestId('network-show-token').click(); await expect.poll(() => revealed).toBe(1)
      await expect.poll(async () => app.getByTestId('network-token').textContent()).toBe('private-network-token')
      await app.getByTestId('network-rotate').click(); await expect.poll(() => rotated).toBe(1)
      await expect.poll(async () => app.getByTestId('network-token').textContent()).not.toContain('private-network-token')
      await expect.poll(async () => app.getByTestId('network-apply').textContent()).toBe('Apply')
      await app.getByTestId('network-toggle').click()
      await expect.poll(() => state.enabled).toBe(false)
    } finally { await app.close() }
  })
})
