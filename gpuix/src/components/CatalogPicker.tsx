import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, useGpuix, type PublicInstance } from '@gpuix/react'
import { AgentIcon, agentName } from './AgentIcon'
import { readModelFavorites, saveModelFavorites } from '../shell/model-favorites'

export interface CatalogChoice { id: string; label: string; group: string; disabled?: boolean }
export function CatalogPicker({ value, onChange, choices, triggerId = 'model-picker', valueTestId, itemPrefix = 'model-', disabled = false, allowReselect = false }: {
  value: string; onChange: (id: string) => void; choices: CatalogChoice[]; triggerId?: string; valueTestId?: string; itemPrefix?: string; disabled?: boolean; allowReselect?: boolean
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [provider, setProvider] = useState<string | null>(null)
  const [activeID, setActiveID] = useState<string | null>(null)
  const trigger = useRef<PublicInstance | null>(null), { renderer } = useGpuix()
  const menu = useRef<PublicInstance | null>(null), rows = useRef(new Map<string, PublicInstance>())
  useEffect(() => { const row = activeID ? rows.current.get(activeID) : null; if (row) renderer?.scrollIntoView?.(row.id) }, [activeID, renderer])
  const actionKey = (event: { key?: string; stopPropagation: () => void }) => {
    if (event.key === 'enter' || event.key === 'space') event.stopPropagation()
  }
  const [favoritesOnly, setFavoritesOnly] = useState(false), [favorites, setFavorites] = useState<string[]>(() => readModelFavorites() ?? []), [error, setError] = useState('')
  const selected = choices.find((item) => item.id === value)
  const groups = useMemo(() => [...new Set(choices.map((item) => item.group))], [choices])
  const filtered = choices.filter((item) => (!provider || item.group === provider) && (!favoritesOnly || favorites.includes(item.id)) &&
    `${item.label} ${agentName(item.group)} ${item.id}`.toLowerCase().includes(query.trim().toLowerCase()))
  const chooseActive = () => {
    const enabled = filtered.filter((item) => !item.disabled)
    const chosen = enabled.find((item) => item.id === activeID) ?? enabled[0]
    if (chosen) { onChange(chosen.id); setOpen(false); if (trigger.current) renderer?.focusElement?.(trigger.current.id) }
  }
  const favorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id]
    try { saveModelFavorites(next); setFavorites(next); setError('') }
    catch { setError('Could not save favorites. Check the engine data directory.') }
  }
  return <Select value={allowReselect && open ? '' : value} disabled={disabled} open={open} onOpenChange={(next) => {
    setOpen(next)
    if (next) { setQuery(''); setProvider(null); setActiveID(null); setFavoritesOnly(false); const saved = readModelFavorites(); if (saved) setFavorites(saved) }
  }} onValueChange={onChange} items={filtered.map((item) => ({ value: item.id, label: item.label }))} style={{ flexShrink: 0 }}>
    <div style={{ position: 'relative', display: 'flex' }}>
      <SelectTrigger ref={trigger} testId={triggerId} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingLeft: 7, paddingRight: 7,
        maxWidth: 520, borderRadius: 6, cursor: disabled ? undefined : 'pointer', backgroundColor: open ? '#303030' : '#00000000', hover: { backgroundColor: '#2B2B2B' } }}>
        <AgentIcon id={selected?.group ?? 'local'} size={14} />
        <text testId={valueTestId} style={{ fontSize: 13, color: '#b3b3b3', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>{selected?.label ?? (value ? `Unavailable model: ${value}` : 'No models available')}</text>
        <AgentIcon id="down" size={10} color="#777777" />
      </SelectTrigger>
      <SelectContent ref={menu} side="top" sideOffset={5} testId="model-menu" style={{ width: 460, maxWidth: '95%', padding: 6, backgroundColor: '#202020', borderRadius: 14, borderWidth: 1, borderColor: '#3a3a3a', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <div style={{ width: 42, height: 360, overflowY: 'scroll', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', paddingTop: 3, paddingRight: 6, borderRightWidth: 1, borderColor: '#303030', flexShrink: 0 }}>
          <Button testId="model-favorites" aria-label="Favorite models" aria-pressed={favoritesOnly} onKeyDown={actionKey} onClick={() => { setFavoritesOnly(!favoritesOnly); setProvider(null) }}
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: favoritesOnly ? '#333333' : '#00000000', hover: { backgroundColor: '#303030' } }}><AgentIcon id="favorites" size={20} color={favoritesOnly ? '#eeeeee' : '#888888'} /></Button>
          <div style={{ height: 1, width: 26, backgroundColor: '#303030', marginTop: 2, marginBottom: 2 }} />
          {groups.map((group) => <Button key={group} testId={`model-provider-${group}`} aria-label={agentName(group)} aria-pressed={provider === group} onKeyDown={actionKey} onClick={() => { setProvider(provider === group ? null : group); setFavoritesOnly(false) }}
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: provider === group ? '#363636' : '#00000000', hover: { backgroundColor: '#303030' } }}><AgentIcon id={group} size={21} /></Button>)}
        </div>
        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 9 }}>
          <div style={{ height: 34, borderRadius: 10, backgroundColor: '#2a2a2a', display: 'flex', flexDirection: 'row', alignItems: 'center', paddingLeft: 10, gap: 7, margin: 3, flexShrink: 0 }}>
            <AgentIcon id="search" size={14} color="#8b8b8b" />
            <input testId="model-search" autoFocus value={query} placeholder="Search models…" onChange={(event) => { setQuery(event.value ?? ''); setActiveID(null) }} onSubmit={chooseActive} onKeyDown={(event) => {
              event.stopPropagation()
              const enabled = filtered.filter((item) => !item.disabled)
              const delta = event.key === 'down' || (event.modifiers?.ctrl && event.key === 'n') ? 1 : event.key === 'up' || (event.modifiers?.ctrl && event.key === 'p') ? -1 : 0
              if (delta) {
                event.preventDefault()
                if (enabled.length) { const found = enabled.findIndex((item) => item.id === activeID), index = found < 0 ? delta > 0 ? -1 : 0 : found; setActiveID(enabled[(index + delta + enabled.length) % enabled.length]!.id) }
              } else if (event.key === 'escape') { event.preventDefault(); setOpen(false); if (trigger.current) renderer?.focusElement?.(trigger.current.id) }
              else if (event.key === 'tab' && menu.current) { event.preventDefault(); if (event.modifiers?.shift) renderer?.focusPreviousWithin?.(menu.current.id); else renderer?.focusNextWithin?.(menu.current.id) }
            }} style={{ flexGrow: 1, minWidth: 0, height: 32, fontSize: 12, color: '#dddddd', backgroundColor: '#00000000', borderWidth: 0 }} />
          </div>
          <div testId="model-results" style={{ display: 'flex', flexDirection: 'column', height: 326, overflowY: 'scroll', flexShrink: 0 }}>
            {filtered.length === 0 && <text testId="model-empty" style={{ padding: 14, color: '#969696', fontSize: 12 }}>{favoritesOnly ? 'No favorite models match. Star a model to save it here.' : 'No models match your search.'}</text>}
            {filtered.map((item) => <div key={item.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
              <SelectItem ref={(row) => { if (row) rows.current.set(item.id, row); else rows.current.delete(item.id) }} value={item.id} disabled={item.disabled} testId={`${itemPrefix}${item.id}`} onMouseEnter={() => setActiveID(item.id)} style={(state) => ({ height: 58, flexGrow: 1, minWidth: 0, paddingLeft: 10, paddingRight: 4, borderRadius: 9, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
                opacity: state.disabled ? 0.5 : 1, backgroundColor: item.id === activeID || state.highlighted ? '#303030' : item.id === value ? '#292929' : '#00000000', hover: { backgroundColor: '#2b2b2b' }, cursor: 'pointer' })}>
                <text style={{ fontSize: 12.5, fontWeight: 600, color: '#dedede', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.label.replace(/^(Agy|Cursor Agent|Pi|Grok):\s*/, '').replace(' · response only', '')}</text>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}><AgentIcon id={item.group} size={12} color="#999999" /><text style={{ fontSize: 11.5, color: '#929292', whiteSpace: 'nowrap' }}>{`${agentName(item.group)}${item.label.includes(' · response only') ? ' · response only' : ''}`}</text></div>
              </SelectItem>
              <Button testId={`model-star-${item.id}`} aria-label={`Favorite ${item.label}`} aria-pressed={favorites.includes(item.id)} onKeyDown={actionKey} onClick={() => favorite(item.id)} style={{ width: 30, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, hover: { backgroundColor: '#303030' } }}><AgentIcon id="favorites" size={14} color={favorites.includes(item.id) ? '#E2B879' : '#777777'} /></Button>
            </div>)}
          </div>
          {error && <text style={{ fontSize: 11, color: '#F87171', padding: 6 }}>{error}</text>}
        </div>
      </SelectContent>
    </div>
  </Select>
}
