import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { useEngine } from './src/engine/use-engine'
import { ensureEngine } from './src/engine/supervisor'

vi.mock('./src/engine/supervisor', () => ({ ensureEngine: vi.fn(async () => ({ status: 'failed', reason: 'daemon unavailable' })), stopEngine: vi.fn(async () => true) }))

;(hasNativeTestRenderer ? describe : describe.skip)('engine startup failure', () => {
  it('shows failure without retrying and spawning another daemon automatically', async () => {
    vi.stubGlobal('Bun', {})
    vi.mocked(ensureEngine).mockClear()
    const { render, renderer } = createTestRoot({ width: 500, height: 300 })
    function Status() {
      const { snapshot } = useEngine({ enabled: true, workspace: '/test' })
      return <text testId="status">{`${snapshot.status}: ${snapshot.error ?? ''}`}</text>
    }
    const app = await connectTest(renderer)
    try {
      render(<Status />)
      await app.getByTestId('status').waitFor()
      await new Promise((resolve) => setTimeout(resolve, 1800))
      expect(await app.getByTestId('status').textContent()).toBe('failed: daemon unavailable')
      expect(ensureEngine).toHaveBeenCalledTimes(1)
    } finally { await app.close(); vi.unstubAllGlobals() }
  })
})
