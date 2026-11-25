import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import type { CliConversation } from '../../engine/src/protocol'
import { CliConversationStatus, cliNeedsFresh } from './CliConversation'

;(hasNativeTestRenderer ? describe : describe.skip)('native CLI recovery controls', () => {
  it('requires deliberate recovery, prevents double delivery, and reuses the key after an uncertain acknowledgement', async () => {
    const binding = { id: 'binding', sessionID: 'task', revision: 3, adapter: 'cursor', model: 'agent/chat', status: 'blocked', reason: 'The previous call was interrupted and not replayed.', stepID: 'step' } as CliConversation
    const requests: Array<{ binding: CliConversation; key: string }> = []
    let reject!: (error: Error) => void
    const engine = { snapshot: { cliConversation: binding, status: 'ready', steps: [], toolCalls: [] },
      freshCliConversation: (binding: CliConversation, key: string) => { requests.push({ binding, key }); return new Promise<void>((_, no) => { reject = no }) },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 1100, height: 300 })
    render(<CliConversationStatus engine={engine} model="agent/chat" />)
    const app = await connectTest(renderer)
    try {
      expect(await app.getByTestId('cli-conversation-status').textContent()).toContain('fresh conversation required')
      expect(await app.getByTestId('cli-conversation-reason').textContent()).toContain('not replayed')
      expect(requests).toHaveLength(0)
      await app.getByTestId('cli-fresh').click(); await app.getByTestId('cli-fresh').click()
      expect(requests).toHaveLength(1)
      expect(requests[0].binding).toEqual(binding)
      reject(new Error('Acknowledgement lost'))
      await app.getByTestId('cli-conversation-error').waitFor()
      await app.getByTestId('cli-fresh').click()
      expect(requests).toHaveLength(2); expect(requests[1].key).toBe(requests[0].key)
      reject(new Error('Still offline'))
      await app.getByTestId('cli-conversation-error').waitFor()
      engine.snapshot.status = 'unreachable'; render(<CliConversationStatus engine={engine} model="agent/chat" />)
      await app.getByTestId('cli-fresh').click(); expect(requests).toHaveLength(2)
    } finally { await app.close() }
  })

  it('blocks send after a model change or rewind and prevents reset while a native call is active', async () => {
    const binding = { id: 'binding', sessionID: 'task', revision: 3, adapter: 'grok', model: 'agent/chat', status: 'ready', stepID: 'step' } as CliConversation
    let fresh = 0
    const engine = { snapshot: { cliConversation: binding, status: 'ready', steps: [{ id: 'step', messageID: 'prompt', status: 'succeeded' }], toolCalls: [] },
      freshCliConversation: async () => { fresh++ },
    } as unknown as EngineHandle
    expect(cliNeedsFresh(engine.snapshot, 'agent/chat')).toBe(false)
    expect(cliNeedsFresh(engine.snapshot, 'agent/other')).toBe(true)
    engine.snapshot.activeMessageIDs = []
    expect(cliNeedsFresh(engine.snapshot, 'agent/chat')).toBe(true)
    engine.snapshot.steps[0].status = 'running'; binding.status = 'running'
    const { render, renderer } = createTestRoot({ width: 1100, height: 300 })
    render(<CliConversationStatus engine={engine} model="agent/chat" />)
    const app = await connectTest(renderer)
    try { await app.getByTestId('cli-fresh').click(); expect(fresh).toBe(0) }
    finally { await app.close() }
  })

  it('keeps deliberate recovery visible and clickable in a narrow pane beside an open drawer', async () => {
    let recovered = 0
    const engine = { snapshot: { cliConversation: { id: 'binding', sessionID: 'task', revision: 3, adapter: 'cursor', model: 'agent/chat', status: 'ready' }, status: 'ready', steps: [], toolCalls: [] },
      freshCliConversation: async () => { recovered++ },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 288, height: 300 })
    render(<div style={{ width: 288, height: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><CliConversationStatus engine={engine} model="fixture/tools" /></div>)
    const app = await connectTest(renderer)
    try {
      const bounds = await app.getByTestId('cli-fresh').bounds()
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(288)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(300)
      await app.getByTestId('cli-fresh').click(); expect(recovered).toBe(1)
    } finally { await app.close() }
  })
})
