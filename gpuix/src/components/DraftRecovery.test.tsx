import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import { DraftRecovery } from './DraftRecovery'

;(hasNativeTestRenderer ? describe : describe.skip)('draft recovery controls', () => {
  it('shows the original saved send, retries deliberately, and blocks recovery actions while busy or unsaved', async () => {
    let retries = 0, forgotten = 0, reloaded = 0
    const engine = { draft: { revision: 2, draftRevision: 1, text: 'newer edit', busy: false, error: null, unsaved: false,
      pending: { key: 'send-test', text: 'original saved send', mode: 'queue', draftRevision: 0, status: 'uncertain', error: 'Engine disconnected' } },
      retryPrompt: () => retries++, forgetPrompt: () => forgotten++, reloadDraft: () => reloaded++,
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 1100, height: 350 })
    render(<DraftRecovery engine={engine} />)
    const app = await connectTest(renderer)
    try {
      expect(await app.getByTestId('draft-pending-text').textContent()).toContain('original saved send')
      expect(await app.getByTestId('draft-send-status').textContent()).toContain('not confirmed')
      await app.getByTestId('draft-retry').click(); expect(retries).toBe(1)
      engine.draft.busy = true; render(<DraftRecovery engine={engine} />)
      await app.getByTestId('draft-retry').click(); await app.getByTestId('draft-forget').click()
      expect(retries).toBe(1); expect(forgotten).toBe(0)
      engine.draft.busy = false; engine.draft.unsaved = true; engine.draft.error = 'Changed in another window'
      render(<DraftRecovery engine={engine} />)
      expect(await app.getByTestId('draft-error').textContent()).toContain('another window')
      await app.getByTestId('draft-retry').click(); expect(retries).toBe(1)
      await app.getByTestId('draft-reload').click(); expect(reloaded).toBe(1)
      engine.draft.unsaved = false; render(<DraftRecovery engine={engine} />)
      await app.getByTestId('draft-forget').click(); expect(forgotten).toBe(1)
    } finally { await app.close() }
  })

  it('makes an unsent draft discard explicit', async () => {
    let discarded = 0
    const engine = { draft: { revision: 1, draftRevision: 1, text: 'saved unsent input', pending: null, busy: false, error: null, unsaved: false },
      discardDraft: () => discarded++,
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 800, height: 250 })
    render(<DraftRecovery engine={engine} />)
    const app = await connectTest(renderer)
    try { await app.getByTestId('draft-discard').click(); expect(discarded).toBe(1) }
    finally { await app.close() }
  })
})
