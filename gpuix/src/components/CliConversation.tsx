import React, { useRef, useState } from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { Snapshot } from '../engine/reducer'

export function cliNeedsFresh(snapshot: Snapshot, model: string | null) {
  const binding = snapshot.cliConversation
  if (!binding) return false
  const step = snapshot.steps.find((item) => item.id === binding.stepID)
  return binding.status === 'blocked' || binding.model !== model || binding.status === 'running' && !!step && step.status !== 'running' || !!(step?.messageID && snapshot.activeMessageIDs && !snapshot.activeMessageIDs.includes(step.messageID))
}

export function CliConversationStatus({ engine, model }: { engine: EngineHandle; model: string | null }) {
  const binding = engine.snapshot.cliConversation
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef(false), recovery = useRef({ id: '', key: '' })
  if (!binding) return null
  const needsFresh = cliNeedsFresh(engine.snapshot, model)
  const running = engine.snapshot.steps.some((item) => item.status === 'running') || engine.snapshot.toolCalls.some((item) => item.status === 'running')
  const name = binding.adapter === 'cursor' ? 'Cursor Agent' : binding.adapter === 'agy' ? 'Agy' : binding.adapter === 'grok' ? 'Grok' : 'Pi'
  const replace = async () => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    if (recovery.current.id !== binding.id) recovery.current = { id: binding.id, key: crypto.randomUUID() }
    try { await engine.freshCliConversation(binding, recovery.current.key) }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not start a fresh CLI conversation') }
    finally { pending.current = false; setBusy(false) }
  }
  return <div testId="cli-conversation" style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28, paddingRight: 28, paddingBottom: 8, flexShrink: 0 }}>
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <text testId="cli-conversation-status" style={{ fontSize: 12, color: needsFresh ? '#d0aa79' : '#999999', flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0 }}>{`${name} · ${needsFresh ? 'fresh conversation required' : running ? 'native conversation running' : 'native conversation ready'}`}</text>
      <Button testId="cli-fresh" disabled={busy || running || engine.snapshot.status !== 'ready'} onClick={() => void replace()} style={{ padding: 6, borderRadius: 5, flexShrink: 0, pointerEvents: 'auto', hover: { backgroundColor: '#303030' } }}>
        <text style={{ fontSize: 12, color: '#bbbbbb', whiteSpace: 'nowrap' }}>{busy ? 'Starting…' : 'Start fresh CLI conversation'}</text>
      </Button>
    </div>
    {needsFresh && <text testId="cli-conversation-reason" style={{ fontSize: 12, color: '#999999' }}>{`${binding.reason ?? 'The selected agent/model or active transcript changed.'} A fresh session uses saved Hiroshi history and allows queued work to continue.`}</text>}
    {error && <text testId="cli-conversation-error" style={{ fontSize: 12, color: '#F87171' }}>{error}</text>}
  </div>
}
