/**
 * The session inbox: a prompt is a fact before it is a message.
 *
 * Admission and delivery are two separate durable steps, in that order. A
 * prompt recorded while a run is going waits in the inbox; it is delivered, as
 * one `prompt.delivered` event carrying the message, only when the engine is at
 * a safe boundary.
 *
 * A boundary today is the end of a run and the end of a step: nothing is
 * delivered while either is in flight, because the prompt that is already
 * being answered owns the next assistant message in the transcript. When a
 * step grows tool calls of its own, the boundary stays "nothing in flight",
 * and this file's law does not change.
 *
 * At one boundary every steer goes first, then everything queued, each in
 * admission order. Steering never stops the run it is steered past: it lands
 * after the step that was already going.
 *
 * Admission is idempotent on the client's key. The first admission wins, and a
 * retry returns that same item whether it is still waiting or already in the
 * transcript.
 */

import { invalid, notFound } from './errors'
import type { Logger } from './log'
import type { Checkpoint, DeliveryMode, InboxItem, Message, PromptRequest } from './protocol'
import type { Store } from './store'

export interface Admitted {
  item: InboxItem
  /** The transcript message, when the session was idle and delivery was immediate. */
  message: Message | null
}

function newInboxID(): string {
  return `inb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function modeOf(input: PromptRequest): DeliveryMode {
  const mode = input.mode ?? 'queue'
  if (mode !== 'steer' && mode !== 'queue') {
    throw invalid('bad_delivery_mode', 'mode must be "steer" or "queue"')
  }
  return mode
}

function keyOf(input: PromptRequest): string | null {
  const key = (input.key ?? '').trim()
  if (!key) return null
  if (key.length > 128) throw invalid('bad_key', 'the idempotency key is longer than 128 characters')
  return key
}

export class Inbox {
  readonly #store: Store
  readonly #log: Logger

  /**
   * Called after a batch lands in the transcript, with the messages in order.
   * `serve` uses it to start the step that answers them. It is assigned after
   * startup has settled the steps a dead process left behind, so a resume can
   * never mistake fresh work for a claim.
   */
  onDelivered: ((sessionID: string, messages: Message[]) => void) | null = null

  /**
   * A boundary guard for work the inbox cannot see. `serve` points it at the
   * step runner: a prompt is not delivered while a model call is streaming,
   * because the answer to the prompt already in flight belongs before it in
   * the transcript. The step calls back into `deliver` when it ends.
   */
  busy: ((sessionID: string) => boolean) | null = null
  beforeDeliver: ((sessionID: string, item: InboxItem) => Checkpoint) | null = null

  constructor(store: Store, log: Logger) {
    this.#store = store
    this.#log = log.child('inbox')
  }

  /**
   * Record a prompt, then deliver it if the session is already idle.
   *
   * `project` runs inside the admission transaction. `Sessions` uses it to
   * name an untitled session in the same commit as the item it is named for.
   */
  admit(sessionID: string, input: PromptRequest, project?: (at: number) => void): Admitted {
    const session = this.#store.session(sessionID)
    if (!session) throw notFound('session')

    const text = (input.text ?? '').trim()
    if (!text) throw invalid('empty_prompt', 'text is required')
    const mode = modeOf(input)
    const key = keyOf(input)

    if (key) {
      const existing = this.#store.inboxByKey(sessionID, key)
      if (existing) {
        // A retry may arrive after the boundary that should have delivered the
        // first admission. It is still the same prompt: nudge, never duplicate.
        if (existing.state === 'pending') this.deliver(sessionID)
        return this.#result(existing.id)
      }
    }

    const at = Date.now()
    const item: InboxItem = {
      id: newInboxID(),
      sessionID,
      seq: this.#store.inboxSeq(sessionID),
      text,
      mode,
      state: 'pending',
      key,
      admittedAt: at,
      deliveredAt: null,
      messageID: null,
      ...(input.model ? { model: input.model } : {}),
    }

    this.#store.record({
      type: 'prompt.admitted',
      sessionID,
      at,
      data: { item },
      project: () => {
        this.#store.insertInboxItem(item)
        this.#store.touchSession(sessionID, at)
        project?.(at)
      },
    })

    this.#log.info('prompt admitted', { session: sessionID, item: item.id, mode })

    // An idle session has nothing to wait for. A busy one is delivered at the
    // boundary, by `Runs` calling back into `deliver`.
    this.deliver(sessionID)
    return this.#result(item.id)
  }

  /**
   * Deliver what this boundary allows, if the session is at one.
   *
   * The engine's boundary is "nothing is in flight": no run and no step. A
   * steer is delivered ahead of a queued item in the same pass, so steering
   * wins at idle without ever cutting the answer that is already streaming
   * short. The step runner calls back here when a step ends.
   */
  deliver(sessionID: string): Message[] {
    if (this.#store.runningRuns(sessionID).length > 0) return []
    if (this.busy?.(sessionID)) return []

    const pending = this.#store
      .inbox(sessionID, 'pending')
      .sort((left, right) =>
        left.mode === right.mode ? left.seq - right.seq : left.mode === 'steer' ? -1 : 1,
      )

    const delivered: Message[] = []
    for (const item of pending) {
      let checkpoint: Checkpoint | undefined
      try { checkpoint = this.beforeDeliver?.(sessionID, item) }
      catch (error) {
        const reason = error instanceof Error ? error.message : 'the workspace checkpoint failed'
        this.#store.record({ type: 'checkpoint.failed', sessionID, data: { itemID: item.id, error: reason },
          project: () => this.#store.setCheckpointError(sessionID, reason) })
        break // Admission stays durable; no model or workspace effect can begin.
      }
      const at = Date.now()
      // Reserve first: the message is part of the event that makes it durable,
      // and the projector that writes the row also closes the inbox item.
      const message = this.#store.newMessage(sessionID, 'user', item.text, at, item.mode)
      if (item.model) message.model = item.model
      const done: InboxItem = {
        ...item,
        state: 'delivered',
        deliveredAt: at,
        messageID: message.id,
      }

      this.#store.record({
        type: 'prompt.delivered',
        sessionID,
        at,
        data: { item: done, message, ...(checkpoint ? { checkpoint } : {}) },
        project: () => {
          if (checkpoint) this.#store.insertCheckpoint(checkpoint)
          this.#store.insertMessage(message)
          this.#store.deliverInboxItem(item.id, message.id, at)
          this.#store.touchSession(sessionID, at)
        },
      })

      delivered.push(message)
      this.#log.info('prompt delivered', { session: sessionID, item: item.id, mode: item.mode, message: message.id })
    }

    if (delivered.length > 0) {
      try {
        this.onDelivered?.(sessionID, delivered)
      } catch (error) {
        // A listener that throws must not make delivery look failed: the
        // messages are already committed.
        this.#log.error(`the delivery listener failed: ${String(error)}`)
      }
    }
    return delivered
  }

  /**
   * Deliver everything waiting in every idle session. Called once on startup,
   * after stale runs are settled, so a prompt admitted before a crash is not
   * stranded in an inbox that never reaches another boundary.
   */
  deliverIdle(): number {
    let count = 0
    for (const sessionID of this.#store.inboxSessions()) {
      count += this.deliver(sessionID).length
    }
    if (count > 0) this.#log.info('delivered prompts left in the inbox', { messages: count })
    return count
  }

  #result(id: string): Admitted {
    const item = this.#store.inboxItem(id)
    if (!item) throw new Error(`the inbox item ${id} disappeared during admission`)
    const message = item.messageID ? this.#store.message(item.messageID) : null
    return { item, message }
  }
}
