import type { EngineEvent, Step, TranscriptEntry } from './protocol'

/** The same ordered projection is used for a saved snapshot and a live feed.
 * Rows keep their first published position; streaming deltas only extend the
 * current contiguous row. Provider-private state never enters the transcript. */
export function projectTranscript(rows: TranscriptEntry[], event: EngineEvent, steps: Step[]): TranscriptEntry[] {
  const data = event.data
  const step = 'step' in data ? data.step : 'stepID' in data ? steps.find((s) => s.id === data.stepID) : undefined
  const root = step?.messageID ?? undefined
  const add = (kind: TranscriptEntry['kind'], text: string, messageID = root, stream?: string): TranscriptEntry[] => {
    if (!text) return rows
    const last = rows.at(-1)
    if (stream && last?.stream === stream) return [...rows.slice(0, -1), { ...last, text: last.text + text }]
    return [...rows, { seq: event.seq, kind, text, ...(messageID ? { messageID } : {}), ...(stream ? { stream } : {}) }]
  }
  switch (event.type) {
    case 'execution.updated': {
      const execution = event.data.execution
      // Endings are already described by the owning step, tool or command.
      if (execution.kind === 'maintenance' || !['queued', 'running'].includes(execution.state)) return rows
      return add('boundary', `${execution.kind} ${execution.state}${execution.reason ? ` · ${execution.reason.replaceAll('_', ' ')}` : ''}`, execution.messageID)
    }
    case 'prompt.delivered': return add('user', event.data.message.text, event.data.message.id)
    case 'step.started': return add('boundary', `Model call · ${event.data.step.model} · attempt ${event.data.step.attempt}`)
    case 'step.resumed': return add('boundary', `Resumed · ${event.data.reason}`)
    case 'step.retry': return add('boundary', `Retry · ${event.data.error.code}: ${event.data.error.message} · waiting ${event.data.delay} ms`)
    case 'step.output': return add('markdown', event.data.data, root, `text:${event.data.stepID}:${step?.attempt}`)
    case 'step.part': {
      const part = event.data.part
      const owner = steps.find((s) => s.id === part.stepID)
      if (part.kind === 'reasoning') return add('reasoning', part.text, owner?.messageID ?? undefined, `reasoning:${part.stepID}:${part.attempt}`)
      if (part.kind === 'tool') {
        if (part.phase === 'start') return add('code', `Tool requested: ${part.name ?? part.callID}\nCall: ${part.callID}\n`, owner?.messageID ?? undefined, `tool:${part.stepID}:${part.callID}`)
        if (part.phase === 'delta') return add('code', part.text, owner?.messageID ?? undefined, `tool:${part.stepID}:${part.callID}`)
      }
      return rows
    }
    case 'step.completed': {
      // Text was published as deltas. The committed message is not a second answer.
      return add('boundary', `Model call completed · ${event.data.step.model}`)
    }
    case 'step.failed': case 'step.cancelled': return add('boundary', `${event.data.step.status} · ${event.data.step.error ? `${event.data.step.error.code}: ${event.data.step.error.message}` : event.data.step.model}`)
    case 'permission.requested': return add('boundary', `Awaiting permission · ${event.data.call.tool}`, event.data.call.messageID, `permission:${event.data.permission.id}`)
    case 'permission.answered': return add('boundary', `Permission ${event.data.permission.decision} · ${event.data.permission.tool}`, rows.find((row) => row.stream === `permission:${event.data.permission.id}`)?.messageID)
    case 'tool.updated': {
      const { call, message } = event.data
      if (message) return add('code', `${call.tool} · ${call.status}\nCall: ${call.id}\n${message.text}`, call.messageID)
      return add('boundary', `${call.tool} · ${call.status}${call.error ? ` · ${call.error}` : ''}`, call.messageID)
    }
    case 'context.compacted': return add('boundary', `Context compacted · ${event.data.compaction.reason}`, steps.find((s) => s.id === event.data.compaction.stepID)?.messageID ?? undefined)
    case 'rewind.completed': return add('boundary', event.data.message.text, event.data.message.id)
    case 'run.started': return add('boundary', `Command requested · ${event.data.run.command}`, event.data.toolCall?.messageID)
    case 'run.ended': return add('boundary', `Command ${event.data.run.status} · exit ${event.data.run.exitCode ?? 'unknown'}`, event.data.toolCall?.messageID)
    default: return rows
  }
}

export function replayTranscript(events: EngineEvent[]): TranscriptEntry[] {
  let rows: TranscriptEntry[] = []
  const steps = new Map<string, Step>()
  for (const event of events) {
    if ('step' in event.data) steps.set(event.data.step.id, event.data.step)
    rows = projectTranscript(rows, event, [...steps.values()])
  }
  return rows
}
