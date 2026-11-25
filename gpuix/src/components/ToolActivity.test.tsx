import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { ToolActivity } from './ToolActivity'
import type { Permission, ToolCall } from '../../engine/src/protocol'

const permission: Permission = { id: 'p', sessionID: 's', toolCallID: 't', tool: 'write_file',
  input: '{"path":"approved.txt","content":"hello"}', cwd: 'workspace', revision: 'r',
  state: 'pending', decision: null, remember: false, createdAt: 1, answeredAt: null }

;(hasNativeTestRenderer ? describe : describe.skip)('tool permission cockpit', () => {
  for (const decision of ['allow', 'deny'] as const) {
    it(`sends ${decision} with the exact-request remember choice through real hit areas`, async () => {
      const answers: unknown[] = []
      const { render, renderer } = createTestRoot({ width: 700, height: 500 })
      render(<div style={{ width: 700, height: 500 }}><ToolActivity permissions={[permission]} calls={[]}
        onAnswer={async (...args) => { answers.push(args) }} onOutput={async () => ({ path: '', text: '' })} /></div>)
      const app = await connectTest(renderer)
      try {
        expect(renderer.getPaintedText().join(' ')).toContain('Allow write_file?')
        await app.getByTestId('permission-remember-p').click()
        await app.getByTestId(`permission-${decision}-p`).click()
        expect(answers).toEqual([['p', decision, true]])
      } finally { await app.close() }
    })
  }
  it('opens the full managed output and closes its viewer', async () => {
    const call: ToolCall = { id: 't', sessionID: 's', stepID: 'step', runID: null, tool: 'read_file',
      input: '{}', status: 'succeeded', error: null, createdAt: 1, endedAt: 2, truncated: true, outputPath: 'managed/t.json' }
    const opened: string[] = []
    const { render, renderer } = createTestRoot({ width: 700, height: 500 })
    render(<div style={{ width: 700, height: 500 }}><ToolActivity permissions={[]} calls={[call]}
      onAnswer={async () => {}} onOutput={async (id) => { opened.push(id); return { path: 'managed/t.json', text: 'complete-output-marker' } }} /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('tool-output-t').click()
      await app.getByTestId('tool-output-viewer').waitFor()
      expect(opened).toEqual(['t'])
      expect(renderer.getPaintedText().join(' ')).toContain('complete-output-marker')
      await app.getByTestId('tool-output-close').click()
      expect(renderer.getPaintedText().join(' ')).not.toContain('complete-output-marker')
    } finally { await app.close() }
  })
})
