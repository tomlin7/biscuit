import React from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'

export function DraftRecovery({ engine }: { engine: EngineHandle }) {
  const { draft } = engine
  const button = { padding: 5, borderRadius: 5, hover: { backgroundColor: '#333333' } }
  if (!draft.text && !draft.pending && !draft.error) return null
  return <div testId="draft-recovery" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 28, paddingRight: 28, paddingBottom: 6 }}>
    {draft.error && <text testId="draft-error" style={{ fontSize: 12, color: '#F87171' }}>{draft.error}</text>}
    {draft.pending && <>
      <text testId="draft-send-status" style={{ fontSize: 12, color: '#b3b3b3' }}>{draft.busy ? 'Waiting for the engine to acknowledge this send…' : draft.pending.status === 'rejected' ? 'Send rejected. Your text is saved.' : 'Send not confirmed. Retry checks the original submission without duplicating it.'}</text>
      <text testId="draft-pending-text" style={{ fontSize: 12, color: '#999999', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{`Saved send: ${draft.pending.text.slice(0, 160)}`}</text>
      {!draft.busy && draft.pending.error && <text style={{ fontSize: 12, color: '#F87171' }}>{draft.pending.error}</text>}
    </>}
    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
      {draft.pending && <Button testId="draft-retry" disabled={draft.busy || draft.unsaved} onClick={engine.retryPrompt} style={button}><text style={{ fontSize: 12, color: '#dddddd' }}>Retry saved send</text></Button>}
      {draft.pending && <Button testId="draft-forget" disabled={draft.busy || draft.unsaved} onClick={engine.forgetPrompt} style={button}><text style={{ fontSize: 12, color: '#999999' }}>Forget saved send; it may already be admitted</text></Button>}
      {!draft.pending && draft.text && <Button testId="draft-discard" disabled={draft.busy} onClick={engine.discardDraft} style={button}><text style={{ fontSize: 12, color: '#999999' }}>Discard draft</text></Button>}
      {draft.unsaved && <Button testId="draft-reload" disabled={draft.busy} onClick={engine.reloadDraft} style={button}><text style={{ fontSize: 12, color: '#dddddd' }}>Replace with saved draft</text></Button>}
    </div>
  </div>
}
