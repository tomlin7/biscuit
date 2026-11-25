import type { Snapshot } from './reducer'

export function cockpit(snapshot: Snapshot) {
  const active = snapshot.activeMessageIDs ? new Set(snapshot.activeMessageIDs) : null
  const messages = snapshot.messages.filter((m) => !active || active.has(m.id))
  const steps = snapshot.steps.filter((s) => !s.messageID || !active || active.has(s.messageID))
  const latest = steps.at(-1)
  const tools = snapshot.toolCalls.filter((c) => !c.messageID || !active || active.has(c.messageID))
  const waiting = tools.some((c) => c.status === 'waiting')
  const running = steps.some((s) => s.status === 'running') || tools.some((c) => c.status === 'running' || c.status === 'queued') || snapshot.runs.some((r) => r.status === 'running')
  const busy = waiting || running || snapshot.inbox.length > 0
  const command = snapshot.runs.at(-1)
  const queued = snapshot.executions.filter((item) => item.state === 'queued')
  const executing = snapshot.executions.some((item) => item.state === 'running')
  const queueReason = queued.some((item) => item.reason === 'execution_low_memory') ? 'Waiting for free RAM' : 'Waiting for capacity'
  const phase = !snapshot.sessionID ? 'Connecting' : waiting ? 'Awaiting permission' : queued.length && !executing ? queueReason : running ? 'Running' : snapshot.inbox.length ? 'Input pending' : latest ? latest.status === 'succeeded' ? 'Completed' : latest.status : command ? command.status : 'No run'
  const agents = [...new Set(steps.filter((s) => s.messageID === latest?.messageID).map((s) => `${s.provider} / ${s.model}`))]
  return { busy, phase, queued: queued.length, agents, turns: messages.filter((m) => m.role === 'user').length, calls: steps.length, pending: snapshot.inbox.length, latest }
}

/** Counters are cumulative per provider attempt, including archived turns. */
export function usage(snapshot: Snapshot) {
  const attempts = new Map<string, { input?: number; output?: number; model: string }>()
  for (const part of snapshot.parts) {
    if (part.kind !== 'usage') continue
    const step = snapshot.steps.find((s) => s.id === part.stepID)
    if (!step) continue
    const key = `${part.stepID}:${part.attempt ?? 1}`
    const previous = attempts.get(key)
    attempts.set(key, { model: step.model, input: part.inputTokens ?? previous?.input, output: part.outputTokens ?? previous?.output })
  }
  const models = new Map<string, { model: string; calls: number; input: number; output: number; reported: number }>()
  for (const step of snapshot.steps) {
    const row = models.get(step.model) ?? { model: step.model, calls: 0, input: 0, output: 0, reported: 0 }
    row.calls += step.attempt
    models.set(step.model, row)
  }
  for (const attempt of attempts.values()) {
    const row = models.get(attempt.model)!
    row.input += attempt.input ?? 0
    row.output += attempt.output ?? 0
    if (attempt.input !== undefined && attempt.output !== undefined) row.reported++
  }
  for (const review of snapshot.accessReviews) {
    const row = models.get(review.model) ?? { model: review.model, calls: 0, input: 0, output: 0, reported: 0 }
    row.calls++
    row.input += review.usage?.inputTokens ?? 0; row.output += review.usage?.outputTokens ?? 0
    if (review.usage?.inputTokens !== undefined && review.usage?.outputTokens !== undefined) row.reported++
    models.set(review.model, row)
  }
  return [...models.values()]
}
