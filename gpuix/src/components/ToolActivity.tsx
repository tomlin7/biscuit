import React, { useState } from 'react'
import { Button } from '@gpuix/react'
import type { AccessReview, Permission, ToolCall } from '../../engine/src/protocol'

interface Props {
  reviews?: AccessReview[]
  permissions: Permission[]
  calls: ToolCall[]
  onAnswer: (id: string, decision: 'allow' | 'deny', remember: boolean) => Promise<void>
  onOutput: (id: string) => Promise<{ path: string; text: string }>
}

function PermissionCard({ permission, call, review, onAnswer }: { permission: Permission; call?: ToolCall; review?: AccessReview; onAnswer: Props['onAnswer'] }) {
  const [remember, setRemember] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const answer = async (decision: 'allow' | 'deny') => {
    setSending(true)
    setError('')
    try { await onAnswer(permission.id, decision, remember) }
    catch (error) { setError(error instanceof Error ? error.message : 'the answer could not be saved') }
    finally { setSending(false) }
  }
  return (
    <div testId={`permission-${permission.id}`} style={{ display: 'flex', flexDirection: 'column', flexShrink: 0,
      padding: 12, gap: 8, borderWidth: 1, borderColor: '#ffffff18', borderRadius: 9, backgroundColor: '#242424' }}>
      <text style={{ fontSize: 13, fontWeight: 600, color: '#eeeeee', whiteSpace: 'nowrap' }}>{`Allow ${permission.tool}?`}</text>
      {call?.definition && <text style={{ fontSize: 12, color: '#a3a3a3' }}>{call.definition.description}</text>}
      {review && <text testId={`review-reason-${permission.toolCallID}`} style={{ fontSize: 12, color: '#bba17e' }}>{review.reason}</text>}
      <text style={{ fontSize: 11, color: '#a3a3a3' }}>{`Workspace: ${permission.cwd}`}</text>
      <div style={{ maxHeight: 100, overflow: 'scroll', flexShrink: 0 }}>
        <text style={{ fontSize: 12, color: '#dddddd' }}>{permission.input}</text>
      </div>
      <Button testId={`permission-remember-${permission.id}`} disabled={sending}
        onClick={() => setRemember(!remember)} style={{ alignSelf: 'flex-start', padding: 6, borderRadius: 5,
          backgroundColor: remember ? '#3b3b3b' : '#292929', cursor: 'pointer' }}>
        <text style={{ fontSize: 11, color: '#bdbdbd' }}>{`${remember ? 'Remembering' : 'Remember'} this exact request for this workspace`}</text>
      </Button>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
        <Button testId={`permission-deny-${permission.id}`} disabled={sending} onClick={() => void answer('deny')}
          style={{ padding: 8, borderRadius: 6, backgroundColor: '#333333', cursor: 'pointer' }}>
          <text style={{ fontSize: 12, color: '#e5e5e5', whiteSpace: 'nowrap' }}>{'Deny'}</text>
        </Button>
        <Button testId={`permission-allow-${permission.id}`} disabled={sending} onClick={() => void answer('allow')}
          style={{ padding: 8, borderRadius: 6, backgroundColor: '#e5e5e5', cursor: 'pointer' }}>
          <text style={{ fontSize: 12, color: '#202020', whiteSpace: 'nowrap' }}>{sending ? 'Saving answer…' : 'Allow'}</text>
        </Button>
      </div>
      {error && <text style={{ fontSize: 11, color: '#f87171' }}>{error}</text>}
    </div>
  )
}

export function ToolActivity({ permissions, calls, reviews = [], onAnswer, onOutput }: Props) {
  const [opened, setOpened] = useState<{ path: string; text: string } | null>(null)
  const [error, setError] = useState('')
  const pending = permissions.filter((p) => p.state === 'pending')
  const outputs = calls.filter((call) => call.truncated && call.outputPath)
  const callsByID = new Map(calls.map((call) => [call.id, call]))
  const reviewsByCall = new Map(reviews.map((review) => [review.toolCallID, review]))
  const reviewing = reviews.filter((review) => review.status === 'running' && callsByID.has(review.toolCallID) && !callsByID.get(review.toolCallID)!.resultMessageID)
  if (!pending.length && !outputs.length && !opened && !reviewing.length) return null
  return (
    <div testId="tool-activity" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, padding: 12,
      maxHeight: 340, overflow: 'scroll', gap: 8 }}>
      {reviewing.map((review) => <text key={review.toolCallID} testId={`review-pending-${review.toolCallID}`} style={{ fontSize: 12, color: '#bba17e' }}>{'AI reviewer is checking a routine file action…'}</text>)}
      {pending.map((permission) => <PermissionCard key={permission.id} permission={permission} review={reviewsByCall.get(permission.toolCallID)}
        call={callsByID.get(permission.toolCallID)} onAnswer={onAnswer} />)}
      {outputs.map((call) => (
        <Button key={call.id} testId={`tool-output-${call.id}`} onClick={() => {
          setError('')
          void onOutput(call.id).then(setOpened).catch((error) => setError(error instanceof Error ? error.message : 'output could not be opened'))
        }} style={{ padding: 8, borderRadius: 6, backgroundColor: '#292929', cursor: 'pointer' }}>
          <text style={{ fontSize: 12, color: '#bdbdbd', whiteSpace: 'nowrap' }}>{`Open full ${call.tool} output`}</text>
        </Button>
      ))}
      {opened && (
        <div testId="tool-output-viewer" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 6 }}>
          <text style={{ fontSize: 11, color: '#a3a3a3' }}>{opened.path}</text>
          <Button testId="tool-output-close" onClick={() => setOpened(null)} style={{ padding: 6, alignSelf: 'flex-start', cursor: 'pointer' }}>
            <text style={{ fontSize: 11, color: '#bdbdbd' }}>{'Close output'}</text>
          </Button>
          <div style={{ height: 200, overflow: 'scroll', flexShrink: 0 }}>
            <text style={{ fontSize: 11, color: '#dddddd' }}>{opened.text}</text>
          </div>
        </div>
      )}
      {error && <text style={{ fontSize: 11, color: '#f87171' }}>{error}</text>}
    </div>
  )
}
