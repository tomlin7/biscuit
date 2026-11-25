import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, useWindowSize } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { UsageGroup, UsageRate, UsageReport } from '../../engine/src/protocol'

const text = '#dddddd', muted = '#929292', border = '#303030'
const number = (value: number) => Intl.NumberFormat('en-US', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(value)
const observed = (value: number | undefined) => value === undefined ? '—' : number(value)
const dollars = (value: number | null) => value === null ? '—' : `$${value.toFixed(2)}`
const percent = (value: number, total: number) => total ? `${(100 * value / total).toFixed(1)}%` : '—'
const buttonStyle = { padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#3a3a3a', pointerEvents: 'auto' as const, hover: { backgroundColor: '#303030' } }

export function UsageSettings({ engine }: { engine: EngineHandle }) {
  const size = useWindowSize(), wide = size.width >= 1080, chartWidth = wide ? Math.min(480, size.width - 660) : Math.max(280, size.width - 380)
  const [period, setPeriod] = useState<'days' | 'months' | 'projects'>('days'), [days, setDays] = useState(30)
  const [metric, setMetric] = useState<'tokens' | 'cost'>('tokens'), [breakdown, setBreakdown] = useState<'models' | 'days'>('models')
  const [history, setHistory] = useState(true), [report, setReport] = useState<UsageReport | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [hover, setHover] = useState<string | null>(null), [pricingModel, setPricingModel] = useState<string | null>(null)
  const [rates, setRates] = useState<Record<keyof UsageRate, string>>({ input: '', cachedInput: '', cacheWrite: '', output: '' })
  const epoch = useRef(0)
  const refresh = useCallback(async () => {
    const generation = ++epoch.current
    setBusy(true); setError('')
    const end = new Date(); end.setUTCHours(24, 0, 0, 0)
    try {
      const next = await engine.usageReport({ from: end.getTime() - days * 86400000, to: end.getTime(), includeHistory: history })
      if (generation === epoch.current) { setReport(next); setHover(null) }
    } catch (error) { if (generation === epoch.current) setError(error instanceof Error ? error.message : 'Could not load usage') }
    finally { if (generation === epoch.current) setBusy(false) }
  }, [engine.usageReport, days, history])
  useEffect(() => { void refresh(); return () => { epoch.current++ } }, [refresh])
  const totals = report?.totals
  const share = (row: UsageGroup) => metric === 'cost'
    ? row.costUSD === null || !totals?.costUSD ? undefined : row.costUSD / totals.costUSD
    : !totals?.tokens ? undefined : row.tokens / totals.tokens
  const segments = <T extends string>(name: string, values: [T, string][], value: T, choose: (value: T) => void, unavailable: T[] = []) => <div style={{ display: 'flex', flexDirection: 'row', borderWidth: 1, borderColor: '#393939', borderRadius: 6 }}>
    {values.map(([id, label]) => <Button key={id} testId={`usage-${name}-${id}`} disabled={busy || unavailable.includes(id)} onClick={() => choose(id)} style={{ padding: 7, borderRadius: 5, backgroundColor: value === id ? '#303030' : '#00000000' }}><text style={{ fontSize: 12, color: value === id ? text : muted }}>{label}</text></Button>)}
  </div>
  const points = report?.[period] ?? []
  const value = (row: UsageGroup) => metric === 'tokens' ? row.tokens : row.costUSD
  const maximum = Math.max(metric === 'cost' ? .01 : 1, ...points.map((row) => value(row) ?? 0))
  const chart = points.slice(0, period === 'projects' ? 12 : 366)
  const active = chart.find((row) => row.id === hover)
  const openRates = (id: string) => {
    setPricingModel(id)
    const rate = report?.pricing[id]
    setRates({ input: rate ? String(rate.input) : '', cachedInput: rate ? String(rate.cachedInput) : '', cacheWrite: rate ? String(rate.cacheWrite) : '', output: rate ? String(rate.output) : '' })
  }
  const saveRate = async (remove = false) => {
    if (!report || !pricingModel || busy) return
    const rate = Object.fromEntries(Object.entries(rates).map(([key, value]) => [key, Number(value)])) as unknown as UsageRate
    if (!remove && Object.values(rates).some((value) => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) { setError('Enter an explicit non-negative USD rate in each field. Use 0 only for a free token category.'); return }
    setBusy(true); setError('')
    try { await engine.updateUsagePricing({ revision: report.pricingRevision, model: pricingModel, rate: remove ? null : rate }); setPricingModel(null); await refresh() }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save model rates'); setBusy(false) }
  }
  return <div testId="usage-settings" style={{ width: '100%', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 22 }}>
    <text style={{ fontSize: 20, fontWeight: 600, color: text }}>Usage</text>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <text testId="usage-date-range" style={{ fontSize: 12, color: muted }}>{report ? `${new Date(report.from).toISOString().slice(0, 10)} to ${new Date(report.to - 1).toISOString().slice(0, 10)} · UTC` : 'Loading usage…'}</text>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
        {segments('period', [['days', 'Daily'], ['months', 'Monthly'], ['projects', 'Projects']], period, setPeriod)}
        <Select value={String(days)} disabled={busy} onValueChange={(value) => setDays(Number(value))} items={[7, 30, 90].map((value) => ({ value: String(value), label: `Last ${value} days` }))}>
          <SelectTrigger testId="usage-range" style={buttonStyle}><text style={{ fontSize: 12, color: muted }}>{`Last ${days} days`}</text></SelectTrigger>
          <SelectContent style={{ backgroundColor: '#252525', padding: 6, borderRadius: 10 }}>{[7, 30, 90].map((value) => <SelectItem key={value} value={String(value)} testId={`usage-range-${value}`} style={{ padding: 8 }}><text style={{ fontSize: 12, color: text }}>{`Last ${value} days`}</text></SelectItem>)}</SelectContent>
        </Select>
        <Button testId="usage-refresh" disabled={busy} onClick={() => void refresh()} style={buttonStyle}><text style={{ fontSize: 12, color: text }}>{busy ? 'Loading…' : 'Refresh'}</text></Button>
      </div>
    </div>
    {error && <text testId="usage-error" style={{ fontSize: 12, color: '#F87171' }}>{error}</text>}
    <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 30 }}>
      <div style={{ width: wide ? 280 : undefined, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
        <text style={{ fontSize: 12, color: muted }}>OBSERVED TOKEN COST</text>
        <text testId="usage-total-cost" style={{ fontSize: 30, fontWeight: 600, color: text }}>{dollars(totals?.costUSD ?? null)}</text>
        <text style={{ fontSize: 12, color: muted }}>{totals?.costUSD == null ? 'No reported cost or configured model rate' : 'Reported cost plus configured/source rate estimates'}</text>
        <text style={{ fontSize: 12, color: muted }}>{totals ? `${percent(totals.providerPricedTokens + totals.estimatedPricedTokens, totals.tokens)} of observed tokens priced` : 'Waiting for the engine'}</text>
        {report?.providers.slice(0, 8).map((row, index) => <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 13, color: text }}>{row.label}</text><text style={{ fontSize: 12, color: text }}>{metric === 'cost' ? dollars(row.costUSD) : number(row.tokens)}</text></div>
          <div style={{ height: 3, backgroundColor: border, borderRadius: 2 }}><div style={{ height: 3, borderRadius: 2, width: `${Math.max(0, Math.min(100, 100 * (share(row) ?? 0)))}%`, backgroundColor: index ? '#df805d' : '#dddddd' }} /></div>
        </div>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexGrow: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 13, fontWeight: 600, color: text }}>{`${period === 'projects' ? 'By project' : period === 'months' ? 'Monthly' : 'Daily'} ${metric === 'tokens' ? 'tokens' : 'priced cost'}`}</text>
          {segments('metric', [['cost', 'Cost'], ['tokens', 'Tokens']], metric, setMetric, !totals || totals.costUSD === null ? ['cost'] : [])}
        </div>
        {period === 'projects' ? <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minHeight: 220 }}>{chart.map((row) => <div key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 12, color: muted }}>{row.label}</text><text style={{ fontSize: 12, color: text }}>{metric === 'cost' ? dollars(row.costUSD) : number(row.tokens)}</text></div>
          <div style={{ height: 3, width: `${100 * (value(row) ?? 0) / maximum}%`, backgroundColor: '#bdbdbd' }} />
        </div>)}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <text style={{ fontSize: 11, color: muted }}>{metric === 'cost' ? dollars(maximum) : number(maximum)}</text>
          <div testId="usage-chart" onMouseLeave={() => setHover(null)} style={{ width: chartWidth, height: 220, position: 'relative' }}>
            {[1, 55, 110, 165, 219].map((top) => <div key={top} style={{ position: 'absolute', left: 0, top, width: chartWidth, height: 1, backgroundColor: border }} />)}
            <svg style={{ width: chartWidth, height: 220, color: text }} source={`<svg viewBox="0 0 ${chartWidth} 220" fill="none">${chart.map((row, index) => {
              const next = chart[index + 1], a = value(row), b = next ? value(next) : null
              if (a === null || b === null) return ''
              return `<path d="M${index * chartWidth / Math.max(1, chart.length - 1)} ${219 - 210 * a / maximum}L${(index + 1) * chartWidth / Math.max(1, chart.length - 1)} ${219 - 210 * b / maximum}" stroke="#dddddd" stroke-width="2"/>`
            }).join('')}${chart.map((row, index) => { const amount = value(row); return amount === null ? '' : `<circle cx="${index * chartWidth / Math.max(1, chart.length - 1)}" cy="${219 - 210 * amount / maximum}" r="${chart.length === 1 ? 3 : 1}" fill="#dddddd"/>` }).join('')}</svg>`} />
            {chart.map((row, index) => <div key={row.id} onMouseEnter={() => setHover(row.id)} style={{ position: 'absolute', left: index * chartWidth / Math.max(1, chart.length), top: 0, width: Math.max(1, chartWidth / Math.max(1, chart.length)), height: 220, pointerEvents: 'auto' }} />)}
            {active && <div testId="usage-chart-tooltip" style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#252525', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#444444', display: 'flex', flexDirection: 'column', gap: 7 }}><text style={{ fontSize: 12, color: muted }}>{active.label}</text><text style={{ fontSize: 12, color: text }}>{`${number(active.tokens)} tokens · ${dollars(active.costUSD)}`}</text></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 11, color: muted }}>{chart[0]?.label ?? 'No recorded usage'}</text><text style={{ fontSize: 11, color: muted }}>{chart.at(-1)?.label ?? ''}</text></div>
        </div>}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: border }}>
      {([['Processed tokens', observed(totals?.tokens), `${observed(totals?.activeDays)} active days`], ['Cached input', observed(totals?.cachedInput), `${observed(totals?.cacheReportedAttempts)} attempts report cache`],
        ['Uncached input', observed(totals?.uncachedInput), `${observed(totals?.unclassifiedInput)} unclassified · ${observed(totals?.cacheWrites)} writes`],
        ['Output', observed(totals?.output), `Includes ${observed(totals?.reasoning)} reasoning`], ['Cache savings', dollars(totals?.cacheSavingsUSD ?? null), 'Configured rate estimate']] as const).map(([label, value, detail]) => <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, flexGrow: 1, flexBasis: 0, minWidth: 0, borderRightWidth: 1, borderColor: border }}><text style={{ fontSize: 12, color: muted }}>{label}</text><text style={{ fontSize: 15, color: text }}>{value}</text><text style={{ fontSize: 11, color: muted }}>{detail}</text></div>)}
    </div>
    <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 30 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexGrow: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}><text style={{ fontSize: 13, fontWeight: 600, color: text }}>Breakdown</text>{segments('breakdown', [['models', 'Model'], ['days', 'Day']], breakdown, setBreakdown)}</div>
        <div style={{ display: 'flex', flexDirection: 'row', paddingBottom: 6 }}><text style={{ flexGrow: 1, fontSize: 12, color: muted }}>{breakdown === 'models' ? 'Model' : 'Day'}</text><text style={{ width: 80, fontSize: 12, color: muted }}>Cost</text><text style={{ width: 65, fontSize: 12, color: muted }}>Share</text><text style={{ width: 75, fontSize: 12, color: muted }}>Tokens</text></div>
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 260, overflowY: 'scroll' }}>
          {report?.[breakdown].slice(0, 100).map((row) => <Button key={row.id} testId={`usage-row-${row.id}`} disabled={breakdown !== 'models' || busy} onClick={() => openRates(row.id)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: border, pointerEvents: 'auto', hover: { backgroundColor: '#252525' } }}>
            <text style={{ flexGrow: 1, minWidth: 0, fontSize: 12, color: text, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</text><text style={{ width: 80, fontSize: 12, color: text }}>{dollars(row.costUSD)}</text><text style={{ width: 65, fontSize: 12, color: muted }}>{share(row) === undefined ? '—' : `${(100 * share(row)!).toFixed(1)}%`}</text><text style={{ width: 75, fontSize: 12, color: muted }}>{number(row.tokens)}</text>
          </Button>)}
        </div>
      </div>
      <div style={{ width: wide ? 240 : undefined, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <text style={{ fontSize: 13, fontWeight: 600, color: text }}>Cost quality</text>
        {([['Provider reported', percent(totals?.providerPricedTokens ?? 0, totals?.tokens ?? 0)], ['Model/source estimated', percent(totals?.estimatedPricedTokens ?? 0, totals?.tokens ?? 0)], ['Unpriced', percent(totals?.unpricedTokens ?? 0, totals?.tokens ?? 0)], ['Cache savings', dollars(totals?.cacheSavingsUSD ?? null)]] as const).map(([label, value]) => <div key={label} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderColor: border }}><text style={{ fontSize: 12, color: muted }}>{label}</text><text style={{ fontSize: 12, color: text }}>{value}</text></div>)}
        <text style={{ fontSize: 11, color: muted }}>Choose a model row to configure USD rates per million tokens.</text>
      </div>
    </div>
    {pricingModel && <div testId="usage-pricing" style={{ padding: 16, backgroundColor: '#222222', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <text style={{ fontSize: 13, color: text }}>{`Model rates · ${report?.models.find((row) => row.id === pricingModel)?.label ?? pricingModel}`}</text>
      <text style={{ fontSize: 12, color: muted }}>Manual USD rates per million tokens. Estimates are distinct from provider-reported cost.</text>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>{(['input', 'cachedInput', 'cacheWrite', 'output'] as const).map((key) => <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, flexGrow: 1, flexBasis: 0, minWidth: 0 }}><text style={{ fontSize: 12, color: muted }}>{({ input: 'Input', cachedInput: 'Cached input', cacheWrite: 'Cache writes', output: 'Output' })[key]}</text><input testId={`usage-rate-${key}`} value={rates[key]} onChange={(event) => setRates((current) => ({ ...current, [key]: event.value ?? '' }))} style={{ width: '100%', minWidth: 0, height: 30, backgroundColor: '#141414', color: text, padding: 7, borderRadius: 6 }} /></div>)}</div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}><Button testId="usage-rates-save" disabled={busy} onClick={() => void saveRate()} style={buttonStyle}><text style={{ fontSize: 12, color: text }}>Save rates</text></Button><Button testId="usage-rates-remove" disabled={busy} onClick={() => void saveRate(true)} style={buttonStyle}><text style={{ fontSize: 12, color: muted }}>Remove rates</text></Button><Button disabled={busy} onClick={() => setPricingModel(null)} style={buttonStyle}><text style={{ fontSize: 12, color: muted }}>Close</text></Button></div>
    </div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <Button testId="usage-history-toggle" disabled={busy} onClick={() => setHistory(!history)} style={{ ...buttonStyle, alignSelf: 'flex-start' }}><text style={{ fontSize: 12, color: text }}>{history ? 'Available agent history included' : 'Hiroshi activity only'}</text></Button>
      <text testId="usage-coverage" style={{ fontSize: 11, color: muted }}>{report ? `${totals?.reportedAttempts ?? 0} of ${totals?.attempts ?? 0} attempts report tokens · ${report.scannedRecords} durable records scanned · ${report.sources.filter((source) => source.name !== 'Hiroshi').reduce((sum, source) => sum + source.files, 0)} history files · ${busy ? 'Refreshing' : report.sources.some((source) => source.status === 'partial') ? 'Partial coverage' : 'Updated'}` : 'No report available'}</text>
      {report?.sources.map((source) => <text key={source.name} style={{ fontSize: 11, color: muted }}>{`${source.name}: ${source.status} · ${source.records} records · ${source.skipped} skipped. ${source.detail}`}</text>)}
      {report?.warnings.map((warning) => <text key={warning} style={{ fontSize: 11, color: muted }}>{warning}</text>)}
    </div>
  </div>
}
