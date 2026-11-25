/** Durable tool dispatch and the permission gate. No provider loop lives here. */
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { invalid, notFound, EngineError } from '../errors'
import type { Message, ModelToolRequest, Permission, SavedPermission, Step, ToolCall } from '../protocol'
import type { Store } from '../store'
import { canonical, digest, type ToolRegistry } from './registry'
import { permissionPolicy } from './policy'
import { ExecutionBudget } from '../execution'
import { assertWorkspace } from '../projects'
import type { AccessControls } from './access'
import { Configuration } from '../configuration'

const PREVIEW_BYTES = 16 * 1024

export class Tools {
  readonly #workers = new Map<string, Promise<void>>()
  readonly #active = new Map<string, AbortController>()
  #stopping = false
  blocked: ((sessionID: string) => boolean) | null = null
  onIdle: ((sessionID: string) => void) | null = null

  constructor(readonly store: Store, readonly registry: ToolRegistry, readonly home: string, readonly budget?: ExecutionBudget, readonly access?: AccessControls) {}

  busy(sessionID: string): boolean {
    return [...this.#active.keys()].some((id) => this.store.toolCall(id)?.sessionID === sessionID) || this.store.toolCalls(sessionID).some((call) => call.callID !== undefined && !call.resultMessageID)
  }

  /** Prepared inside step.completed's transaction, before any dispatch. */
  prepare(step: Step, message: Message, requests: ModelToolRequest[]): ToolCall[] {
    return requests.map((request) => {
      const entry = this.registry.get(request.name)
      return {
        id: `tool_${randomUUID()}`, sessionID: step.sessionID, stepID: step.id, runID: null,
        callID: request.id, messageID: message.id, tool: request.name, input: request.arguments,
        cwd: this.store.session(step.sessionID)!.cwd, status: 'queued', error: null,
        revision: entry?.revision, definition: entry?.definition,
        createdAt: Date.now(), endedAt: null,
      }
    })
  }

  /** Running claims are never replayed. Waiting questions and queued work are
   * safe to resume; their effects have not begun. */
  recover(): void {
    for (const session of this.store.sessions()) {
      for (const call of this.store.toolCalls(session.id)) {
        if (call.callID && !call.resultMessageID && call.status === 'running') {
          this.#finish(call, 'interrupted', 'the engine stopped while this tool was running; it was not replayed')
        }
      }
    }
  }

  kickAll(): void { for (const session of this.store.sessions()) this.kick(session.id) }

  kick(sessionID: string): void {
    if (this.#stopping || this.blocked?.(sessionID) || this.#workers.has(sessionID)) return
    const work = Promise.resolve().then(() => this.#drain(sessionID)).finally(() => {
      this.#workers.delete(sessionID)
      if (this.#stopping) return
      if (!this.busy(sessionID)) this.onIdle?.(sessionID)
      // An answer can arrive between publishing the question and this finally.
      const first = this.#pending(sessionID)[0]
      if (first && (first.status === 'queued' || this.#permission(first.id)?.state === 'answered')) this.kick(sessionID)
    })
    this.#workers.set(sessionID, work)
    void work.catch(() => {})
  }

  answer(id: string, decision: 'allow' | 'deny', remember = false): Permission {
    if (!['allow', 'deny'].includes(decision) || typeof remember !== 'boolean') throw invalid('bad_permission_answer', 'answer needs allow or deny and a boolean remember value')
    const current = this.store.permission(id)
    if (!current) throw notFound('permission')
    if (current.state === 'answered') {
      if (current.decision !== decision || current.remember !== remember) {
        throw new EngineError(409, 'permission_answered', 'this permission already has a different answer')
      }
      this.kick(current.sessionID)
      return current
    }
    const call = this.store.toolCall(current.toolCallID)
    if (!call || call.resultMessageID) throw invalid('permission_closed', 'this tool call has already ended')
    const permission: Permission = { ...current, state: 'answered', decision, remember, answeredAt: Date.now() }
    const saved: SavedPermission | undefined = remember ? {
      id: `saved_${randomUUID()}`, scope: this.#scope(call), decision, at: Date.now(),
    } : undefined
    this.store.record({ type: 'permission.answered', sessionID: current.sessionID, data: { permission, ...(saved ? { saved } : {}) },
      project: () => { this.store.updatePermission(permission); if (saved) this.store.insertSavedPermission(saved) } })
    this.kick(current.sessionID)
    return permission
  }

  interrupt(sessionID: string): void {
    for (const call of this.#pending(sessionID)) {
      const question = this.#permission(call.id)
      if (question?.state === 'pending') {
        const permission: Permission = { ...question, state: 'answered', decision: 'deny', remember: false, answeredAt: Date.now() }
        this.store.record({ type: 'permission.answered', sessionID, data: { permission }, project: () => this.store.updatePermission(permission) })
      }
      this.#finish(call, 'cancelled', 'the operator interrupted this tool turn')
      this.#active.get(call.id)?.abort()
    }
  }

  stopAll(): void {
    this.#stopping = true
    for (const controller of this.#active.values()) controller.abort()
  }

  output(id: string): { path: string; text: string } {
    const call = this.store.toolCall(id)
    if (!call?.outputPath || !call.callID) throw notFound('tool output')
    const path = join(this.home, 'tool-results', `${call.id}.json`)
    if (call.outputPath !== path) throw invalid('bad_output_path', 'tool output is not in managed storage')
    return { path, text: readFileSync(path, 'utf8') }
  }

  #pending(sessionID: string): ToolCall[] {
    return this.store.toolCalls(sessionID).filter((call) => call.callID !== undefined && !call.resultMessageID)
  }

  #permission(callID: string): Permission | undefined {
    const call = this.store.toolCall(callID)
    return call ? this.store.permissions(call.sessionID).find((p) => p.toolCallID === callID) : undefined
  }

  #scope(call: ToolCall): string {
    let input: unknown
    try { input = JSON.parse(call.input) } catch { input = call.input }
    const instructions = this.store.contexts(call.sessionID).filter((context) => context.stepID === call.stepID).at(-1)?.sources
      .map(({ source, hash }) => ({ source, hash })) ?? []
    return digest(canonical([call.cwd, this.store.session(call.sessionID)?.workspaceIdentity, call.tool, call.revision, input, instructions]))
  }

  async #drain(sessionID: string): Promise<void> {
    while (!this.#stopping) {
      const original = this.#pending(sessionID)[0]
      if (!original) return
      let call = original
      if (call.status === 'running') return
      const entry = this.registry.get(call.tool)
      if (!entry || entry.revision !== call.revision) { this.#finish(call, 'failed', 'the registered tool is missing or changed; it was not executed'); continue }
      let input: unknown
      try {
        input = JSON.parse(call.input)
        assertWorkspace(this.store, sessionID)
        if (!entry.input(input)) throw new Error('tool input does not match its declared schema')
        const cwd = realpathSync(call.cwd!)
        if (cwd !== call.cwd) { call = { ...call, cwd }; this.#update(call) }
      } catch {
        this.#finish(call, 'failed', 'tool input or workspace is invalid; it was not executed')
        continue
      }
      if (this.store.savedPermission(this.#scope(call))?.decision === 'deny') {
        this.#finish({ ...call, decisionSource: 'saved' }, 'denied', 'this exact request was previously declined')
        continue
      }
      let policy: ReturnType<typeof permissionPolicy> & { revision?: number; decisionSource?: string }
      try {
        const reviewing = new AbortController()
        this.#active.set(call.id, reviewing)
        try { policy = this.access ? await this.access.decide(call, entry, input, reviewing.signal) : permissionPolicy(this.home, call.cwd!, call.tool) }
        finally { this.#active.delete(call.id) }
        if (this.#stopping) return
        if (this.store.toolCall(call.id)?.resultMessageID) continue
      } catch {
        this.#finish({ ...call, decisionSource: 'policy' }, 'denied', 'invalid tool policy; execution is blocked')
        continue
      }
      if (policy.action === 'deny') {
        this.#finish({ ...call, decisionSource: policy.source }, 'denied', 'this tool call is denied by policy')
        continue
      }
      if (this.#permission(call.id)?.decision === 'deny') {
        this.#finish({ ...call, decisionSource: 'operator' }, 'denied', 'this tool call was declined')
        continue
      }
      // An operator decline cannot be argued into another question in the same
      // turn. Saved answers additionally apply to future matching requests.
      const turn = this.store.step(call.stepID!)?.messageID
      const declined = this.store.toolCalls(sessionID).some((other) => other.id !== call.id && other.status === 'denied' &&
        this.store.step(other.stepID ?? '')?.messageID === turn && this.#scope(other) === this.#scope(call))
      if (declined) { this.#finish({ ...call, decisionSource: 'turn' }, 'denied', 'this exact request was already denied for this turn'); continue }
      let source = policy.decisionSource ?? 'policy'
      if (policy.action === 'ask') {
        const permission = this.#permission(call.id)
        const saved = !policy.alwaysAsk ? this.store.savedPermission(this.#scope(call)) : null
        const decision = permission?.state === 'answered' ? permission.decision : saved?.decision
        if (decision === 'deny') {
          this.#finish({ ...call, decisionSource: permission?.state === 'answered' ? 'operator' : 'saved' }, 'denied', 'this tool call was declined')
          continue
        }
        if (!decision) {
          if (!permission) {
            const question: Permission = { id: `permission_${randomUUID()}`, sessionID, toolCallID: call.id,
              tool: call.tool, input: call.input, cwd: call.cwd!, revision: call.revision!, state: 'pending',
              decision: null, remember: false, createdAt: Date.now(), answeredAt: null }
            const waiting: ToolCall = { ...call, status: 'waiting' }
            this.store.record({ type: 'permission.requested', sessionID, data: { permission: question, call: waiting },
              project: () => { this.store.insertPermission(question); this.store.updateToolCall(waiting) } })
          }
          return
        }
        source = permission?.state === 'answered' ? 'operator' : 'saved'
      }
      const running: ToolCall = { ...call, status: 'running', decisionSource: source }
      const controller = new AbortController()
      this.#active.set(call.id, controller)
      try {
        const effect = async (signal: AbortSignal) => {
          signal.throwIfAborted()
          assertWorkspace(this.store, sessionID)
          if (this.store.toolCall(call.id)?.resultMessageID) throw new Error('this tool call already ended')
          // Waiting for capacity must not preserve a revoked policy or stale tool.
          const currentPolicy = this.access ? this.access.current(call, entry, input) : permissionPolicy(this.home, call.cwd!, call.tool)
          if (this.registry.get(call.tool)?.revision !== call.revision || currentPolicy.action === 'deny' ||
            (this.access && this.store.access(sessionID).revision !== policy.revision) ||
            realpathSync(call.cwd!) !== call.cwd || (currentPolicy.action === 'ask' &&
              (source === 'policy' || source.startsWith('mode:') || source === 'reviewer' || (currentPolicy.alwaysAsk && source === 'saved')))) throw new Error('tool definition or permission policy changed while queued; it was not executed')
          this.#update(running) // Claim commits after admission, before the effect.
          if (entry.accessKind === 'edit' || entry.accessKind === 'command') new Configuration(this.home).beforeEffect(this.store, call, entry.accessKind, input)
          return entry.run(input, { cwd: call.cwd!, sessionID, callID: call.id, signal })
        }
        const result = this.budget
          ? await this.budget.execute({ id: call.id, sessionID, kind: 'tool', messageID: call.messageID }, controller.signal, effect)
          : await effect(controller.signal)
        if (this.#stopping) return
        if (!entry.output(result)) throw new Error('tool result does not match its declared output schema')
        this.#finish(running, 'succeeded', null, result)
      } catch (error) {
        if (this.#stopping) return
        this.#finish(running, 'failed', error instanceof Error ? error.message.slice(0, 1000) : 'tool execution failed')
      } finally { this.#active.delete(call.id) }
    }
  }

  #update(call: ToolCall): void {
    this.store.record({ type: 'tool.updated', sessionID: call.sessionID, data: { call }, project: () => this.store.updateToolCall(call) })
  }

  #finish(value: ToolCall, status: ToolCall['status'], error: string | null, result?: unknown): void {
    const current = this.store.toolCall(value.id)
    if (!current || current.resultMessageID) return
    const question = this.#permission(value.id)
    if (question?.state === 'pending') {
      const permission: Permission = { ...question, state: 'answered', decision: 'deny', remember: false, answeredAt: Date.now() }
      this.store.record({ type: 'permission.answered', sessionID: value.sessionID, data: { permission }, project: () => this.store.updatePermission(permission) })
    }
    const text = result === undefined ? JSON.stringify({ status, reason: error }) : JSON.stringify(result, null, 2)
    if (text === undefined) throw new Error('a tool result must be a JSON value')
    const directory = join(this.home, 'tool-results')
    let outputPath: string | undefined = join(directory, `${value.id}.json`)
    // Immutable once published. A process that died after writing the result
    // but before committing its ending leaves evidence that recovery preserves.
    try {
      mkdirSync(directory, { recursive: true })
      if (!existsSync(outputPath)) {
        const temporary = `${outputPath}.${randomUUID()}.tmp`
        try {
          const fd = openSync(temporary, 'wx', 0o600)
          try { writeFileSync(fd, text); fsyncSync(fd) } finally { closeSync(fd) }
          renameSync(temporary, outputPath)
        } finally { try { unlinkSync(temporary) } catch {} }
      }
    } catch {
      // Storage failure is an explicit ending, never a claim that gets stuck
      // or a reason to re-run an effect that might already have happened.
      status = 'failed'
      error = 'the full tool result could not be saved in managed storage; the tool was not replayed'
      outputPath = undefined
    }
    const bytes = Buffer.from(text)
    const truncated = bytes.length > PREVIEW_BYTES
    const output = truncated
      ? `${bytes.subarray(0, PREVIEW_BYTES).toString('utf8')}\n[Output truncated. ${outputPath ? `Full result: ${outputPath}` : error}]`
      : text
    const message = this.store.newMessage(value.sessionID, 'tool', output, Date.now())
    message.toolResult = { callID: value.callID!, toolCallID: value.id, status }
    const call: ToolCall = { ...current, ...value, status, error, output, outputPath, truncated,
      resultMessageID: message.id, endedAt: Date.now() }
    this.store.record({ type: 'tool.updated', sessionID: value.sessionID, data: { call, message },
      project: () => { this.store.updateToolCall(call); this.store.insertMessage(message) } })
  }
}
