import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { invalid, conflict } from './errors'
import type { Store } from './store'
import type { UsageCounters, UsageGroup, UsagePricingUpdate, UsageQuery, UsageRate, UsageReport, UsageTotals } from './protocol'
import { count, money, importUsageHistory, type UsageRecord } from './usage-history'

const zero = (): UsageTotals => ({ input: 0, cachedInput: 0, cacheWrites: 0, uncachedInput: 0, unclassifiedInput: 0, output: 0, reasoning: 0, tokens: 0, attempts: 0, reportedAttempts: 0,
  cacheReportedAttempts: 0, activeDays: 0, costUSD: null, providerCostUSD: 0, estimatedCostUSD: 0, cacheSavingsUSD: null,
  providerPricedTokens: 0, estimatedPricedTokens: 0, unpricedTokens: 0 })
const keys = ['inputTokens', 'outputTokens', 'cachedInputTokens', 'cacheWriteTokens', 'reasoningTokens', 'costUSD'] as const
export function aggregateUsage(records: UsageRecord[], pricing: Record<string, UsageRate>) {
  const totals = zero(), collections = { days: new Map<string, UsageGroup>(), months: new Map<string, UsageGroup>(), projects: new Map<string, UsageGroup>(), providers: new Map<string, UsageGroup>(), models: new Map<string, UsageGroup>() }
  const active = new WeakMap<UsageTotals, Set<string>>()
  const get = (map: Map<string, UsageGroup>, id: string, label = id) => {
    let row = map.get(id)
    if (!row) { row = { ...zero(), id, label }; map.set(id, row) }
    return row
  }
  for (const record of records) {
    const day = new Date(record.at).toISOString().slice(0, 10), modelID = `${record.provider}::${record.model}`
    const input = count(record.inputTokens), output = count(record.outputTokens)
    const cached = count(record.cachedInputTokens) ?? 0, writes = count(record.cacheWriteTokens) ?? 0
    const coherent = input !== undefined && cached + writes <= input
    const rate = Object.hasOwn(pricing, modelID) ? pricing[modelID] : undefined
    const actual = money(record.costUSD)
    const estimate = actual === undefined ? money(record.estimatedCostUSD) ?? (rate && coherent && output !== undefined
      ? ((input! - cached - writes) * rate.input + cached * rate.cachedInput + writes * rate.cacheWrite + output * rate.output) / 1e6 : undefined) : undefined
    const cost = actual ?? estimate
    const savings = rate && coherent ? cached * Math.max(0, rate.input - rate.cachedInput) / 1e6 : undefined
    const rows: UsageTotals[] = [totals, get(collections.days, day), get(collections.months, day.slice(0, 7)),
      get(collections.projects, record.project, record.project === 'No project' || record.project === 'Unknown project' ? record.project : basename(record.project.replace(/\\/g, '/')) || record.project),
      get(collections.providers, record.provider), get(collections.models, modelID, record.model)]
    for (const row of rows) {
      row.attempts++
      if (input !== undefined || output !== undefined) row.reportedAttempts++
      if (record.cachedInputTokens !== undefined) row.cacheReportedAttempts++
      row.input += input ?? 0; row.output += output ?? 0; row.cachedInput += coherent ? cached : 0; row.cacheWrites += coherent ? writes : 0
      const uncached = coherent && record.cachedInputTokens !== undefined && record.cacheWriteTokens !== undefined ? input! - cached - writes : 0
      row.uncachedInput += uncached
      row.unclassifiedInput += (input ?? 0) - (coherent ? cached + writes + uncached : 0)
      row.reasoning += output !== undefined ? Math.min(count(record.reasoningTokens) ?? 0, output) : 0
      const tokens = (input ?? 0) + (output ?? 0)
      row.tokens += tokens
      if (cost !== undefined) {
        row.costUSD = (row.costUSD ?? 0) + cost
        if (actual !== undefined) { row.providerCostUSD += actual; row.providerPricedTokens += tokens }
        else { row.estimatedCostUSD += estimate!; row.estimatedPricedTokens += tokens }
      } else row.unpricedTokens += tokens
      if (savings !== undefined) row.cacheSavingsUSD = (row.cacheSavingsUSD ?? 0) + savings
      if (tokens) { const set = active.get(row) ?? new Set<string>(); set.add(day); active.set(row, set); row.activeDays = set.size }
    }
  }
  return { totals, ...Object.fromEntries(Object.entries(collections).map(([key, rows]) => [key, [...rows.values()].sort((a, b) => key === 'days' || key === 'months' ? a.id.localeCompare(b.id) : b.tokens - a.tokens)])) } as
    { totals: UsageTotals; days: UsageGroup[]; months: UsageGroup[]; projects: UsageGroup[]; providers: UsageGroup[]; models: UsageGroup[] }
}

interface Prices { version: 1; revision: number; rates: Record<string, UsageRate> }
export class UsageService {
  readonly #file: string
  constructor(readonly home: string, readonly store: Store, readonly historyHome = homedir()) { this.#file = join(home, 'usage-pricing.json') }
  #validate(rate: UsageRate) {
    if (!rate || ['input', 'cachedInput', 'cacheWrite', 'output'].some((key) => typeof (rate as any)[key] !== 'number' || !Number.isFinite((rate as any)[key]) || (rate as any)[key] < 0 || (rate as any)[key] > 1000000)) {
      throw invalid('usage_pricing', 'Rates must be finite USD amounts per million tokens between 0 and 1,000,000.')
    }
  }
  #prices(): Prices {
    try {
      const text = readFileSync(this.#file, 'utf8')
      if (text.length > 256 * 1024) throw new Error('size')
      const value = JSON.parse(text) as Prices
      if (value.version !== 1 || !Number.isSafeInteger(value.revision) || !value.rates || typeof value.rates !== 'object' || Array.isArray(value.rates)) throw new Error('shape')
      for (const [id, rate] of Object.entries(value.rates)) { if (id.length > 512) throw new Error('model'); this.#validate(rate) }
      return value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, revision: 0, rates: {} }
      throw invalid('usage_pricing', 'Saved usage pricing is invalid. Its file has been preserved.')
    }
  }
  updatePricing(input: UsagePricingUpdate) {
    const saved = this.#prices()
    if (input.revision !== saved.revision) throw conflict('usage_revision', 'Pricing changed. Refresh Usage before editing rates.')
    if (typeof input.model !== 'string' || !input.model.includes('::') || input.model.length > 512) throw invalid('usage_pricing', 'Choose a model from the usage breakdown.')
    if (input.rate !== null) this.#validate(input.rate)
    const entries = new Map(Object.entries(saved.rates))
    if (input.rate === null) entries.delete(input.model)
    else entries.set(input.model, { input: input.rate.input, cachedInput: input.rate.cachedInput, cacheWrite: input.rate.cacheWrite, output: input.rate.output })
    if (entries.size > 1024) throw invalid('usage_pricing', 'At most 1024 models can have configured rates.')
    const next: Prices = { version: 1, revision: saved.revision + 1, rates: Object.fromEntries(entries) }
    const temporary = `${this.#file}.${randomUUID()}.tmp`
    try { writeFileSync(temporary, JSON.stringify(next), { flag: 'wx', mode: 0o600 }); renameSync(temporary, this.#file) }
    finally { try { unlinkSync(temporary) } catch {} }
    return { revision: next.revision }
  }
  async report(input: UsageQuery, signal: AbortSignal): Promise<UsageReport> {
    if (!Number.isSafeInteger(input.from) || !Number.isSafeInteger(input.to) || input.from < 0 || input.to <= input.from || input.to - input.from > 366 * 86400000 || input.to > Date.now() + 86400000 || typeof input.includeHistory !== 'boolean') {
      throw invalid('usage_window', 'Choose a valid UTC date window of at most 366 days and an explicit history setting.')
    }
    const saved = this.#prices(), rows = this.store.usageRows(input.from, input.to)
    const attempts = new Map<string, UsageRecord>()
    for (const row of rows) {
      signal.throwIfAborted()
      // Empty attempts remain visible in coverage, never as zero-token claims.
      for (let attempt = 1; attempt <= Math.min(row.attempts, 100); attempt++) {
        const id = `${row.stepID}:${attempt}`
        if (!attempts.has(id)) {
          if (attempts.size >= 100000) throw invalid('usage_window', 'Too many attempts in this date range. Choose a shorter window.')
          attempts.set(id, { id, at: row.at, provider: row.provider, model: row.model, project: row.projectless ? 'No project' : row.cwd })
        }
      }
      if (!row.data) continue
      const part = JSON.parse(row.data) as UsageCounters & { attempt?: number }
      const record = attempts.get(`${row.stepID}:${part.attempt ?? 1}`)
      if (!record) continue
      for (const key of keys) { const value = key === 'costUSD' ? money(part[key]) : count(part[key]); if (value !== undefined) record[key] = value }
    }
    const imported = input.includeHistory ? await importUsageHistory(input.from, input.to, this.store.vendorSessions(), signal, this.historyHome) : { records: [], sources: [] }
    const reviews = this.store.accessUsageRows(input.from, input.to)
    if (reviews.length > 100000) throw invalid('usage_window', 'Too many AI reviews in this date range. Choose a shorter window.')
    for (const row of reviews) {
      const review = JSON.parse(row.data) as import('./protocol').AccessReview
      const record: UsageRecord = { id: `review:${review.toolCallID}`, at: review.at, provider: review.model.split('/')[0]!, model: review.model, project: row.projectless ? 'No project' : row.cwd }
      for (const key of keys) { const value = key === 'costUSD' ? money(review.usage?.[key]) : count(review.usage?.[key]); if (value !== undefined) record[key] = value }
      attempts.set(record.id, record)
    }
    const records = [...attempts.values(), ...imported.records]
    const summary = aggregateUsage(records, saved.rates)
    const trimmed = summary.models.length > 100 || summary.projects.length > 100 || summary.providers.length > 100
    summary.models = summary.models.slice(0, 100); summary.projects = summary.projects.slice(0, 100); summary.providers = summary.providers.slice(0, 100)
    const present = new Map(summary.days.map((row) => [row.id, row]))
    const start = new Date(input.from); start.setUTCHours(0, 0, 0, 0)
    for (let at = start.getTime(); at < input.to; at += 86400000) {
      const id = new Date(at).toISOString().slice(0, 10)
      if (!present.has(id)) present.set(id, { ...zero(), id, label: id, costUSD: 0 })
    }
    summary.days = [...present.values()].sort((a, b) => a.id.localeCompare(b.id))
    return { ...summary, from: input.from, to: input.to, generatedAt: Date.now(), pricing: saved.rates, pricingRevision: saved.revision, scannedRecords: rows.length + reviews.length,
      sources: [{ name: 'Hiroshi', status: 'included', files: 1, records: attempts.size, skipped: 0, detail: 'Durable attempts across all tasks, attributed to the start of each call.' }, ...imported.sources],
      warnings: ['UTC dates. Input includes cache reads/writes; output includes reasoning, so these are never added twice.',
        'Configured rates are estimates, not invoices. Unreported cache is priced at the input rate; missing costs stay unpriced.',
        ...(summary.totals.reportedAttempts < summary.totals.attempts ? ['Some attempts did not report token counts. Observed totals are incomplete.'] : []),
        ...(trimmed ? ['Breakdowns show the top 100 groups; totals include every observed record.'] : []),
        ...(imported.sources.some((source) => source.status === 'partial') ? ['History import was partial. See source coverage below.'] : [])] }
  }
}
