/**
 * Turning the engine's feed into what the cockpit draws.
 *
 * Pure on purpose: the cockpit holds no run state of its own, so the only
 * place a run's state can change is here, from an event the engine published
 * or from a snapshot it returned. That makes the projection testable without
 * a window, and it makes "two windows show the same thing" a consequence of
 * the code instead of a hope.
 */

import type {
  AccessSettings, AccessReview,
  CliConversation,
  Execution,
  TranscriptEntry,
  Checkpoint,
  Rewind,
  Compaction,
  Permission,
  StepContext,
  StepPart,
  ModelInfo,
  ProviderState,
  ProjectInfo,
  EngineEvent,
  Health,
  InboxItem,
  Message,
  Run,
  Session,
  SessionDetail,
  Step,
  ToolCall,
} from '../../engine/src/protocol'
import { projectTranscript } from '../../engine/src/cockpit'

export type EngineStatus =
  | 'off'
  | 'starting'
  | 'ready'
  | 'unreachable'
  | 'mismatch'
  | 'unavailable'
  | 'failed'

export interface OutputState {
  text: string
  truncated: boolean
}

export interface Snapshot {
  configuration?: import('../../engine/src/protocol').ConfigurationReport
  access: AccessSettings
  accessReviews: AccessReview[]
  cliConversation: CliConversation | null
  executions: Execution[]
  transcript: TranscriptEntry[]
  transcriptSeq: number
  status: EngineStatus
  health: Health | null
  error: string | null
  sessions: Session[]
  sessionID: string | null
  messages: Message[]
  models: ModelInfo[]
  defaultModel: string
  providers: ProviderState | null
  projects: ProjectInfo[]
  parts: StepPart[]
  checkpoints: Checkpoint[]
  rewinds: Rewind[]
  activeMessageIDs: string[] | null
  checkpointError: string | null
  permissions: Permission[]
  /** Prompts admitted but not delivered yet, oldest first. */
  inbox: InboxItem[]
  runs: Run[]
  /** Model calls, oldest first. */
  steps: Step[]
  compactions: Compaction[]
  contexts: StepContext[]
  /** Effects recorded before they ran, oldest first. */
  toolCalls: ToolCall[]
  output: Record<string, OutputState>
}

/** In-memory ceiling for one run's output. The durable copy is the source. */
const MEMORY_OUTPUT_LIMIT = 256 * 1024

export function initialSnapshot(): Snapshot {
  return {
    access: { mode: 'ask', revision: 0 }, accessReviews: [],
    cliConversation: null,
    executions: [],
    transcript: [],
    transcriptSeq: 0,
    status: 'off',
    health: null,
    error: null,
    sessions: [],
    sessionID: null,
    messages: [],
    models: [],
    defaultModel: 'local/echo',
    providers: null,
    projects: [],
    parts: [],
    checkpoints: [],
    rewinds: [],
    activeMessageIDs: null,
    checkpointError: null,
    permissions: [],
    inbox: [],
    runs: [],
    steps: [],
    toolCalls: [],
    compactions: [],
    contexts: [],
    output: {},
  }
}

function upsertSession(sessions: Session[], next: Session): Session[] {
  const index = sessions.findIndex((session) => session.id === next.id)
  if (index < 0) return [next, ...sessions]
  const copy = sessions.slice()
  copy[index] = { ...copy[index], ...next }
  return copy
}

function upsertRun(runs: Run[], next: Run): Run[] {
  const index = runs.findIndex((run) => run.id === next.id)
  if (index < 0) return [...runs, next]
  const copy = runs.slice()
  copy[index] = { ...copy[index], ...next }
  return copy
}

function upsertStep(steps: Step[], next: Step): Step[] {
  const index = steps.findIndex((step) => step.id === next.id)
  if (index < 0) return [...steps, next]
  const copy = steps.slice()
  copy[index] = { ...copy[index], ...next }
  return copy
}

function upsertToolCall(calls: ToolCall[], next: ToolCall): ToolCall[] {
  const index = calls.findIndex((call) => call.id === next.id)
  if (index < 0) return [...calls, next]
  const copy = calls.slice()
  copy[index] = { ...copy[index], ...next }
  return copy
}

/** Merge a snapshot from the engine into the view. */
export function hydrate(snapshot: Snapshot, detail: SessionDetail): Snapshot {
  const output: Record<string, OutputState> = {}
  for (const chunk of detail.chunks) {
    const entry = output[chunk.runID] ?? { text: '', truncated: false }
    entry.text = (entry.text + chunk.data).slice(-MEMORY_OUTPUT_LIMIT)
    output[chunk.runID] = entry
  }

  return {
    ...snapshot,
    sessionID: detail.session.id,
    configuration: detail.configuration,
    defaultModel: detail.configuration?.settings.defaultModel ?? snapshot.providers?.defaultModel ?? snapshot.defaultModel,
    access: detail.access ?? { mode: 'ask', revision: 0 }, accessReviews: detail.accessReviews ?? [],
    cliConversation: detail.cliConversation ?? null,
    executions: detail.executions ?? [],
    transcript: detail.transcript ?? [],
    transcriptSeq: detail.seq,
    sessions: upsertSession(snapshot.sessions, detail.session),
    messages: detail.messages,
    inbox: detail.inbox ?? [],
    runs: detail.runs,
    steps: detail.steps ?? [],
    toolCalls: detail.toolCalls ?? [],
    compactions: detail.compactions ?? [],
    contexts: detail.contexts ?? [],
    parts: detail.parts ?? [],
    checkpoints: detail.checkpoints ?? [],
    rewinds: detail.rewinds ?? [],
    activeMessageIDs: detail.activeMessageIDs ?? null,
    checkpointError: detail.checkpointError ?? null,
    permissions: detail.permissions ?? [],
    output,
    error: null,
  }
}

/**
 * A type the switch cannot reach.
 *
 * The reducer has no catch-all on purpose: a new event in the shape module is
 * a compile error here until someone decides what it draws, instead of a
 * silent no-op in the cockpit.
 */
function unreachable(event: never): never {
  throw new Error(`the cockpit does not know this event: ${JSON.stringify(event)}`)
}

/** Apply one durable event. */
export function apply(snapshot: Snapshot, event: EngineEvent): Snapshot {
  if (event.seq <= snapshot.transcriptSeq) return snapshot
  if (event.sessionID !== snapshot.sessionID && event.type !== 'providers.updated' && event.type !== 'session.created' && event.type !== 'session.updated') return snapshot
  let next = reduce(snapshot, event)
  next = { ...next, transcriptSeq: event.seq, transcript: event.sessionID === snapshot.sessionID ? projectTranscript(snapshot.transcript, event, next.steps) : snapshot.transcript }
  if (!snapshot.activeMessageIDs || next.messages === snapshot.messages || event.type === 'rewind.completed') return next
  const old = new Set(snapshot.messages.map((message) => message.id))
  const added = next.messages.filter((message) => !old.has(message.id)).map((message) => message.id)
  return added.length ? { ...next, activeMessageIDs: [...(next.activeMessageIDs ?? []), ...added] } : next
}

function reduce(snapshot: Snapshot, event: EngineEvent): Snapshot {
  switch (event.type) {
    case 'access.updated': return { ...snapshot, access: event.data.access }
    case 'access.reviewed': return { ...snapshot, accessReviews: [...snapshot.accessReviews.filter((review) => review.toolCallID !== event.data.review.toolCallID), event.data.review] }
    case 'cli.updated': return { ...snapshot, cliConversation: event.data.conversation }
    case 'providers.updated':
      if (snapshot.providers && event.data.providers.revision < snapshot.providers.revision) return snapshot
      return { ...snapshot, providers: event.data.providers, models: event.data.providers.models, defaultModel: snapshot.configuration?.settings.defaultModel ?? event.data.providers.defaultModel }
    case 'execution.updated': {
      const execution = event.data.execution
      return { ...snapshot, executions: [...snapshot.executions.filter((item) => item.id !== execution.id), execution] }
    }
    case 'session.created':
    case 'session.updated': {
      return { ...snapshot, sessions: upsertSession(snapshot.sessions, event.data.session) }
    }

    case 'prompt.admitted': {
      const { item } = event.data
      if (item.sessionID !== snapshot.sessionID) return snapshot
      if (snapshot.inbox.some((existing) => existing.id === item.id)) return snapshot
      const inbox = [...snapshot.inbox, item].sort((a, b) => a.seq - b.seq)
      return { ...snapshot, inbox }
    }

    case 'prompt.delivered': {
      const { item, message, checkpoint } = event.data
      if (item.sessionID !== snapshot.sessionID) return snapshot
      const inbox = snapshot.inbox.filter((existing) => existing.id !== item.id)
      // A delivery carries its message: the transcript line and the end of the
      // wait are one durable fact, so neither can be drawn without the other.
      const messages = snapshot.messages.some((existing) => existing.id === message.id)
        ? snapshot.messages
        : [...snapshot.messages, message].sort((a, b) => a.seq - b.seq)
      return { ...snapshot, inbox, messages, ...(checkpoint ? { checkpoints: [...snapshot.checkpoints.filter((item) => item.id !== checkpoint.id), checkpoint], checkpointError: null } : {}) }
    }

    case 'context.compacted': {
      const { compaction } = event.data
      if (compaction.sessionID !== snapshot.sessionID || snapshot.compactions.some((c) => c.id === compaction.id)) return snapshot
      return { ...snapshot, compactions: [...snapshot.compactions, compaction] }
    }
    case 'context.prepared': {
      const { context } = event.data
      if (context.sessionID !== snapshot.sessionID || snapshot.contexts.some((c) => c.id === context.id)) return snapshot
      return { ...snapshot, contexts: [...snapshot.contexts, context], configuration: context.configuration ?? snapshot.configuration,
        defaultModel: context.configuration?.settings.defaultModel ?? snapshot.providers?.defaultModel ?? snapshot.defaultModel }
    }

    case 'checkpoint.created': {
      const { checkpoint } = event.data
      if (checkpoint.sessionID !== snapshot.sessionID) return snapshot
      return { ...snapshot, checkpoints: [...snapshot.checkpoints.filter((item) => item.id !== checkpoint.id), checkpoint], checkpointError: null }
    }
    case 'checkpoint.failed':
      return event.sessionID === snapshot.sessionID ? { ...snapshot, checkpointError: event.data.error } : snapshot
    case 'rewind.started':
    case 'rewind.failed': {
      const { rewind } = event.data
      if (rewind.sessionID !== snapshot.sessionID) return snapshot
      return { ...snapshot, rewinds: [...snapshot.rewinds.filter((item) => item.id !== rewind.id), rewind] }
    }
    case 'rewind.completed': {
      if (event.sessionID !== snapshot.sessionID) return snapshot
      const { rewind, message, activeMessageIDs, cancelledInboxIDs } = event.data
      return { ...snapshot, rewinds: [...snapshot.rewinds.filter((item) => item.id !== rewind.id), rewind],
        messages: snapshot.messages.some((item) => item.id === message.id) ? snapshot.messages : [...snapshot.messages, message],
        activeMessageIDs, checkpointError: null, inbox: snapshot.inbox.filter((item) => !cancelledInboxIDs.includes(item.id)) }
    }

    case 'tool.updated': {
      const { call, message } = event.data
      if (call.sessionID !== snapshot.sessionID) return snapshot
      const messages = message && !snapshot.messages.some((m) => m.id === message.id)
        ? [...snapshot.messages, message].sort((a, b) => a.seq - b.seq) : snapshot.messages
      return { ...snapshot, toolCalls: upsertToolCall(snapshot.toolCalls, call), messages }
    }
    case 'permission.requested': {
      const { permission, call } = event.data
      if (permission.sessionID !== snapshot.sessionID) return snapshot
      const permissions = snapshot.permissions.some((p) => p.id === permission.id)
        ? snapshot.permissions : [...snapshot.permissions, permission]
      return { ...snapshot, permissions, toolCalls: upsertToolCall(snapshot.toolCalls, call) }
    }
    case 'permission.answered': {
      const { permission } = event.data
      if (permission.sessionID !== snapshot.sessionID) return snapshot
      return { ...snapshot, permissions: [...snapshot.permissions.filter((p) => p.id !== permission.id), permission] }
    }

    case 'step.part': {
      const { part } = event.data
      if (part.sessionID !== snapshot.sessionID || snapshot.parts.some((p) => p.id === part.id)) return snapshot
      return { ...snapshot, parts: [...snapshot.parts, part] }
    }

    case 'step.started':
    case 'step.resumed':
    case 'step.retry':
    case 'step.failed':
    case 'step.cancelled': {
      const { step } = event.data
      if (step.sessionID !== snapshot.sessionID) return snapshot
      return { ...snapshot, steps: upsertStep(snapshot.steps, step) }
    }

    case 'step.output': {
      if (event.sessionID !== snapshot.sessionID) return snapshot
      const { stepID, data } = event.data
      const steps = snapshot.steps.map((step) =>
        step.id === stepID ? { ...step, output: (step.output + data).slice(-MEMORY_OUTPUT_LIMIT) } : step,
      )
      return { ...snapshot, steps }
    }

    case 'step.completed': {
      const { step, message, toolCalls } = event.data
      if (step.sessionID !== snapshot.sessionID) return snapshot
      const messages =
        message && !snapshot.messages.some((existing) => existing.id === message.id)
          ? [...snapshot.messages, message].sort((a, b) => a.seq - b.seq)
          : snapshot.messages
      return { ...snapshot, steps: upsertStep(snapshot.steps, step), messages,
        toolCalls: (toolCalls ?? []).reduce(upsertToolCall, snapshot.toolCalls) }
    }

    case 'run.started': {
      const { run, toolCall } = event.data
      if (run.sessionID !== snapshot.sessionID) return snapshot
      return {
        ...snapshot,
        runs: upsertRun(snapshot.runs, run),
        toolCalls: toolCall ? upsertToolCall(snapshot.toolCalls, toolCall) : snapshot.toolCalls,
        output: snapshot.output[run.id] ? snapshot.output : { ...snapshot.output, [run.id]: { text: '', truncated: false } },
      }
    }

    case 'run.output': {
      const { runID, data } = event.data
      const current = snapshot.output[runID] ?? { text: '', truncated: false }
      const text = (current.text + data).slice(-MEMORY_OUTPUT_LIMIT)
      return {
        ...snapshot,
        output: { ...snapshot.output, [runID]: { ...current, text } },
      }
    }

    case 'run.truncated': {
      const { runID } = event.data
      const current = snapshot.output[runID] ?? { text: '', truncated: false }
      return {
        ...snapshot,
        output: { ...snapshot.output, [runID]: { ...current, truncated: true } },
      }
    }

    case 'run.ended': {
      const { run, toolCall } = event.data
      if (run.sessionID !== snapshot.sessionID) return snapshot
      return {
        ...snapshot,
        runs: upsertRun(snapshot.runs, run),
        toolCalls: toolCall ? upsertToolCall(snapshot.toolCalls, toolCall) : snapshot.toolCalls,
      }
    }

    default:
      return unreachable(event)
  }
}

/** Runs newest first, which is the order the terminal reads. */
export function orderedRuns(runs: Run[]): Run[] {
  return runs.slice().sort((a, b) => a.startedAt - b.startedAt)
}
