import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import { initialSnapshot } from '../engine/reducer'
import type { AgentInfo, ProviderState } from '../../engine/src/protocol'
import { ProviderSettings } from './ProviderSettings'

const agent: AgentInfo = { id: 'cursor', name: 'Cursor Agent', enabled: true, trustWorkspace: false, command: null, source: null,
  version: null, fingerprint: null, checkedAt: null, auth: 'unknown', status: 'unchecked', detail: 'Not checked. Refresh to inspect this CLI.', models: [],
  capabilities: { responses: false, coding: false, nativeContinuation: false, approvals: false, cancellation: false, instructions: 'unknown' } }
;(hasNativeTestRenderer ? describe : describe.skip)('provider setup', () => {
  it('keeps unobserved status unknown and sends path, trust, enable and default changes to the engine', async () => {
    const state: ProviderState = { revision: 0, refreshing: false, error: null, agents: [agent], defaultModel: 'missing/old',
      models: [{ id: 'cli/chat', provider: 'cli', label: 'Observed model', contextWindow: 32768, reservedOutput: 1024, reason: null }] }
    const calls: unknown[] = []
    const engine = { snapshot: { ...initialSnapshot(), status: 'ready', providers: state },
      refreshProviders: async () => { calls.push('refresh') }, cancelProviderRefresh: async () => { calls.push('cancel') },
      updateProviders: async (input: unknown) => { calls.push(input) },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 900, height: 1000 })
    const draw = () => render(<div style={{ width: 900, height: 1000, display: 'flex', flexDirection: 'column' }}><ProviderSettings engine={engine} /></div>)
    draw()
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('provider-status-cursor').waitFor()
      await app.getByTestId('provider-setup-cursor').click()
      expect(await app.getByTestId('provider-evidence-cursor').textContent()).toContain('Never checked')
      expect(await app.getByTestId('provider-default').textContent()).toContain('Unavailable model: missing/old')
      await app.getByTestId('providers-refresh').click()
      await app.getByTestId('provider-path-cursor').fill('/absolute/node')
      await app.getByTestId('provider-entry-cursor').fill('/absolute/agent.js')
      await app.getByTestId('provider-save-cursor').click()
      await new Promise((resolve) => setTimeout(resolve, 30))
      await app.getByTestId('provider-trust-cursor').click()
      await new Promise((resolve) => setTimeout(resolve, 30))
      await app.getByTestId('provider-enable-cursor').click()
      await new Promise((resolve) => setTimeout(resolve, 30))
      await app.getByTestId('provider-setup-cursor').click()
      await app.getByTestId('provider-choose-default').click()
      try { await app.getByTestId('provider-default-cli/chat').waitFor({ timeoutMs: 1000 }) }
      catch (error) { console.error('Settings picker bounds:', await app.getByTestId('provider-choose-default').bounds(), 'Painted text:', renderer.getPaintedText()); throw error }
      await app.getByTestId('provider-default-cli/chat').click()
      await new Promise((resolve) => setTimeout(resolve, 30))
      await app.getByTestId('provider-setup-cursor').click()
      await app.getByTestId('provider-auto-cursor').click()
      expect(calls).toEqual(['refresh', { agent: 'cursor', command: ['/absolute/node', '/absolute/agent.js'] },
        { agent: 'cursor', trustWorkspace: true }, { agent: 'cursor', enabled: false }, { defaultModel: 'cli/chat' }, { agent: 'cursor', command: null }])
      state.refreshing = true; draw()
      await app.getByTestId('providers-cancel').click()
      expect(calls.at(-1)).toBe('cancel')
    } finally { await app.close() }
  })
  it('does not present demo installations when the engine is unavailable', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 500 })
    render(<ProviderSettings />)
    const app = await connectTest(renderer)
    try {
      expect(await app.getByTestId('providers-unavailable').textContent()).toContain('No installation or sign-in check has run')
      expect(renderer.getPaintedText().join(' ')).not.toContain('Ready')
    } finally { await app.close() }
  })
})
