import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { ModelPicker } from './app'

;(hasNativeTestRenderer ? describe : describe.skip)('engine model picker', () => {
  it('renders configured catalog models, marks a denied provider and reports the selected catalog id', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    let chosen = ''
    render(
      <div style={{ width: 800, height: 600, padding: 24, display: 'flex', backgroundColor: '#212121' }}>
        <ModelPicker value="custom/main" onChange={(id) => { chosen = id }} models={[
          { id: 'custom/main', label: 'My configured model', group: 'custom', icon: 'sparkle' },
          { id: 'restricted/other', label: 'Restricted model · denied', group: 'restricted', icon: 'sparkle' },
        ]} />
      </div>,
    )
    const app = await connectTest(renderer)
    try {
      expect(renderer.getPaintedText().join('\n')).toContain('My configured model')
      expect(renderer.getPaintedText().join('\n')).not.toContain('Grok')
      await app.getByTestId('model-picker').click()
      await app.getByTestId('model-restricted/other').waitFor()
      expect(renderer.getPaintedText().join('\n')).toContain('Restricted model · denied')
      await app.getByTestId('model-restricted/other').click()
      expect(chosen).toBe('restricted/other')
    } finally { await app.close() }
  })
  it('keeps a removed model visibly unavailable instead of selecting the first remaining model', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(<div style={{ width: 800, height: 600, padding: 24, display: 'flex' }}>
      <ModelPicker value="removed/chat" onChange={() => { throw new Error('selection must be explicit') }}
        models={[{ id: 'local/echo', label: 'Local echo', group: 'local', icon: 'sparkle' }]} />
    </div>)
    const app = await connectTest(renderer)
    try {
      expect(await app.getByTestId('model-picker').textContent()).toContain('Unavailable model: removed/chat')
      expect(await app.getByTestId('model-picker').textContent()).not.toContain('Local echo')
    } finally { await app.close() }
  })
  it('searches model names with spaces, filters providers, and stars models without selecting them', async () => {
    const { render, renderer } = createTestRoot({ width: 900, height: 700 })
    const chosen: string[] = []
    render(<div style={{ width: 900, height: 700, paddingTop: 500, paddingLeft: 24, display: 'flex', flexDirection: 'column' }}>
      <ModelPicker value="cursor/main" onChange={(id) => chosen.push(id)} models={[
        { id: 'cursor/main', label: 'Gemini Flash', group: 'cli_cursor', icon: 'sparkle' },
        { id: 'grok/chat', label: 'Grok Fast', group: 'cli_grok', icon: 'sparkle' },
      ]} />
    </div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('model-picker').click()
      await app.getByTestId('model-search').fill('Gemini')
      await app.getByTestId('model-search').press('space')
      expect(chosen).toEqual([])
      await app.getByTestId('model-search').fill('Gemini Flash')
      expect(await app.getByTestId('model-cursor/main').count()).toBe(1)
      expect(await app.getByTestId('model-grok/chat').count()).toBe(0)
      expect(chosen).toEqual([])
      await app.getByTestId('model-search').fill('')
      await app.getByTestId('model-provider-cli_grok').click()
      expect(await app.getByTestId('model-cursor/main').count()).toBe(0)
      await app.getByTestId('model-star-grok/chat').click()
      expect(chosen).toEqual([])
      await app.getByTestId('model-favorites').click()
      expect(await app.getByTestId('model-grok/chat').count()).toBe(1)
      await app.getByTestId('model-search').fill('missing-model')
      expect(await app.getByTestId('model-empty').textContent()).toContain('No favorite models match')
      await app.getByTestId('model-search').fill('Grok Fast')
      await app.getByTestId('model-search').press('down')
      await app.getByTestId('model-search').press('enter')
      expect(chosen).toEqual(['grok/chat'])
    } finally { await app.close() }
  })
})
