import React from 'react'
import { Button } from '@gpuix/react'
import type { Snapshot } from '../engine/reducer'
import type { DeliveryMode } from '../../engine/src/protocol'
import { cockpit, usage } from '../engine/cockpit'

const color = '#D4D4D4'
const secondary = '#999999'
export function EngineUsage({ snapshot }: { snapshot: Snapshot }) {
  const rows = usage(snapshot)
  const calls = rows.reduce((n, r) => n + r.calls, 0)
  const reported = rows.reduce((n, r) => n + r.reported, 0)
  return <div testId="engine-usage" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 12 }}>
    <text style={{ fontSize: 22, fontWeight: 600, color }}>Usage</text>
    <text style={{ fontSize: 13, color: secondary }}>{`Session ${snapshot.sessionID ?? 'unavailable'} · includes archived turns and retries`}</text>
    <text style={{ fontSize: 14, color }}>{`${calls} model attempts · ${snapshot.runs.length} commands · ${snapshot.toolCalls.length} tools`}</text>
    <text style={{ fontSize: 13, color: secondary }}>{`Provider token counts reported for ${reported} of ${calls} attempts. Cost: not reported.`}</text>
    {rows.length === 0 && <text style={{ fontSize: 13, color: secondary }}>No runs recorded.</text>}
    {rows.map((row) => <div key={row.model} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 14, borderRadius: 8, backgroundColor: '#202020' }}>
      <text style={{ fontSize: 14, color }}>{row.model}</text>
      <text style={{ fontSize: 13, color: secondary }}>{`${row.calls} attempts · ${row.input.toLocaleString('en-US')} reported input tokens · ${row.output.toLocaleString('en-US')} reported output tokens`}</text>
    </div>)}
  </div>
}

export function ComposerDelivery({ snapshot, mode, onMode }: { snapshot: Snapshot; mode: DeliveryMode; onMode: (mode: DeliveryMode) => void }) {
  const view = cockpit(snapshot)
  const cli = snapshot.parts.filter((part) => part.stepID === view.latest?.id && part.kind === 'cli').at(-1)
  return <div testId="composer-delivery" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Button testId="composer-delivery-mode" disabled={!view.busy} onClick={() => onMode(mode === 'queue' ? 'steer' : 'queue')} style={{ padding: 5, borderRadius: 5, cursor: view.busy ? 'pointer' : undefined, hover: view.busy ? { backgroundColor: '#333333' } : undefined }}>
      <text style={{ fontSize: 12, color, whiteSpace: 'nowrap' }}>{snapshot.status !== 'ready' || !snapshot.sessionID ? 'Connecting' : !view.busy ? 'Send' : mode === 'steer' ? 'Steer' : 'Queue'}</text>
    </Button>
    {view.busy && <text style={{ fontSize: 11, color: secondary }}>{`${mode === 'steer' ? 'Next safe boundary' : 'When idle'} · ${view.pending} pending`}</text>}
    {view.queued > 0 && <text testId="execution-queue" style={{ fontSize: 11, color: secondary, whiteSpace: 'nowrap' }}>{`${view.phase} · ${view.queued} queued`}</text>}
    {cli?.kind === 'cli' && <text testId="cli-response-mode" style={{ fontSize: 11, color: secondary, whiteSpace: 'nowrap' }}>{`${({ agy: 'Agy', cursor: 'Cursor', pi: 'Pi', grok: 'Grok' })[cli.adapter]} · response only`}</text>}
  </div>
}
