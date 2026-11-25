import { expect, test } from 'bun:test'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { silentLogger } from '../src/log'
import { UsageService, aggregateUsage } from '../src/usage'
import { importUsageHistory } from '../src/usage-history'
import { startDaemon, tempHome } from './harness'

test('usage preserves cumulative snapshots once per attempt, prices cached input once, and separates unknown from zero', async () => {
  const home = tempHome(), store = Store.open(':memory:'); store.migrate()
  const session = new Sessions(store, silentLogger(), { cwd: home, home }).create()
  const at = Date.now() - 1000
  store.insertStep({ id: 'step_usage', sessionID: session.id, messageID: null, provider: 'fixture', model: 'm', attempt: 2, status: 'succeeded', claim: null, output: '', truncated: false, error: null, startedAt: at, endedAt: at + 10 })
  store.insertStepPart({ id: 'part_1', stepID: 'step_usage', sessionID: session.id, at, kind: 'usage', attempt: 1, inputTokens: 100, outputTokens: 2 })
  store.insertStepPart({ id: 'part_2', stepID: 'step_usage', sessionID: session.id, at, kind: 'usage', attempt: 1, inputTokens: 100, outputTokens: 10, cachedInputTokens: 80, cacheWriteTokens: 0, reasoningTokens: 4 })
  store.insertStepPart({ id: 'part_3', stepID: 'step_usage', sessionID: session.id, at, kind: 'usage', attempt: 2, inputTokens: 200, outputTokens: 20, costUSD: .05 })
  const usage = new UsageService(home, store, join(home, 'empty-history'))
  const query = { from: at - 1000, to: Date.now() + 1000, includeHistory: false }
  try {
    const unknown = await usage.report(query, new AbortController().signal)
    expect(unknown.totals).toMatchObject({ input: 300, cachedInput: 80, output: 30, reasoning: 4, tokens: 330, attempts: 2, costUSD: .05, unpricedTokens: 110 })
    usage.updatePricing({ revision: 0, model: 'fixture::m', rate: { input: 2, cachedInput: .2, cacheWrite: 2, output: 3 } })
    const priced = await usage.report(query, new AbortController().signal)
    expect(priced.totals.costUSD).toBeCloseTo(.050086, 9)
    expect(priced.totals.cacheSavingsUSD).toBeCloseTo(.000144, 9)
    expect(priced.totals).toMatchObject({ providerPricedTokens: 220, estimatedPricedTokens: 110, unpricedTokens: 0, uncachedInput: 20, unclassifiedInput: 200 })
    expect(priced.models).toHaveLength(1); expect(priced.projects).toHaveLength(1)
    await expect(usage.report({ ...query, to: query.from }, new AbortController().signal)).rejects.toMatchObject({ code: 'usage_window' })
    expect(() => usage.updatePricing({ revision: 0, model: 'fixture::m', rate: null })).toThrow('Pricing changed')
    expect(() => usage.updatePricing({ revision: 1, model: 'fixture::m', rate: { input: -1, cachedInput: 0, cacheWrite: 0, output: 0 } })).toThrow('Rates must')
    usage.updatePricing({ revision: 1, model: 'fixture::m', rate: null })
    expect((await usage.report(query, new AbortController().signal)).totals.unpricedTokens).toBe(110)
    const free = aggregateUsage([{ id: 'free', at, model: 'm', provider: 'p', project: 'No project', inputTokens: 10, outputTokens: 1, costUSD: 0 }], {})
    expect(free.totals.costUSD).toBe(0)
    const missing = aggregateUsage([{ id: 'unknown', at, model: 'm', provider: 'p', project: 'No project', inputTokens: 10, outputTokens: 1 }], {})
    expect(missing.totals.costUSD).toBeNull()
    expect(missing.totals.unclassifiedInput).toBe(10)
  } finally { store.close() }
})

test('history import handles repeated cumulative snapshots, forks, partial lines, oversized messages and Hiroshi-owned sessions', async () => {
  const home = tempHome(), directory = join(home, '.codex', 'sessions', '2026'); mkdirSync(directory, { recursive: true })
  const at = Date.now() - 10000, stamp = (delta: number) => new Date(at + delta).toISOString()
  const header = (id: string) => ({ type: 'session_meta', payload: { id, cwd: '/project' } })
  const context = { type: 'turn_context', payload: { model: 'test-model', turn_id: 'stable-turn' } }
  const usage = (delta: number, input: number, output: number, cached: number) => ({ type: 'event_msg', timestamp: stamp(delta), payload: { type: 'token_count', info: {
    total_token_usage: { input_tokens: input, output_tokens: output, cached_input_tokens: cached, cache_write_input_tokens: 0, total_tokens: input + output },
    last_token_usage: { input_tokens: delta ? 50 : 100, output_tokens: 10, cached_input_tokens: delta ? 20 : 80, cache_write_input_tokens: 0 },
  } } })
  const events = [context, usage(0, 100, 10, 80), usage(0, 100, 10, 80), usage(1000, 150, 20, 100)]
  const serialize = (id: string) => [header(id), ...events].map((event) => JSON.stringify(event)).join('\n') + '\n'
  const file = join(directory, 'original.jsonl'), original = serialize('external') + 'x'.repeat(200000) + '\n{broken\n{"incomplete":'
  writeFileSync(file, original); writeFileSync(join(directory, 'fork.jsonl'), serialize('fork'))
  writeFileSync(join(directory, 'owned.jsonl'), serialize('owned'))
  const grok = join(home, '.grok', 'sessions'); mkdirSync(grok, { recursive: true }); writeFileSync(join(grok, 'chat_history.jsonl'), JSON.stringify({ type: 'user', content: 'private-text-never-imported' }) + '\n')
  const result = await importUsageHistory(at - 1, Date.now(), new Set(['owned']), new AbortController().signal, home)
  expect(result.records).toHaveLength(2)
  const totals = aggregateUsage(result.records, {}).totals
  expect(totals).toMatchObject({ tokens: 170, input: 150, output: 20, cachedInput: 100 })
  expect(result.sources.find((source) => source.name === 'Codex')?.skipped).toBeGreaterThan(2)
    expect(result.sources.find((source) => source.name === 'Codex')?.status).toBe('partial')
  expect(result.sources.find((source) => source.name === 'Grok')?.status).toBe('unsupported')
  expect(result.sources.find((source) => source.name === 'Cursor Agent')?.status).toBe('missing')
  expect(JSON.stringify(result)).not.toContain('private-text-never-imported')
  expect(readFileSync(file, 'utf8')).toBe(original)
})

test('assistant history snapshots merge by message identity and source costs remain estimates', async () => {
  const home = tempHome(), directory = join(home, '.claude', 'projects', 'project'); mkdirSync(directory, { recursive: true })
  const timestamp = new Date(Date.now() - 1000).toISOString()
  writeFileSync(join(directory, 'chat.jsonl'), [1, 10].map((output) => JSON.stringify({ type: 'assistant', sessionId: 'external', timestamp,
    message: { id: 'same-message', role: 'assistant', model: 'model', content: [{ text: 'private text' }], usage: { input_tokens: 100, cache_read_input_tokens: 80, cache_creation_input_tokens: 0, output_tokens: output, cost: { total: .2 } } } })).join('\n') + '\n')
  const imported = await importUsageHistory(Date.now() - 10000, Date.now(), new Set(), new AbortController().signal, home)
  expect(imported.records).toHaveLength(1)
  expect(aggregateUsage(imported.records, {}).totals).toMatchObject({ tokens: 190, providerCostUSD: 0, estimatedCostUSD: .2 })
  expect(JSON.stringify(imported)).not.toContain('private text')
})

test('usage HTTP operations expose profile-wide activity, persist pricing, and do not mix in unrelated home histories', async () => {
  const home = tempHome(), history = join(home, 'empty-history'); mkdirSync(history)
  let daemon = await startDaemon({ home, env: { HIROSHI_USAGE_HOME: history } })
  try {
    const { session } = await daemon.client.createSession({})
    const input = { id: session.id, from: Date.now() - 10000, to: Date.now() + 1000, includeHistory: true }
    const report = await daemon.client.usageReport(input)
    expect(report.totals.attempts).toBe(0)
    expect(report.sources.find((source) => source.name === 'Codex')?.status).toBe('missing')
    await daemon.client.updateUsagePricing({ revision: report.pricingRevision, model: 'fixture::m', rate: { input: 1, cachedInput: 1, cacheWrite: 1, output: 1 } })
    await daemon.crash(); daemon = await startDaemon({ home, env: { HIROSHI_USAGE_HOME: history } })
    expect((await daemon.client.usageReport(input)).pricing['fixture::m']).toMatchObject({ input: 1 })
  } finally { await daemon.stop() }
}, 20000)
