import React from 'react'
import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import type { UsageRate, UsageReport } from '../../engine/src/protocol'
import { aggregateUsage } from '../../engine/src/usage'
import { UsageSettings } from './UsageSettings'

;(hasNativeTestRenderer ? describe : describe.skip)('usage analytics controls', () => {
  it('shows unpriced usage, switches views/date windows, and saves explicit model rates', async () => {
    const at = Date.now() - 1000; let calls = 0, revision = 0, saved: Record<string, UsageRate> = {}
    const requests: unknown[] = []
    const engine = { usageReport: async (input: any): Promise<UsageReport> => {
      calls++; requests.push(input)
      return { ...aggregateUsage([{ id: 'usage', at, model: 'model', provider: 'api', project: '/project', inputTokens: 100, cachedInputTokens: 80, cacheWriteTokens: 0, outputTokens: 10 }], saved),
        ...input, generatedAt: Date.now(), pricing: saved, pricingRevision: revision, scannedRecords: 1, sources: [], warnings: [] }
    }, updateUsagePricing: async (input: any) => { saved = { [input.model]: input.rate }; revision++ },
    } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 1024, height: 642 })
    render(<div testId="usage-test-viewport" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'scroll' }}><div style={{ flexShrink: 0 }}><UsageSettings engine={engine} /></div></div>)
    const app = await connectTest(renderer)
    let stage = 'initial report'
    const click = async (id: string) => {
      stage = id
      const node = await app.getByTestId(id).waitFor({ timeoutMs: 2000 })
      const viewport = await app.getByTestId('usage-test-viewport').element()
      const bounds = await app.getByTestId(id).bounds(), frame = await app.getByTestId('usage-test-viewport').bounds()
      const offset = renderer.getScrollOffset(viewport.id) ?? [0, 0]
      renderer.scrollTo(viewport.id, 0, offset[1] + frame.y + frame.height / 2 - bounds.y - bounds.height / 2)
      renderer.flush()
      const painted = await app.getByTestId(id).bounds()
      if (painted.y < frame.y || painted.y + painted.height > frame.y + frame.height) throw new Error(`Control is outside the native viewport: ${JSON.stringify({ id, painted, frame })}`)
      await app.getByTestId(id).click()
    }
    try {
      await expect.poll(() => calls).toBe(1)
      await expect.poll(async () => app.getByTestId('usage-refresh').textContent()).toBe('Refresh')
      await app.getByTestId('usage-row-api::model').waitFor()
      expect(await app.getByTestId('usage-total-cost').textContent()).toBe('—')
      await click('usage-period-months')
      await click('usage-period-projects')
      await app.getByText('By project tokens').waitFor({ timeoutMs: 2000 })
      await click('usage-row-api::model')
      await app.getByTestId('usage-rate-input').waitFor({ timeoutMs: 2000 })
      for (const [key, value] of [['input', '2'], ['cachedInput', '.2'], ['cacheWrite', '2'], ['output', '3']]) await app.getByTestId(`usage-rate-${key}`).fill(value!)
      await click('usage-rates-save')
      await expect.poll(() => revision).toBe(1)
      await expect.poll(async () => app.getByTestId('usage-total-cost').textContent()).toBe('$0.00')
      expect(saved['api::model']).toMatchObject({ input: 2, cachedInput: .2, output: 3 })
      await click('usage-range'); await app.getByTestId('usage-range-7').waitFor(); await app.getByTestId('usage-range-7').click()
      await expect.poll(() => requests.length).toBe(3)
      await expect.poll(async () => app.getByTestId('usage-refresh').textContent()).toBe('Refresh')
      expect((requests.at(-1) as any).to - (requests.at(-1) as any).from).toBe(7 * 86400000)
      await click('usage-history-toggle')
      await expect.poll(() => (requests.at(-1) as any).includeHistory).toBe(false)
    } catch (error) {
      mkdirSync('screenshots', { recursive: true })
      await app.screenshot({ path: 'screenshots/native-usage-controls.png' })
      writeFileSync('screenshots/native-usage-controls.json', JSON.stringify({ stage, tree: await app.call('getTree', {}), viewport: renderer.getWindowSize() }, null, 2))
      throw new Error(`Usage controls failed at ${stage}`, { cause: error })
    }
    finally { await app.close() }
  }, 10000)
  it('shows an unavailable report as an error instead of a fabricated zero', async () => {
    const engine = { usageReport: async () => { throw new Error('Engine disconnected') } } as unknown as EngineHandle
    const { render, renderer } = createTestRoot({ width: 1180, height: 820 })
    render(<UsageSettings engine={engine} />)
    const app = await connectTest(renderer)
    try { await app.getByTestId('usage-error').waitFor(); expect(await app.getByTestId('usage-error').textContent()).toBe('Engine disconnected'); expect(await app.getByTestId('usage-total-cost').textContent()).toBe('—') }
    finally { await app.close() }
  })
})
