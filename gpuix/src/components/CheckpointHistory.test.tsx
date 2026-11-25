import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { CheckpointHistory } from './CheckpointHistory'
import type { Checkpoint, Message, Rewind } from '../../engine/src/protocol'

const checkpoint: Checkpoint = { id: 'c', sessionID: 's', promptID: 'p', kind: 'prompt', label: 'Change a file', cwd: 'workspace',
  commit: 'a'.repeat(40), tree: 'b'.repeat(40), ref: 'refs/hiroshi/checkpoints/c', messageIDs: ['kept'], at: 1 }
const messages: Message[] = [{ id: 'kept', sessionID: 's', seq: 0, role: 'user', text: 'Keep the goal', at: 1 },
  { id: 'archived', sessionID: 's', seq: 1, role: 'assistant', text: 'Earlier work remains available', at: 2 }]

;(hasNativeTestRenderer ? describe : describe.skip)('checkpoint cockpit', () => {
  it('restores the selected checkpoint through its native hit area and opens archived history', async () => {
    const calls: string[][] = []
    const { render, renderer } = createTestRoot({ width: 700, height: 650 })
    render(<div style={{ width: 700, height: 650 }}><CheckpointHistory checkpoints={[checkpoint]} rewinds={[]} messages={messages}
      activeMessageIDs={['kept']} checkpointError={null} onRestore={async (id, key) => { calls.push([id, key]) }} /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('checkpoint-toggle').click()
      expect(renderer.getPaintedText().join(' ')).toContain('Restore before: Change a file')
      await app.getByTestId('checkpoint-restore-c').click()
      expect(calls[0]![0]).toBe('c')
      expect(calls[0]![1]).toMatch(/^rewind_/)
      await app.getByTestId('rewind-history-toggle').click()
      expect(renderer.getPaintedText().join(' ')).toContain('Earlier work remains available')
      await app.getByTestId('rewind-history-toggle').click()
      expect(renderer.getPaintedText().join(' ')).not.toContain('Earlier work remains available')
    } finally { await app.close() }
  })
  it('retries an incomplete rewind with its durable idempotency key', async () => {
    const calls: string[][] = []
    const rewind: Rewind = { id: 'r', sessionID: 's', checkpointID: 'c', safetyCheckpointID: 'safe', key: 'same-request',
      state: 'pending', plan: [], error: 'Later edits were preserved', at: 1, completedAt: null }
    const { render, renderer } = createTestRoot({ width: 700, height: 400 })
    render(<div style={{ width: 700, height: 400 }}><CheckpointHistory checkpoints={[checkpoint]} rewinds={[rewind]} messages={messages}
      activeMessageIDs={null} checkpointError={null} onRestore={async (id, key) => { calls.push([id, key]) }} /></div>)
    const app = await connectTest(renderer)
    try {
      expect(renderer.getPaintedText().join(' ')).toContain('Workspace paused: Later edits were preserved')
      await app.getByTestId('rewind-retry').click()
      expect(calls).toEqual([['c', 'same-request']])
    } finally { await app.close() }
  })
})
