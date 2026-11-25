import React, { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { initialSnapshot } from '../engine/reducer'
import { ComposerDelivery, EngineUsage } from './EngineCockpit'
import type { DeliveryMode } from '../../engine/src/protocol'

;(hasNativeTestRenderer ? describe : describe.skip)('engine cockpit', () => {
  it('paints engine facts, reports absent usage, and changes command delivery while busy', async () => {
    const snapshot = initialSnapshot()
    snapshot.status = 'ready'
    snapshot.sessionID = 'session'
    snapshot.sessions = [{ id: 'session', title: 'Real task', cwd: '/actual-workspace', createdAt: 1, updatedAt: 1, runs: 0, running: 0, lastRunAt: null }]
    const { render, renderer } = createTestRoot({ width: 900, height: 750 })
    function Surface() {
      const [mode, setMode] = useState<DeliveryMode>('queue')
      return <div style={{ display: 'flex', flexDirection: 'column', width: 900, height: 750 }}>
        <ComposerDelivery snapshot={snapshot} mode={mode} onMode={setMode} />
        <EngineUsage snapshot={snapshot} />
      </div>
    }
    render(<Surface />)
    const app = await connectTest(renderer)
    try {
      expect(await app.getByTestId('composer-delivery-mode').textContent()).toBe('Send')
      expect(renderer.getPaintedText().join(' ')).toContain('No runs recorded.')
      snapshot.runs = [{ id: 'run', sessionID: 'session', command: 'real command', cwd: '/actual-workspace', shell: 'sh', status: 'running', exitCode: null, error: null, startedAt: 1, endedAt: null }]
      render(<Surface />)
      expect(await app.getByTestId('composer-delivery-mode').textContent()).toBe('Queue')
      await app.getByTestId('composer-delivery-mode').click()
      expect(await app.getByTestId('composer-delivery-mode').textContent()).toBe('Steer')
      expect(renderer.getPaintedText().join(' ')).toContain('Next safe boundary')
      expect(renderer.getPaintedText().join(' ')).toContain('0 model attempts · 1 commands · 0 tools')
      expect(renderer.getPaintedText().join(' ')).not.toContain('$')
      snapshot.executions = [{ id: 'run', sessionID: 'session', kind: 'command', state: 'queued', reason: 'execution_capacity', queuedAt: 1, queueDeadline: 90000, startedAt: null, deadline: null, endedAt: null }]
      render(<Surface />)
      expect(await app.getByTestId('execution-queue').textContent()).toBe('Waiting for capacity · 1 queued')
      snapshot.executions[0]!.reason = 'execution_low_memory'
      render(<Surface />)
      expect(await app.getByTestId('execution-queue').textContent()).toBe('Waiting for free RAM · 1 queued')
      snapshot.steps = [{ id: 'cli-step', sessionID: 'session', messageID: null, provider: 'cursor', model: 'cursor/chat', attempt: 1,
        status: 'succeeded', claim: null, output: 'Real CLI answer', truncated: false, error: null, startedAt: 1, endedAt: 2 }]
      snapshot.parts = [{ id: 'cli-part', sessionID: 'session', stepID: 'cli-step', at: 2, kind: 'cli', version: 1, adapter: 'cursor', phase: 'completed', text: 'CLI response completed' }]
      render(<Surface />)
      expect(await app.getByTestId('cli-response-mode').textContent()).toBe('Cursor · response only')
    } finally { await app.close() }
  })
})
