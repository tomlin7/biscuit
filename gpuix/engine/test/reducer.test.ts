import { describe, expect, test } from 'bun:test'

import { apply, hydrate, initialSnapshot, type Snapshot } from '../../src/engine/reducer'
import type {
  CliConversation,
  EngineEvent,
  EventPayloads,
  EventType,
  InboxItem,
  Message,
  Run,
  Session,
  SessionDetail,
  Step,
  ToolCall,
} from '../src/protocol'

let clock = 0

test('permission mode and AI review events are task-scoped and keep reviewer usage out of assistant text', () => {
  const selected = { ...initialSnapshot(), sessionID: 'ses_one' }
  expect(apply(selected, event('access.updated', { access: { mode: 'full', revision: 1 } }, { sessionID: 'ses_other' })).access.mode).toBe('ask')
  const changed = apply(selected, event('access.updated', { access: { mode: 'auto', revision: 1 } }))
  const review = { toolCallID: 'tool', sessionID: 'ses_one', model: 'provider/model', revision: 1, inputHash: 'hash', at: 1, status: 'running' as const, reason: 'Reviewing' }
  const running = apply(changed, event('access.reviewed', { review }))
  const done = apply(running, event('access.reviewed', { review: { ...review, status: 'allow', usage: { inputTokens: 10, outputTokens: 2 } } }))
  expect(done.access).toEqual({ mode: 'auto', revision: 1 })
  expect(done.accessReviews).toHaveLength(1)
  expect(done.accessReviews[0]?.status).toBe('allow')
  expect(done.transcript).toHaveLength(0)
})

test('CLI identity events stay task-scoped, advance durably and clear on explicit recovery', () => {
  const binding = { id: 'native-binding', sessionID: 'ses_one', revision: 3, status: 'ready' } as CliConversation
  const selected = { ...initialSnapshot(), sessionID: 'ses_one' }
  const other = event('cli.updated', { conversation: binding }, { sessionID: 'ses_other' })
  expect(apply(selected, other).cliConversation).toBeNull()
  const updated = event('cli.updated', { conversation: binding })
  const bound = apply(selected, updated)
  expect(bound.cliConversation).toEqual(binding)
  expect(bound.transcript).toHaveLength(0)
  const cleared = apply(bound, event('cli.updated', { conversation: null }))
  expect(cleared.cliConversation).toBeNull()
  expect(apply(cleared, updated).cliConversation).toBeNull()
})

/**
 * One event, with its payload checked against the shape module.
 *
 * The cast assembles the union member from the two halves the caller passes;
 * a payload that does not belong to the type is a compile error at the call.
 */
function event<Type extends EventType>(
  type: Type,
  data: EventPayloads[Type],
  extra: { sessionID?: string | null; runID?: string | null } = {},
): EngineEvent {
  clock += 1
  return {
    seq: clock,
    type,
    at: clock,
    sessionID: extra.sessionID === undefined ? 'ses_one' : extra.sessionID,
    runID: extra.runID ?? null,
    data,
  } as EngineEvent
}

const session: Session = {
  id: 'ses_one',
  title: 'one',
  cwd: '/workspace',
  createdAt: 1,
  updatedAt: 1,
  runs: 0,
  running: 0,
  lastRunAt: null,
}

const run: Run = {
  id: 'run_one',
  sessionID: 'ses_one',
  command: 'echo hi',
  cwd: '/workspace',
  shell: 'sh',
  status: 'running',
  exitCode: null,
  error: null,
  startedAt: 10,
  endedAt: null,
}

const toolCall: ToolCall = {
  id: 'tool_one',
  sessionID: 'ses_one',
  stepID: null,
  runID: run.id,
  tool: 'shell',
  input: 'echo hi',
  status: 'running',
  error: null,
  createdAt: 10,
  endedAt: null,
}

const step: Step = {
  id: 'step_one',
  sessionID: 'ses_one',
  messageID: 'msg_one',
  provider: 'local',
  model: 'local/echo',
  attempt: 1,
  status: 'running',
  claim: 4242,
  output: '',
  truncated: false,
  error: null,
  startedAt: 10,
  endedAt: null,
}

function ready(): Snapshot {
  return { ...initialSnapshot(), status: 'ready', sessionID: 'ses_one' }
}

describe('the projection', () => {
  test('a run grows from started to ended, and its output accumulates', () => {
    let snapshot = ready()

    snapshot = apply(snapshot, event('run.started', { run, toolCall }, { runID: run.id }))
    expect(snapshot.runs).toHaveLength(1)
    expect(snapshot.runs[0]!.status).toBe('running')
    expect(snapshot.toolCalls).toHaveLength(1)
    expect(snapshot.toolCalls[0]!.status).toBe('running')

    snapshot = apply(snapshot, event('run.output', { runID: run.id, stream: 'stdout', data: 'hel' }, { runID: run.id }))
    snapshot = apply(snapshot, event('run.output', { runID: run.id, stream: 'stdout', data: 'lo\n' }, { runID: run.id }))
    expect(snapshot.output[run.id]!.text).toBe('hello\n')

    const ended = { ...run, status: 'succeeded' as const, exitCode: 0, endedAt: 20 }
    const endedCall: ToolCall = { ...toolCall, status: 'succeeded', endedAt: 20 }
    snapshot = apply(snapshot, event('run.ended', { run: ended, toolCall: endedCall }, { runID: run.id }))
    expect(snapshot.runs[0]!.status).toBe('succeeded')
    expect(snapshot.runs[0]!.exitCode).toBe(0)
    expect(snapshot.toolCalls[0]!.status).toBe('succeeded')
  })

  test('a run from another session never lands in this one', () => {
    const other = { ...run, id: 'run_other', sessionID: 'ses_two' }
    const snapshot = apply(
      ready(),
      event('run.started', { run: other, toolCall: null }, { sessionID: 'ses_two', runID: other.id }),
    )
    expect(snapshot.runs).toHaveLength(0)
    expect(snapshot.toolCalls).toHaveLength(0)
  })

  test('a step streams, retries and completes with one assistant message', () => {
    let snapshot = ready()

    snapshot = apply(snapshot, event('step.started', { step }))
    expect(snapshot.steps).toHaveLength(1)

    snapshot = apply(snapshot, event('step.output', { stepID: step.id, data: 'hel' }))
    snapshot = apply(snapshot, event('step.output', { stepID: step.id, data: 'lo' }))
    expect(snapshot.steps[0]!.output).toBe('hello')

    const error = { code: 'rate_limit', message: 'slow down', retryable: true }
    const retried: Step = { ...step, attempt: 2, error }
    snapshot = apply(snapshot, event('step.retry', { step: retried, delay: 500, error }))
    expect(snapshot.steps[0]!.attempt).toBe(2)
    expect(snapshot.steps[0]!.error?.code).toBe('rate_limit')

    const message: Message = {
      id: 'msg_answer',
      sessionID: 'ses_one',
      seq: 0,
      role: 'assistant',
      text: 'hello',
      at: 30,
    }
    const done: Step = { ...retried, status: 'succeeded', claim: null, error: null, output: 'hello', endedAt: 30 }
    snapshot = apply(snapshot, event('step.completed', { step: done, message }))
    expect(snapshot.steps[0]!.status).toBe('succeeded')
    expect(snapshot.messages).toHaveLength(1)
    expect(snapshot.messages[0]!.role).toBe('assistant')

    // A replay of the completion draws no second answer.
    snapshot = apply(snapshot, event('step.completed', { step: done, message }))
    expect(snapshot.messages).toHaveLength(1)
  })

  test('a step from another session never lands in this one', () => {
    const other = { ...step, id: 'step_other', sessionID: 'ses_two' }
    const snapshot = apply(ready(), event('step.started', { step: other }, { sessionID: 'ses_two' }))
    expect(snapshot.steps).toHaveLength(0)
  })

  test('a prompt sits in the inbox until one event delivers it with its message', () => {
    const item: InboxItem = {
      id: 'inb_one',
      sessionID: 'ses_one',
      seq: 0,
      text: 'ship it',
      mode: 'steer',
      state: 'pending',
      key: 'k1',
      admittedAt: 5,
      deliveredAt: null,
      messageID: null,
    }

    let snapshot = apply(ready(), event('prompt.admitted', { item }))
    expect(snapshot.inbox).toHaveLength(1)
    expect(snapshot.messages).toHaveLength(0)

    const message: Message = {
      id: 'msg_one',
      sessionID: 'ses_one',
      seq: 0,
      role: 'user',
      text: 'ship it',
      at: 6,
      mode: 'steer',
    }
    const delivered: InboxItem = { ...item, state: 'delivered', deliveredAt: 6, messageID: message.id }
    snapshot = apply(snapshot, event('prompt.delivered', { item: delivered, message }))

    expect(snapshot.inbox).toHaveLength(0)
    expect(snapshot.messages).toHaveLength(1)
    expect(snapshot.messages[0]!.mode).toBe('steer')

    // A replay of the same delivery draws nothing a second time.
    snapshot = apply(snapshot, event('prompt.delivered', { item: delivered, message }))
    expect(snapshot.messages).toHaveLength(1)
  })

  test('another session’s inbox never leaks into this one', () => {
    const item: InboxItem = {
      id: 'inb_two',
      sessionID: 'ses_two',
      seq: 0,
      text: 'not mine',
      mode: 'queue',
      state: 'pending',
      key: null,
      admittedAt: 1,
      deliveredAt: null,
      messageID: null,
    }
    const snapshot = apply(ready(), event('prompt.admitted', { item }, { sessionID: 'ses_two' }))
    expect(snapshot.inbox).toHaveLength(0)
  })

  test('hydrating a snapshot rebuilds the output from the engine chunks', () => {
    const detail: SessionDetail = {
      session,
      messages: [{ id: 'msg_one', sessionID: 'ses_one', seq: 0, role: 'user', text: 'hi', at: 1 }],
      runs: [{ ...run, status: 'succeeded', exitCode: 0, endedAt: 20 }],
      chunks: [
        { runID: run.id, seq: 0, stream: 'stdout', data: 'hel', at: 11 },
        { runID: run.id, seq: 1, stream: 'stdout', data: 'lo\n', at: 12 },
        { runID: run.id, seq: 2, stream: 'stderr', data: 'warn\n', at: 13 },
      ],
      inbox: [],
      steps: [{ ...step, status: 'succeeded', claim: null, output: 'hi', endedAt: 20 }],
      compactions: [],
      contexts: [],
      parts: [],
      permissions: [],
      checkpoints: [], rewinds: [], activeMessageIDs: ['msg_one'], checkpointError: null,
      toolCalls: [{ ...toolCall, status: 'succeeded', endedAt: 20 }],
      seq: 9,
    }

    const snapshot = hydrate({ ...initialSnapshot(), status: 'ready' }, detail)
    expect(snapshot.sessionID).toBe('ses_one')
    expect(snapshot.messages).toHaveLength(1)
    expect(snapshot.runs[0]!.status).toBe('succeeded')
    expect(snapshot.steps).toHaveLength(1)
    expect(snapshot.steps[0]!.output).toBe('hi')
    expect(snapshot.toolCalls).toHaveLength(1)
    expect(snapshot.output[run.id]!.text).toBe('hello\nwarn\n')
    expect(snapshot.inbox).toEqual([])
  })

  test('the in-memory copy keeps the tail, not the head', () => {
    let snapshot = ready()
    snapshot = apply(snapshot, event('run.started', { run, toolCall }, { runID: run.id }))

    const chunk = 'x'.repeat(64 * 1024)
    for (let index = 0; index < 6; index += 1) {
      snapshot = apply(snapshot, event('run.output', { runID: run.id, stream: 'stdout', data: chunk }, { runID: run.id }))
    }

    const drawn = snapshot.output[run.id]!.text
    expect(drawn.length).toBeLessThanOrEqual(256 * 1024)
    expect(drawn.length).toBeGreaterThanOrEqual(256 * 1024 - 1)
  })
})
