import React, { useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogPortal, DialogPopup, Select, SelectContent, SelectTrigger, useWindowSize } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { SkillDocument, SkillInfo, SkillInventory, SkillOrigin } from '../../engine/src/protocol'
import { AgentIcon } from './AgentIcon'
import { clipboardAvailable, copyText } from '../shell/clipboard'
import { openLocalPath } from '../shell/open-path'

const ink = '#dddddd', muted = '#929292', border = '#303030'
const sourceNames: Record<string, string> = { shared: 'Shared', claude: 'Claude', codex: 'Codex', cursor: 'Cursor', pi: 'Pi', 'oh-my-pi': 'Oh My Pi', amp: 'Amp', grok: 'Grok', fx: 'Fx' }
const row = { display: 'flex' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, padding: 8, borderRadius: 6, flexShrink: 0, pointerEvents: 'auto' as const, cursor: 'pointer' as const, hover: { backgroundColor: '#303030' } }
function Action({ id, label, disabled = false, onClick }: { id: string; label: string; disabled?: boolean; onClick: () => void }) {
  const icon = ({ 'skill-open': 'm3 10 7-7 3 3-7 7-4 1ZM9 4l3 3', 'skill-folder': 'M2 5V3h5l2 2h5v8H2zM2 7h12', 'skill-copy': 'M6 6h8v8H6zM3 10H2V2h8v1', 'skill-delete': 'M3 4h10M6 2h4M5 4v10h6V4M7 7v4M9 7v4', 'skills-refresh': 'M13 6a5 5 0 1 0-1 6M13 2v4H9' } as Record<string, string>)[id]
  return <Button testId={id} disabled={disabled} onClick={onClick} style={{ ...row, padding: 6, paddingTop: 4, paddingBottom: 4, backgroundColor: '#1b1b1b', borderWidth: 1, borderColor: '#3a3a3a' }}>{icon && <svg style={{ width: 12, height: 12, flexShrink: 0 }} source={`<svg viewBox="0 0 16 16" fill="none" stroke="#888888" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>`} />}<text style={{ fontSize: 11, lineHeight: 16, color: disabled ? '#686868' : ink, whiteSpace: 'nowrap' }}>{label}</text></Button>
}
function age(time: number) { const days = Math.max(0, Math.floor((Date.now() - time) / 86400000)); return days ? `${days}d ago` : 'Today' }
export function SkillsSettings({ engine, renderMarkdown, openPath = openLocalPath }: { engine?: EngineHandle; renderMarkdown: (source: string) => React.ReactNode; openPath?: (file: string) => Promise<void> }) {
  const size = useWindowSize(), compact = size.width < 900
  const [inventory, setInventory] = useState<SkillInventory | null>(null), [selected, setSelected] = useState<string | null>(null), [document, setDocument] = useState<SkillDocument | null>(null)
  const [query, setQuery] = useState(''), [source, setSource] = useState('all'), [filterOpen, setFilterOpen] = useState(false), [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false), [reading, setReading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState<{ skill: SkillInfo; origin: SkillOrigin } | null>(null)
  const pending = useRef(false), generation = useRef(0)
  const ready = engine?.snapshot.status === 'ready', sessionID = engine?.snapshot.sessionID
  const skills = inventory?.skills ?? [], filtered = skills.filter((skill) => (source === 'all' || skill.origins.some((item) => item.source === source)) && `${skill.name} ${skill.description} ${skill.path}`.toLowerCase().includes(query.trim().toLowerCase()))
  const skill = filtered.find((item) => item.id === selected) ?? filtered[0]
  const load = async () => {
    if (!engine || !ready || pending.current) return
    const token = generation.current; setLoading(true); setError('')
    try { const next = await engine.skills(); if (token === generation.current) setInventory(next) }
    catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : String(e)) }
    finally { if (token === generation.current) setLoading(false) }
  }
  useEffect(() => {
    generation.current++; pending.current = false; setBusy(false); setInventory(null); setDocument(null); setSelected(null); setConfirmation(null); setError(''); setNotice(''); setDetailOpen(false)
    void load()
    return () => { generation.current++ }
  }, [sessionID, ready, engine?.skills])
  useEffect(() => {
    let live = true
    setDocument(null)
    if (!skill || !ready || !engine) { setReading(false); return }
    setReading(true)
    void engine.skillDocument({ skillID: skill.id, hash: skill.hash }).then((next) => { if (live) { setDocument(next); setError('') } }, (e) => { if (live) setError(e instanceof Error ? e.message : String(e)) }).finally(() => { if (live) setReading(false) })
    return () => { live = false }
  }, [skill?.id, skill?.hash, sessionID, ready, engine?.skillDocument])
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return
    const token = generation.current; pending.current = true; setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : String(e)) }
    finally { if (token === generation.current) { pending.current = false; setBusy(false) } }
  }
  const counts = (id: string) => skills.filter((skill) => skill.origins.some((item) => item.source === id)).length
  const origin = skill?.origins.find((item) => item.source === source) ?? skill?.origins.find((item) => !item.managed) ?? skill?.origins[0]
  const disabled = busy || !ready
  return <div testId="skills-settings" style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', minHeight: 0, minWidth: 0 }}>
    {(!compact || !detailOpen) && <div style={{ width: compact ? '100%' : 264, minWidth: 200, flexShrink: 0, borderRightWidth: 1, borderColor: border, padding: 10, paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, height: 30, paddingLeft: 8, paddingRight: 8, borderRadius: 7, borderWidth: 1, borderColor: '#363636', backgroundColor: '#151515' }}><AgentIcon id="search" size={12} color={muted} /><input testId="skills-search" value={query} placeholder="Search skills…" onChange={(event) => setQuery(event.value ?? '')} style={{ flexGrow: 1, minWidth: 0, height: 28, borderWidth: 0, backgroundColor: '#00000000', fontSize: 12, color: ink }} /></div>
      <Select open={filterOpen} onOpenChange={setFilterOpen}>
        <SelectTrigger testId="skills-filter" style={{ ...row, padding: 5, borderWidth: 1, borderColor: '#3a3a3a', justifyContent: 'space-between', width: '100%' }}><AgentIcon id="shared" size={13} /><text style={{ fontSize: 12, color: muted }}>{source === 'all' ? 'All skills' : sourceNames[source] ?? source}</text><AgentIcon id="down" size={11} /></SelectTrigger>
        <SelectContent testId="skills-filter-menu" side="bottom" style={{ width: 210, padding: 5, borderRadius: 9, backgroundColor: '#222222', borderWidth: 1, borderColor: '#3a3a3a' }}>
          {['all', ...Object.keys(sourceNames)].map((id) => <Button key={id} testId={`skills-filter-${id}`} onClick={() => { setSource(id); setFilterOpen(false) }} style={{ ...row, backgroundColor: source === id ? '#343434' : '#00000000' }}><AgentIcon id={id} size={13} /><text style={{ fontSize: 12, color: ink, flexGrow: 1 }}>{id === 'all' ? 'All skills' : `${sourceNames[id]}${counts(id) ? ` · ${counts(id)}` : ''}`}</text>{source === id && <svg style={{ width: 12, height: 12 }} source='<svg viewBox="0 0 16 16" fill="none" stroke="#999999" stroke-width="1.3"><path d="m3 8 3 3 7-7"/></svg>' />}</Button>)}
        </SelectContent>
      </Select>
      <div style={{ flexGrow: 1, minHeight: 0, overflowY: 'scroll', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {(['user', 'project'] as const).map((scope) => {
          const group = filtered.filter((skill) => skill.origins.some((item) => item.scope === scope) && (scope === 'user' || !skill.origins.some((item) => item.scope === 'user')))
          return group.length ? <div key={scope} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <text style={{ fontSize: 10.5, color: muted, marginTop: 12, padding: 6 }}>{`${scope.toUpperCase()} ${group.length}`}</text>
            {group.map((item) => <Button key={item.id} testId={`skill-${item.id}`} onClick={() => { setSelected(item.id); setDetailOpen(true); setError(''); setNotice('') }} style={{ ...row, backgroundColor: skill?.id === item.id ? '#272727' : '#00000000' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AgentIcon id={item.origins[0]?.source ?? 'shared'} size={15} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, gap: 3 }}><text style={{ fontSize: 12, fontWeight: 600, color: item.enabled ? ink : muted, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.name}</text><text style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.description}</text></div>
            </Button>)}
          </div> : null
        })}
        {!filtered.length && <text testId="skills-empty" style={{ fontSize: 12, color: muted, padding: 10 }}>{loading ? 'Finding installed skills…' : !ready ? 'Connect the Hiroshi daemon to discover installed skills.' : query || source !== 'all' ? 'No skills match this search and source.' : 'No installed skills found. Skills in your user and project folders appear here.'}</text>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><text testId="skills-count" style={{ fontSize: 11, color: muted }}>{`${filtered.length} ${filtered.length === 1 ? 'skill' : 'skills'}`}</text><Action id="skills-refresh" label={loading ? 'Scanning…' : 'Refresh'} disabled={disabled || loading} onClick={() => void load()} /></div>
      {compact && !detailOpen && error && <text testId="skills-error" style={{ fontSize: 12, color: '#f38a8a' }}>{error}</text>}
    </div>}
    {(!compact || detailOpen) && <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0, padding: 24, gap: 16, overflowY: 'scroll' }}>
      {compact && <Action id="skills-back" label="All skills" onClick={() => setDetailOpen(false)} />}
      {skill ? <>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AgentIcon id={origin?.source ?? 'shared'} size={20} /></div>
          <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}><text testId="skill-name" style={{ fontSize: 14, fontWeight: 600, color: ink }}>{skill.name}</text><text style={{ fontSize: 11.5, color: muted }}>{`${origin ? sourceNames[origin.source] ?? origin.source : 'Shared'} · ${skill.origins.some((o) => o.scope === 'user') ? 'available in every project' : 'this project'}${skill.origins.some((o) => o.linked) ? ' · linked installation' : ''}`}</text></div>
          <text testId="skill-status" style={{ fontSize: 10, color: muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{skill.enabled ? 'Enabled' : 'Disabled'}</text>
          <Button testId="skill-enabled" aria-label={skill.enabled ? 'Disable this skill' : 'Enable this skill'} disabled={disabled} onClick={() => void run(async () => { const token = generation.current; const next = await engine!.updateSkill({ skillID: skill.id, hash: skill.hash, revision: inventory!.revision, enabled: !skill.enabled }); if (token === generation.current) setInventory(next) })} style={{ width: 36, height: 20, borderRadius: 10, padding: 3, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: skill.enabled ? 'flex-end' : 'flex-start', backgroundColor: skill.enabled ? '#dedede' : '#505050', flexShrink: 0 }}><div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#252525' }} /></Button>
        </div>
        <text testId="skill-description" style={{ fontSize: 12, lineHeight: 18, color: '#b6b6b6' }}>{skill.description}</text>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            ['Invoke', skill.invoke], ['Location', skill.path], ['Contents', `${(skill.bytes / 1024).toFixed(1)} KB`], ['Updated', age(skill.updatedAt)],
          ].map(([label, value]) => <div key={label} style={{ display: 'flex', flexDirection: 'row', gap: 12, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: border }}><text style={{ width: 84, flexShrink: 0, color: muted, fontSize: 11.5 }}>{label}</text><text testId={`skill-${label!.toLowerCase()}`} style={{ flexGrow: 1, minWidth: 0, fontSize: 11.5, color: '#bbbbbb', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</text></div>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
          <Action id="skill-open" label="Open SKILL.md" disabled={disabled} onClick={() => void run(async () => { const current = await engine!.skillDocument({ skillID: skill.id, hash: skill.hash }); await openPath(current.skill.path) })} />
          <Action id="skill-folder" label="Show in File Manager" disabled={disabled} onClick={() => void run(async () => { const current = await engine!.skillDocument({ skillID: skill.id, hash: skill.hash }); const installation = current.skill.origins.find((item) => item.path === origin?.path); if (!installation) throw new Error('This installation changed. Refresh Skills before opening its folder.'); await openPath(installation.path) })} />
          <Action id="skill-copy" label="Copy Path" disabled={disabled || !clipboardAvailable()} onClick={() => void run(async () => { await copyText(skill.path); setNotice('Path copied') })} />
          <div style={{ flexGrow: 1 }} />
          <Action id="skill-delete" label="Delete" disabled={disabled || !origin || origin.managed} onClick={() => { if (origin) setConfirmation({ skill, origin }) }} />
        </div>
        <div style={{ height: 1, backgroundColor: border }} />
        <text style={{ fontSize: 11.5, color: muted }}>SKILL.md</text>
        {reading ? <text style={{ fontSize: 12, color: muted }}>Reading skill…</text> : document?.skill.id === skill.id && document.skill.hash === skill.hash ? <div testId="skill-document" style={{ minWidth: 0 }}>{renderMarkdown(document.markdown.slice(0, 65536))}{document.markdown.length > 65536 && <text style={{ fontSize: 11, color: muted }}>Preview limited to 64 KiB. Open SKILL.md to read the full document.</text>}</div> : null}
      </> : <text style={{ fontSize: 13, color: muted }}>{loading ? 'Finding installed skills…' : 'Select a skill to read its instructions.'}</text>}
      {(inventory?.warnings.length ?? 0) > 0 && <text testId="skills-warnings" style={{ fontSize: 11.5, color: '#d6ab7a' }}>{inventory!.warnings.join('\n')}</text>}
      {inventory?.truncated && <text style={{ fontSize: 11.5, color: '#d6ab7a' }}>The scan reached its file or size limit. Some skills are not shown.</text>}
      {error && <text testId="skills-error" style={{ fontSize: 12, color: '#f38a8a' }}>{error}</text>}
      {notice && <text testId="skills-notice" style={{ fontSize: 12, color: muted }}>{notice}</text>}
    </div>}
    <Dialog open={!!confirmation} onOpenChange={(next) => { if (!next && !busy) setConfirmation(null) }}><DialogPortal {...({ position: { x: 0, y: 0 } } as any)} style={{ width: size.width, height: size.height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000088' }}>
      <DialogPopup testId="skill-delete-dialog" style={{ width: Math.min(510, size.width - 40), padding: 22, borderRadius: 12, backgroundColor: '#222222', borderWidth: 1, borderColor: '#3a3a3a', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <text style={{ fontSize: 17, color: ink, fontWeight: 600 }}>{`Remove ${confirmation?.skill.name ?? 'skill'}?`}</text>
        <text style={{ fontSize: 12, color: '#b6b6b6' }}>{`The selected installation will move to .hiroshi-skill-trash beside its skills folder. Linked targets and other installations stay available.\n\n${confirmation?.origin.path ?? ''}`}</text>
        {error && <text testId="skill-remove-error" style={{ fontSize: 12, color: '#f38a8a' }}>{error}</text>}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
          <Action id="skill-delete-confirm" label={busy ? 'Removing…' : 'Move to trash'} disabled={disabled || !confirmation} onClick={() => void run(async () => { if (!confirmation || !inventory) return; const token = generation.current; const result = await engine!.removeSkill({ skillID: confirmation.skill.id, hash: confirmation.skill.hash, revision: inventory.revision, origin: confirmation.origin.path }); if (token === generation.current) { setInventory(result.inventory); setConfirmation(null); setNotice(`Moved to ${result.removedTo}`) } })} />
          <Action id="skill-delete-cancel" label="Cancel" disabled={busy} onClick={() => setConfirmation(null)} />
        </div>
      </DialogPopup>
    </DialogPortal></Dialog>
  </div>
}
