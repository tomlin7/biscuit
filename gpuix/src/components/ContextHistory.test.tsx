import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { ContextHistory } from './ContextHistory'
import type { Compaction, Message, StepContext } from '../../engine/src/protocol'

const messages: Message[] = [
  { id: 'old', sessionID: 's', seq: 0, role: 'user', text: 'Keep the old requirement', at: 1 },
  { id: 'new', sessionID: 's', seq: 1, role: 'user', text: 'Continue the work', at: 2 },
]
const compaction: Compaction = { id: 'c', sessionID: 's', stepID: 'step', throughSeq: 0,
  retainedFromSeq: 1, text: 'Original goal: Keep the old requirement', reason: 'budget', at: 3 }
const context: StepContext = { id: 'ctx', sessionID: 's', stepID: 'step', attempt: 1,
  sources: [{ source: 'AGENTS.md', hash: 'abc' }], changed: ['AGENTS.md'],
  estimatedInput: 100, reservedOutput: 20, window: 200, compactionID: 'c', at: 4 }

;(hasNativeTestRenderer ? describe : describe.skip)('context history', () => {
  it('opens the original transcript, summary boundary and changed source names', async () => {
    const { render, renderer } = createTestRoot({ width: 381, height: 500 })
    render(
      <div style={{ display: 'flex', flexDirection: 'column', width: 381, height: 500, backgroundColor: '#212121' }}>
        <ContextHistory messages={messages} compactions={[compaction]} contexts={[context]} />
      </div>,
    )
    const app = await connectTest(renderer)
    try {
      expect(renderer.getPaintedText().join('\n')).toContain('1 compaction')
      await app.getByTestId('session-context-toggle').click()
      await app.getByTestId('context-summary-c').waitFor()
      const text = renderer.getPaintedText().join('\n')
      expect(text).toContain('Keep the old requirement')
      expect(text).toContain('Continue the work')
      expect(text).toContain('Compacted through message 1')
      expect(text).toContain('Original goal: Keep the old requirement')
      expect(text).toContain('Instruction sources changed: AGENTS.md')
      if (process.env.HIROSHI_CONTEXT_SCREENSHOT) {
        await app.screenshot({ path: process.env.HIROSHI_CONTEXT_SCREENSHOT })
      }
      await app.getByTestId('session-context-toggle').click()
      expect(renderer.getPaintedText().join('\n')).not.toContain('Original goal:')
    } finally { await app.close() }
  })

  it('shows current settings and last-request scope without instruction prose', async () => {
    const { render, renderer } = createTestRoot({ width: 700, height: 500 })
    const configuration = { settings: { defaultModel: 'fixture/new' },
      provenance: [{ setting: 'defaultModel' as const, source: 'workspace/.hiroshi/config.json' }], sources: [], warnings: [], error: 'Configuration unavailable' }
    const prepared = { ...context, sources: [{ source: 'workspace/src/AGENTS.md', scope: 'src', hash: 'abcdef1234567890', delivery: 'native-unverified' as const }],
      configuration: { ...configuration, admittedModel: 'fixture/old', warnings: ['Native scope is unverified'], error: undefined } }
    render(<div style={{ width: 700, height: 500 }}><ContextHistory messages={[]} compactions={[]} contexts={[prepared]} configuration={configuration} /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('session-context-toggle').click()
      await app.getByTestId('configuration-provenance').waitFor()
      const text = renderer.getPaintedText().join('\n')
      expect(text).toContain('defaultModel: fixture/new')
      expect(text).toContain('workspace/.hiroshi/config.json')
      expect(text).toContain('Admitted model: fixture/old')
      expect(text).toContain('scope src · abcdef123456')
      expect(text).toContain('native scope unverified')
      expect(text).toContain('Configuration unavailable')
      expect(text).toContain('Native scope is unverified')
    } finally { await app.close() }
  })

  it('exposes malformed configuration before the first prompt', async () => {
    const { render, renderer } = createTestRoot({ width: 600, height: 400 })
    render(<div style={{ width: 600, height: 400 }}><ContextHistory messages={[]} compactions={[]} contexts={[]} configuration={{ settings: {}, provenance: [], sources: [], warnings: [], error: 'Invalid configuration' }} /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('session-context-toggle').click()
      expect(renderer.getPaintedText().join('\n')).toContain('Invalid configuration')
    } finally { await app.close() }
  })
})
