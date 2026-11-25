import type { Snapshot } from './reducer'

export type EngineTurn =
  | { kind: 'boundary'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'markdown'; source: string }
  | { kind: 'code'; language: string; source: string }

/** The engine's ordered facts, with only the active conversation visible. */
export function engineTranscript(snapshot: Snapshot): EngineTurn[] {
  const active = snapshot.activeMessageIDs ? new Set(snapshot.activeMessageIDs) : null
  return snapshot.transcript.filter((row) => !row.messageID || !active || active.has(row.messageID)).map((row) => {
    if (row.kind === 'user') return { kind: 'user', text: row.text }
    if (row.kind === 'boundary') return { kind: 'boundary', text: row.text }
    if (row.kind === 'code') return { kind: 'code', language: 'text', source: row.text }
    return { kind: 'markdown', source: row.kind === 'reasoning' ? `Reasoning summary\n\n${row.text}` : row.text }
  })
}
