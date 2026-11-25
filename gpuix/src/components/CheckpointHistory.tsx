import React, { useState } from 'react'
import { Button } from '@gpuix/react'
import type { Checkpoint, Message, Rewind } from '../../engine/src/protocol'

export function CheckpointHistory({ checkpoints, rewinds, messages, activeMessageIDs, checkpointError, onRestore }: {
  checkpoints: Checkpoint[]; rewinds: Rewind[]; messages: Message[]; activeMessageIDs: string[] | null
  checkpointError: string | null; onRestore: (id: string, key: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const pending = rewinds.find((rewind) => rewind.state === 'pending')
  const active = new Set(activeMessageIDs ?? messages.map((message) => message.id))
  const archived = messages.filter((message) => !active.has(message.id))
  const restore = async (id: string, key = `rewind_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`) => {
    setSending(true); setError('')
    try { await onRestore(id, key) } catch (error) { setError(error instanceof Error ? error.message : 'the rewind could not finish') }
    finally { setSending(false) }
  }
  if (!checkpoints.length && !checkpointError && !pending) return null
  return (
    <div testId="checkpoint-history" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, padding: 10, gap: 6, borderTopWidth: 1, borderColor: '#ffffff12' }}>
      <Button testId="checkpoint-toggle" onClick={() => setOpen(!open)} style={{ alignSelf: 'flex-start', padding: 4, cursor: 'pointer' }}>
        <text style={{ fontSize: 11, color: '#a3a3a3', whiteSpace: 'nowrap' }}>{`${open ? 'Hide' : 'Show'} checkpoints · ${checkpoints.filter((checkpoint) => checkpoint.kind === 'prompt').length}`}</text>
      </Button>
      {checkpointError && <text style={{ fontSize: 11, color: '#f87171' }}>{`Prompt waiting for checkpoint: ${checkpointError}`}</text>}
      {pending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <text style={{ fontSize: 11, color: '#fbbf24' }}>{`Workspace paused: ${pending.error ?? 'rewind in progress'}`}</text>
          <Button testId="rewind-retry" disabled={sending} onClick={() => void restore(pending.checkpointID, pending.key)} style={{ padding: 6, cursor: 'pointer', alignSelf: 'flex-start' }}>
            <text style={{ fontSize: 11, color: '#dddddd' }}>{'Retry rewind'}</text>
          </Button>
        </div>
      )}
      {open && (
        <div testId="checkpoint-list" style={{ height: 200, overflow: 'scroll', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <text style={{ fontSize: 11, color: '#a3a3a3' }}>{'Restore workspace files and conversation together. Current work is saved first.'}</text>
          {[...checkpoints].reverse().map((checkpoint) => (
            <Button key={checkpoint.id} testId={`checkpoint-restore-${checkpoint.id}`} disabled={sending || !!pending}
              onClick={() => void restore(checkpoint.id)} style={{ padding: 8, borderRadius: 6, backgroundColor: '#292929', cursor: 'pointer', flexShrink: 0 }}>
              <text style={{ fontSize: 11, color: '#dddddd' }}>{`${checkpoint.kind === 'prompt' ? 'Restore before' : 'Restore saved state'}: ${checkpoint.label}`}</text>
            </Button>
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <Button testId="rewind-history-toggle" onClick={() => setHistory(!history)} style={{ alignSelf: 'flex-start', padding: 4, cursor: 'pointer' }}>
          <text style={{ fontSize: 11, color: '#a3a3a3', whiteSpace: 'nowrap' }}>{`${history ? 'Hide' : 'Show'} earlier history · ${archived.length} messages`}</text>
        </Button>
      )}
      {history && archived.length > 0 && (
        <div testId="rewind-archived-history" style={{ height: 180, overflow: 'scroll', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {archived.map((message) => <text key={message.id} style={{ fontSize: 11, color: '#a3a3a3' }}>{`${message.role}: ${message.text || JSON.stringify(message.toolCalls ?? [])}`}</text>)}
        </div>
      )}
      {error && <text style={{ fontSize: 11, color: '#f87171' }}>{error}</text>}
    </div>
  )
}
