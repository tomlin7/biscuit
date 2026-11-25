import React, { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { AccessPicker } from '../../app'

;(hasNativeTestRenderer ? describe : describe.skip)('task permission picker', () => {
  it('renders all four modes and updates the controlled selection after saving', async () => {
    const selected: string[] = []
    const { render, renderer } = createTestRoot({ width: 800, height: 550 })
    function Surface() {
      const [mode, setMode] = useState('ask')
      return <div style={{ width: 800, height: 550, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 20 }}>
        <AccessPicker value={mode} onChange={async (next) => { selected.push(next); setMode(next) }} />
      </div>
    }
    render(<Surface />)
    const app = await connectTest(renderer)
    try {
      expect(await app.getByTestId('access-picker').textContent()).toBe('Supervised')
      await app.getByTestId('access-picker').click()
      expect(await app.getByTestId('access-auto').textContent()).toContain('AI reviewer')
      expect((await app.getByTestId('access-auto').bounds()).width).toBeLessThanOrEqual(312)
      expect(await app.getByTestId('access-edits').textContent()).toContain('Auto-accept edits')
      expect(await app.getByTestId('access-full').textContent()).toContain('Full access')
      await app.getByTestId('access-edits').click()
      await expect.poll(async () => app.getByTestId('access-picker').textContent()).toBe('Auto-accept edits')
      await app.getByTestId('access-picker').click(); await app.getByTestId('access-auto').click()
      await expect.poll(async () => app.getByTestId('access-picker').textContent()).toBe('Auto')
      await app.getByTestId('access-picker').click(); await app.getByTestId('access-full').click()
      await expect.poll(async () => app.getByTestId('access-picker').textContent()).toBe('Full access')
      expect(selected).toEqual(['edits', 'auto', 'full'])
    } finally { await app.close() }
  })

  it('keeps the persisted selection after failure and blocks duplicate saves while pending', async () => {
    let saves = 0, reject!: (error: Error) => void
    const { render, renderer } = createTestRoot({ width: 800, height: 550 })
    render(<div style={{ width: 800, height: 550, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 20 }}>
      <AccessPicker value="ask" onChange={() => { saves++; return new Promise<void>((_, no) => { reject = no }) }} />
    </div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('access-picker').click(); await app.getByTestId('access-full').click()
      await app.getByTestId('access-picker').click()
      expect(await app.getByTestId('access-full').all()).toHaveLength(0)
      expect(saves).toBe(1)
      reject(new Error('Mode changed in another window'))
      await app.getByTestId('access-error').waitFor()
      expect(await app.getByTestId('access-picker').textContent()).toBe('Supervised')
      expect(await app.getByTestId('access-error').textContent()).toContain('another window')
    } finally { await app.close() }
  })
})
