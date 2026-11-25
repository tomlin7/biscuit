import React, { useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogPortal, Select, SelectContent, SelectTrigger, useGpuix, useWindowSize, type PublicInstance } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'

export function ProjectMenu({ engine, cwd, onNewProject, triggerId = 'open-project', greeting = false }: {
  engine: Pick<EngineHandle, 'snapshot' | 'openProject' | 'refreshProjects' | 'newSession' | 'selectSession'>
  cwd: string; onNewProject: () => void; triggerId?: string; greeting?: boolean
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef(false)
  const [activeID, setActiveID] = useState<string | null>(null)
  const { renderer } = useGpuix()
  const trigger = useRef<PublicInstance | null>(null), menu = useRef<PublicInstance | null>(null), rows = useRef(new Map<string, PublicInstance>())
  useEffect(() => { const row = activeID ? rows.current.get(activeID) : null; if (row) renderer?.scrollIntoView?.(row.id) }, [activeID, renderer])
  const filtered = engine.snapshot.projects.filter((item) => `${item.name} ${item.cwd}`.toLowerCase().includes(query.trim().toLowerCase()))
  const current = engine.snapshot.sessions.find((item) => item.id === engine.snapshot.sessionID)
  const name = current?.projectless ? 'No project' : engine.snapshot.projects.find((item) => item.cwd === cwd)?.name ?? 'Open project'
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true
    setBusy(true); setError('')
    try { await action(); setOpen(false) } catch (error) { setError(error instanceof Error ? error.message : 'Could not switch project') }
    finally { pending.current = false; setBusy(false) }
  }
  const row = { display: 'flex' as const, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    padding: 9, borderRadius: 6, flexShrink: 0, hover: { backgroundColor: '#303030' } }
  return <Select open={open} onOpenChange={(next) => {
    if (busy) return
    setOpen(next)
    if (next) { setQuery(''); setActiveID(null); setError(''); void engine.refreshProjects().catch(() => {}) }
  }}>
    <SelectTrigger ref={trigger} testId={triggerId} style={{ padding: greeting ? 0 : 7, borderRadius: 5, cursor: 'pointer', hover: { backgroundColor: '#292929' } }}>
      <text style={{ fontSize: greeting ? 21 : 12, fontWeight: greeting ? 500 : 400, color: '#dddddd', whiteSpace: 'nowrap', ...(greeting ? { borderBottomWidth: 1, borderColor: '#666666' } : {}) }}>{name}</text>
    </SelectTrigger>
    <SelectContent ref={menu} testId={`${triggerId}-menu`} side={greeting ? 'bottom' : 'top'} sideOffset={8} style={{ width: 300, padding: 8, borderRadius: 13, backgroundColor: '#222222', borderWidth: 1, borderColor: '#3a3a3a', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <input testId={`${triggerId}-search`} autoFocus value={query} placeholder="Search projects" onChange={(event) => { setQuery(event.value ?? ''); setActiveID(null) }}
        onSubmit={() => { const item = filtered.find((item) => item.id === activeID) ?? filtered[0]; if (item) void run(async () => { if (item.status === 'ready') await engine.openProject(item.cwd); else engine.selectSession(item.sessionID) }) }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'escape') { event.preventDefault(); setOpen(false); if (trigger.current) renderer?.focusElement?.(trigger.current.id) }
          if (event.key === 'tab' && menu.current) { event.preventDefault(); if (event.modifiers?.shift) renderer?.focusPreviousWithin?.(menu.current.id); else renderer?.focusNextWithin?.(menu.current.id) }
          const direction = event.key === 'down' ? 1 : event.key === 'up' ? -1 : 0
          if (direction && filtered.length) {
            event.preventDefault()
            const index = filtered.findIndex((item) => item.id === activeID)
            setActiveID(filtered[((index < 0 ? direction > 0 ? -1 : 0 : index) + direction + filtered.length) % filtered.length]!.id)
          }
        }}
        style={{ height: 30, padding: 8, backgroundColor: '#191919', borderRadius: 9, color: '#dddddd', fontSize: 12, marginBottom: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 220, overflowY: 'scroll' }}>
        {filtered.map((item) => <Button key={item.id} ref={(row) => { if (row) rows.current.set(item.id, row); else rows.current.delete(item.id) }} testId={`${triggerId}-choose-${item.id}`} disabled={busy}
          onMouseEnter={() => setActiveID(item.id)} onClick={() => void run(async () => { if (item.status === 'ready') await engine.openProject(item.cwd); else engine.selectSession(item.sessionID) })} style={{ ...row, backgroundColor: activeID === item.id ? '#303030' : '#00000000' }}>
          <text style={{ fontSize: 13, color: '#dddddd', whiteSpace: 'nowrap' }}>{`${item.name}${item.status === 'ready' ? '' : ` · ${item.status}`}`}</text>
          {cwd === item.cwd && !current?.projectless && <svg style={{ width: 13, height: 13 }} source='<svg viewBox="0 0 16 16" fill="none" stroke="#aaaaaa" stroke-width="1.5"><path d="m3 8 3 3 7-7"/></svg>' />}
        </Button>)}
        {!engine.snapshot.projects.some((item) => `${item.name} ${item.cwd}`.toLowerCase().includes(query.trim().toLowerCase())) && <text style={{ fontSize: 12, color: '#999999', padding: 9 }}>No matching projects</text>}
      </div>
      <div style={{ height: 1, backgroundColor: '#363636', marginTop: 3, marginBottom: 3 }} />
      <Button testId={`${triggerId}-new`} disabled={busy} onClick={() => { setOpen(false); onNewProject() }} style={row}><text style={{ fontSize: 13, color: '#dddddd' }}>New project…</text></Button>
      <Button testId={`${triggerId}-none`} disabled={busy} onClick={() => void run(() => engine.newSession(true))} style={row}><text style={{ fontSize: 13, color: '#dddddd' }}>Don't work in a project</text></Button>
      {error && <text testId={`${triggerId}-error`} style={{ fontSize: 12, color: '#F87171', padding: 6 }}>{error}</text>}
    </SelectContent>
  </Select>
}

export function ProjectSwitcher({ engine, cwd, open, onOpen, onClose }: { engine: EngineHandle; cwd: string; open: boolean; onOpen: () => void; onClose: () => void }) {
  const { renderer } = useGpuix(), size = useWindowSize()
  const [path, setPath] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const identity = engine.snapshot.sessions.find((item) => item.id === engine.snapshot.sessionID)?.workspaceIdentity
  const current = engine.snapshot.projects.find((item) => item.cwd === cwd &&
    engine.snapshot.sessions.find((session) => session.id === item.sessionID)?.workspaceIdentity === identity)
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true
    setBusy(true); setError('')
    try { await action() } catch (error) { setError(error instanceof Error ? error.message : 'Could not open project folder') }
    finally { pending.current = false; setBusy(false) }
  }
  const choose = (folder: string) => run(async () => { await engine.openProject(folder); setPath(''); onClose() })
  const button = (id: string, label: string, action: () => void, disabled = false) => <Button testId={id} disabled={disabled || busy} onClick={action}
    style={{ padding: 9, borderRadius: 6, backgroundColor: '#2c2c2c', cursor: 'pointer', flexShrink: 0 }}><text style={{ fontSize: 12, color: '#dddddd', whiteSpace: 'nowrap' }}>{label}</text></Button>
  return <>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: 8, gap: 10, flexShrink: 0 }}>
      <ProjectMenu engine={engine} cwd={cwd} onNewProject={() => { setError(''); onOpen() }} />
      <text testId="engine-workspace" style={{ fontSize: 11, color: '#929292', flexGrow: 1, minWidth: 0 }}>{cwd}</text>
    </div>
    {current?.detail && <text testId="project-unavailable" style={{ fontSize: 12, color: '#F3BC84', padding: 8 }}>{current.detail}</text>}
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}><DialogPortal {...({ position: { x: 0, y: 0 } } as any)} style={{ width: size.width, height: size.height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000088' }}>
      <div testId="project-dialog" style={{ width: Math.min(680, size.width - 48), maxHeight: size.height - 80, display: 'flex', flexDirection: 'column', gap: 14, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#383838', backgroundColor: '#202020' }}>
        <text style={{ fontSize: 20, color: '#eeeeee', fontWeight: 600 }}>Open project</text>
        <text style={{ fontSize: 12, color: '#a0a0a0' }}>Choose an existing folder. Each task keeps its own project, history and running work.</text>
        {button('project-choose-folder', 'Choose folder…', () => void run(async () => {
          if (!renderer?.promptForPaths) throw new Error('Native folder picker is unavailable. Enter the absolute folder path below.')
          const paths = await renderer.promptForPaths({ files: false, directories: true, multiple: false, prompt: 'Open project' })
          if (!paths?.length) return
          await engine.openProject(paths[0]!); setPath(''); onClose()
        }))}
        <input testId="project-path" value={path} placeholder="Or enter an absolute folder path" onChange={(event) => setPath(event.value ?? '')}
          style={{ height: 34, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#383838', backgroundColor: '#191919', color: '#dddddd', fontSize: 12 }} />
        {error && <text testId="project-error" style={{ fontSize: 12, color: '#F87171' }}>{error}</text>}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
          {button('project-open-path', 'Open folder', () => void choose(path.trim()), !path.trim())}
          {button('project-dialog-cancel', 'Cancel', onClose)}
        </div>
        <text style={{ fontSize: 13, color: '#aaaaaa' }}>Recent projects</text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflow: 'scroll', flexShrink: 0 }}>
          {engine.snapshot.projects.map((item) => <Button key={item.id} testId={`project-recent-${item.id}`} disabled={busy} onClick={() => {
            if (item.status === 'ready') void choose(item.cwd)
            else { engine.selectSession(item.sessionID); onClose() }
          }} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 10, borderRadius: 6, backgroundColor: '#292929', flexShrink: 0 }}>
            <text style={{ fontSize: 13, color: '#dddddd', whiteSpace: 'nowrap' }}>{`${item.name}${item.status === 'ready' ? '' : ` · ${item.status}`}`}</text>
            <text style={{ fontSize: 11, color: '#999999' }}>{item.cwd}</text>
          </Button>)}
        </div>
      </div>
    </DialogPortal></Dialog>
  </>
}
