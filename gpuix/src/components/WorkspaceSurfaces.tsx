import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogPortal, DialogPopup } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { BrowserPage, WorkspaceDirectory, WorkspaceFile, WorkspaceReview } from '../../engine/src/protocol'

const ink = '#dddddd', muted = '#969696'
const button = { padding: 7, borderRadius: 5, backgroundColor: '#2b2b2b', cursor: 'pointer' as const, flexShrink: 0 }
const input = { height: 30, fontSize: 12, color: ink, backgroundColor: '#191919', borderWidth: 1, borderColor: '#383838', borderRadius: 5, padding: 6, flexGrow: 1, minWidth: 0 }
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error)
function TextButton({ id, text, onClick, disabled = false }: { id: string; text: string; onClick: () => void; disabled?: boolean }) {
  return <Button testId={id} onClick={onClick} disabled={disabled} style={button}><text style={{ fontSize: 11, color: disabled ? '#626262' : ink, whiteSpace: 'nowrap' }}>{text}</text></Button>
}
function signature(engine: EngineHandle): string {
  return [engine.snapshot.status, ...engine.snapshot.runs.map((run) => run.id + run.status), ...engine.snapshot.toolCalls.map((call) => call.id + call.status), ...engine.snapshot.rewinds.map((rewind) => rewind.id + rewind.state)].join('|')
}
function useReview(engine: EngineHandle, active: boolean, base?: string) {
  const [review, setReview] = useState<WorkspaceReview | null>(null)
  const [error, setError] = useState(''), [tick, setTick] = useState(0)
  const changes = signature(engine)
  useEffect(() => {
    if (!active || engine.snapshot.status !== 'ready') return
    let live = true, busy = false
    const load = async () => {
      if (busy) return
      busy = true
      try { const next = await engine.workspaceReview(base); if (live) { setReview(next); setError('') } }
      catch (error) { if (live) setError(errorText(error)) }
      finally { busy = false }
    }
    void load(); const timer = setInterval(() => void load(), 3000)
    return () => { live = false; clearInterval(timer) }
  }, [active, changes, base, tick, engine.workspaceReview])
  return { review, error, refresh: () => setTick((value) => value + 1) }
}

export function FilesSurface({ engine, active, initialFile, initialLine }: { engine: EngineHandle; active: boolean; initialFile?: string; initialLine?: number }) {
  const [directory, setDirectory] = useState(initialFile?.split('/').slice(0, -1).join('/') ?? ''), [selected, setSelected] = useState(initialFile ?? '')
  const [listing, setListing] = useState<WorkspaceDirectory | null>(null), [file, setFile] = useState<WorkspaceFile | null>(null)
  const [review, setReview] = useState<WorkspaceReview | null>(null), [error, setError] = useState(''), [tick, setTick] = useState(0)
  const changes = signature(engine)
  useEffect(() => {
    if (!active || engine.snapshot.status !== 'ready') return
    let live = true, busy = false
    const load = async () => {
      if (busy) return
      busy = true
      try {
        const [listing, review, result] = await Promise.all([engine.workspaceList(directory), engine.workspaceReview().catch(() => null), selected ? engine.workspaceFile(selected).then((file) => ({ file, error: '' })).catch((error) => ({ file: null, error: errorText(error) })) : Promise.resolve({ file: null, error: '' })])
        if (live) { setListing(listing); setReview(review); setFile(result.file); setError(result.error) }
      } catch (error) { if (live) { setError(errorText(error)); setFile(null) } }
      finally { busy = false }
    }
    void load(); const timer = setInterval(() => void load(), 3000)
    return () => { live = false; clearInterval(timer) }
  }, [active, changes, directory, selected, tick, engine.workspaceList, engine.workspaceFile, engine.workspaceReview])
  if (!active) return null
  return <div testId="workspace-files" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, padding: 12, gap: 8 }}>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <TextButton id="files-parent" text="Up" disabled={!directory} onClick={() => { setDirectory(directory.split('/').slice(0, -1).join('/')); setSelected(''); setFile(null) }} />
      <text style={{ fontSize: 12, color: muted, flexGrow: 1 }}>{directory || 'Workspace'}</text>
      <TextButton id="files-refresh" text="Refresh" onClick={() => setTick((value) => value + 1)} />
    </div>
    {engine.snapshot.status !== 'ready' && <text style={{ fontSize: 12, color: muted }}>{'Connect the engine to browse workspace files.'}</text>}
    {error && <text style={{ fontSize: 12, color: '#f87171' }}>{error}</text>}
    <div style={{ maxHeight: selected ? 200 : 600, flexGrow: selected ? 0 : 1, overflow: 'scroll', display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 3 }}>
      {listing?.entries.map((entry) => {
        const changed = review?.files.find((file) => file.path === entry.path || (entry.kind === 'directory' && file.path.startsWith(entry.path + '/')))
        return <Button key={entry.path} testId={`files-open-${entry.path}`} onClick={() => {
          if (entry.kind === 'directory') { setDirectory(entry.path); setSelected(''); setFile(null) }
          else { setSelected(entry.path); setFile(null) }
        }} style={{ ...button, backgroundColor: selected === entry.path ? '#38312d' : '#222222', display: 'flex', flexDirection: 'row', gap: 6 }}>
          <text style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>{entry.kind === 'directory' ? 'Folder' : entry.kind === 'symlink' ? 'Link' : 'File'}</text>
          <text style={{ fontSize: 12, color: ink, flexGrow: 1 }}>{entry.name}</text>
          {changed && <text testId={`files-changed-${entry.path}`} style={{ fontSize: 11, color: '#e7aa81', whiteSpace: 'nowrap' }}>{changed.status}</text>}
        </Button>
      })}
      {listing && !listing.entries.length && <text style={{ fontSize: 12, color: muted }}>{'This directory is empty.'}</text>}
      {listing?.truncated && <text style={{ fontSize: 11, color: muted }}>{'Directory limited to 500 entries.'}</text>}
    </div>
    {selected && <text style={{ fontSize: 11, color: muted }}>{selected}</text>}
    {file && selected === initialFile && initialLine && <text testId="file-line-target" style={{ fontSize: 12, color: '#e7aa81' }}>{`${initialLine}: ${file.text.split(/\r?\n/)[initialLine - 1] ?? 'Line unavailable in this preview'}`}</text>}
    {file && <div testId="workspace-file-content" style={{ flexGrow: 1, minHeight: 100, overflow: 'scroll' }}>
      {file.binary ? <text style={{ fontSize: 12, color: muted }}>{`Binary file · ${file.bytes} bytes`}</text> : <code code={file.text} path={file.path} showLineNumbers style={{ fontSize: 12, color: ink }} />}
      {file.truncated && <text style={{ fontSize: 11, color: '#e7aa81' }}>{'File preview truncated at 256 KiB.'}</text>}
    </div>}
  </div>
}

export function ReviewSurface({ engine, active }: { engine: EngineHandle; active: boolean }) {
  const [base, setBase] = useState(''), [applied, setApplied] = useState('')
  const { review, error, refresh } = useReview(engine, active, applied || undefined)
  if (!active) return null
  return <div testId="workspace-review" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, padding: 12, gap: 8 }}>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
      <input testId="review-base" value={base} placeholder="Automatic branch base" style={input} onChange={(event) => setBase(event.value ?? '')} />
      <TextButton id="review-refresh" text="Review" onClick={() => { setApplied(base.trim()); refresh() }} />
    </div>
    {review?.available && <text style={{ fontSize: 11, color: muted }}>{`${review.branch} against ${review.base} · ${review.files.length} changed ${review.files.length === 1 ? 'file' : 'files'}`}</text>}
    {(error || review?.reason || engine.snapshot.status !== 'ready') && <text style={{ fontSize: 12, color: '#e7aa81' }}>{error || review?.reason || 'Connect the engine to review workspace changes.'}</text>}
    <div style={{ maxHeight: 130, overflow: 'scroll', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {review?.files.map((file) => <text key={file.path} testId={`review-file-${file.path}`} style={{ fontSize: 11, color: ink }}>{`${file.status}  ${file.previousPath ? file.previousPath + ' → ' : ''}${file.path}${file.staged || file.unstaged ? ' · pending' : ' · committed'}`}</text>)}
    </div>
    {review?.available && !review.files.length && <text style={{ fontSize: 12, color: muted }}>{'No changes against this base.'}</text>}
    {review?.truncated && <text style={{ fontSize: 11, color: '#e7aa81' }}>{'Diff preview limited. Use Git for the complete review.'}</text>}
    {review?.patch && <diff testId="workspace-diff" patch={review.patch} wordDiff scroll maxLines={2000} style={{ flexGrow: 1, minHeight: 100 }} />}
  </div>
}

export function BrowserSurface({ engine, active }: { engine: EngineHandle; active: boolean }) {
  const [address, setAddress] = useState('http://localhost:3000'), [history, setHistory] = useState<BrowserPage[]>([]), [index, setIndex] = useState(-1)
  const [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const page = history[index]
  const navigate = async (url: string, reload = false) => {
    setLoading(true); setError('')
    try {
      const next = await engine.browse(url)
      if (reload) setHistory((current) => current.map((item, at) => at === index ? next : item))
      else { const nextHistory = [...history.slice(0, index + 1), next].slice(-50); setHistory(nextHistory); setIndex(nextHistory.length - 1) }
      setAddress(next.url)
    } catch (error) { setError(errorText(error)) }
    finally { setLoading(false) }
  }
  const move = (next: number) => { setIndex(next); setAddress(history[next]!.url); setError('') }
  if (!active) return null
  return <div testId="workspace-browser" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, padding: 12, gap: 8 }}>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 5 }}>
      <TextButton id="browser-back" text="Back" disabled={index <= 0 || loading} onClick={() => move(index - 1)} />
      <TextButton id="browser-forward" text="Next" disabled={index >= history.length - 1 || loading} onClick={() => move(index + 1)} />
      <TextButton id="browser-reload" text="Reload" disabled={!page || loading} onClick={() => void navigate(page!.url, true)} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', gap: 5 }}>
      <input testId="browser-address" value={address} style={input} onChange={(event) => setAddress(event.value ?? '')} onSubmit={() => { if (!loading) void navigate(address) }} />
      <TextButton id="browser-go" text={loading ? 'Loading' : 'Open'} disabled={loading || engine.snapshot.status !== 'ready'} onClick={() => void navigate(address)} />
    </div>
    <text style={{ fontSize: 10, color: muted }}>{'Page reader · JavaScript, forms and sign-in are unavailable.'}</text>
    {error && <text style={{ fontSize: 12, color: '#f87171' }}>{error}</text>}
    <div testId="browser-page" style={{ display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1, overflow: 'scroll', minHeight: 0 }}>
      {!page && <text style={{ fontSize: 12, color: muted }}>{'Open a local app or an HTTP/HTTPS page to read it here.'}</text>}
      {page && <>
        <text style={{ fontSize: 16, fontWeight: 600, color: ink }}>{page.title}</text>
        {page.scripted && <text style={{ fontSize: 11, color: '#e7aa81' }}>{'This page contains scripts. Interactive content may require a full browser.'}</text>}
        <text style={{ fontSize: 12, color: ink }}>{page.text || 'The page has no readable text.'}</text>
        {page.truncated && <text style={{ fontSize: 11, color: '#e7aa81' }}>{'Page preview truncated at 512 KiB.'}</text>}
        {page.links.map((link, at) => <TextButton key={`${link.url}-${at}`} id={`browser-link-${at}`} text={link.label} disabled={loading} onClick={() => void navigate(link.url)} />)}
      </>}
    </div>
  </div>
}

export function WorkspaceCommitModal({ open, onClose, engine, onTerminal }: { open: boolean; onClose: () => void; engine: EngineHandle; onTerminal: () => void }) {
  const { review, error: reviewError, refresh } = useReview(engine, open)
  const [message, setMessage] = useState(''), [includeUnstaged, setInclude] = useState(true), [sending, setSending] = useState(false)
  const [error, setError] = useState(''), [runID, setRunID] = useState<string | null>(null)
  useEffect(() => { if (open) { setRunID(null); setError(''); refresh() } }, [open])
  const run = engine.snapshot.runs.find((run) => run.id === runID)
  const output = runID ? engine.snapshot.output[runID]?.text : ''
  const submit = async (push: boolean, pushOnly = false) => {
    if (!review) return
    setSending(true); setError('')
    try { setRunID(await engine.workspaceCommit({ revision: review.revision, message, includeUnstaged, push, pushOnly })) }
    catch (error) { setError(errorText(error)); refresh() }
    finally { setSending(false) }
  }
  if (!open) return null
  const disabled = sending || run?.status === 'running' || !review?.available || review.truncated || !!reviewError || engine.snapshot.status !== 'ready'
  const selected = review?.files.filter((file) => includeUnstaged ? file.staged || file.unstaged : file.staged) ?? []
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogPortal {...({ position: { x: 0, y: 0 } } as any)} onMouseDown={onClose}
    style={{ width: 1180, height: 820, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000088' }}>
    <DialogPopup testId="commit-push-popup" onMouseDown={(event: any) => event.stopPropagation?.()} style={{ width: 520, maxWidth: '92%', padding: 16, gap: 10, borderRadius: 12, backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <text style={{ fontSize: 14, color: ink, flexGrow: 1 }}>{review?.branch || 'Workspace changes'}</text>
        <TextButton id="commit-modal-close" text="Close" onClick={onClose} />
      </div>
      {engine.snapshot.status !== 'ready' && <text testId="daemon-disconnected" style={{ fontSize: 12, color: '#e7aa81' }}>{'Hiroshi daemon is disconnected'}</text>}
      {(error || reviewError || review?.reason) && <text style={{ fontSize: 12, color: '#f87171' }}>{error || reviewError || review?.reason}</text>}
      <textarea testId="commit-message" value={message} placeholder="Commit message..." onChange={(event) => setMessage(event.value ?? '')} style={{ ...input, minHeight: 60, flexGrow: 0 }} />
      <TextButton id="commit-include-unstaged" text={`${includeUnstaged ? 'Including' : 'Excluding'} unstaged changes · ${selected.length} files selected`} disabled={sending || run?.status === 'running'} onClick={() => setInclude(!includeUnstaged)} />
      <div testId="commit-file-list" style={{ height: 100, overflow: 'scroll', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {review?.files.map((file) => <text key={file.path} style={{ fontSize: 11, color: ink }}>{`${file.status}  ${file.path} · ${file.staged ? 'staged' : file.unstaged ? 'working tree' : 'already committed'}`}</text>)}
      </div>
      {(includeUnstaged ? review?.workingPatch : review?.stagedPatch) && <diff patch={includeUnstaged ? review!.workingPatch : review!.stagedPatch} scroll maxLines={500} style={{ height: 180 }} />}
      {run && <text testId="commit-run-status" style={{ fontSize: 12, color: run.status === 'failed' ? '#f87171' : ink }}>{`${run.command} · ${run.status}${run.exitCode !== null ? ' · exit ' + run.exitCode : ''}`}</text>}
      {output && <div style={{ maxHeight: 80, overflow: 'scroll' }}><text style={{ fontSize: 11, color: muted }}>{output}</text></div>}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
        <TextButton id="commit-submit" text="Commit" disabled={disabled || !message.trim() || !selected.length} onClick={() => void submit(false)} />
        <TextButton id="commit-push-submit" text="Commit and push" disabled={disabled || !message.trim() || !selected.length} onClick={() => void submit(true)} />
        <TextButton id="push-submit" text="Push" disabled={disabled} onClick={() => void submit(true, true)} />
        {runID && <TextButton id="commit-open-terminal" text="Terminal" onClick={onTerminal} />}
      </div>
    </DialogPopup>
  </DialogPortal></Dialog>
}
