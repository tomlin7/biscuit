/** Native vendor IDs are scoped to one durable task/adapter incarnation.
 * Recovery changes an incarnation; it never invokes or replays a CLI. */
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, openSync, readSync, closeSync, writeFileSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { ProviderError, type Provider, type ProviderPart, type ProviderRequest } from './provider'
import type { CliConversation, FreshCliConversation, Step } from './protocol'
import type { Store } from './store'
import { conflict, invalid, notFound } from './errors'

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function failure(code: string, message: string): never { throw new ProviderError(code, message) }
export class CliConversations {
  constructor(readonly store: Store, readonly home: string, readonly resolve?: (model: string) => Provider) {}
  #save(value: CliConversation) {
    this.store.record({ type: 'cli.updated', sessionID: value.sessionID, data: { conversation: value }, project: () => this.store.putCliConversation(value) })
    return value
  }
  #prefix(id: string, through: number) { return hash(this.store.activeMessages(id).filter((item) => item.seq <= through).map((item) => item.id)) }
  #identity(sessionID: string, provider: Provider, model: string) {
    const current = this.store.cliConversation(sessionID), identity = provider.cliIdentity?.()
    if (!current) return identity
    if (current.status === 'blocked') failure('cli_recovery_required', current.reason ?? 'This CLI conversation requires deliberate recovery.')
    const session = this.store.session(sessionID)!
    if (!identity || current.model !== model || current.provider !== provider.name || current.adapter !== identity.adapter ||
      current.contractVersion !== identity.contractVersion || current.fingerprint !== identity.fingerprint || current.cliVersion !== identity.cliVersion || current.vendorModel !== identity.vendorModel ||
      current.cwd !== session.cwd || current.workspaceIdentity !== session.workspaceIdentity || current.profileRef.split(':')[0] !== identity.profileRef) {
      failure('cli_transition_required', 'The agent, executable, model, profile or workspace changed. Start a fresh CLI conversation explicitly; the old vendor history will not be reused.')
    }
    if (current.historyHash !== this.#prefix(sessionID, current.throughSeq)) failure('cli_rewind_required', 'The Hiroshi conversation was rewound. Start a fresh CLI conversation before sending more work.')
    return identity
  }
  validate(sessionID: string, provider: Provider, model: string) {
    try {
      const identity = this.#identity(sessionID, provider, model)
      const earlier = [...this.store.steps(sessionID).filter((step) => step.status === 'running').map((step) => step.model),
        ...this.store.inbox(sessionID, 'pending').map((item) => item.model ?? 'local/echo')]
      if (earlier.some((prior) => prior !== model && (identity || this.resolve?.(prior).cliIdentity))) {
        failure('cli_transition_required', 'Different agent/model requests cannot share a CLI delivery batch. Wait for existing work to settle, then start a fresh CLI conversation.')
      }
      if (identity && !this.store.cliConversation(sessionID) && !this.store.cliConversationHistory(sessionID).length) {
        const legacy = this.store.stepParts(sessionID).filter((part) => part.kind === 'cli').at(-1)
        if (legacy) {
          const session = this.store.session(sessionID)!, at = Date.now()
          this.#save({ ...identity, id: randomUUID(), sessionID, revision: 1, provider: provider.name, model, profileRef: `${identity.profileRef}:legacy`,
            cwd: session.cwd, workspaceIdentity: session.workspaceIdentity!, vendorSessionID: null, status: 'blocked',
            reason: 'Older CLI history has no verified continuation binding. Start a fresh CLI conversation deliberately.', stepID: legacy.stepID,
            throughSeq: 0, historyHash: this.#prefix(sessionID, 0), createdAt: at, updatedAt: at })
          failure('cli_legacy_history', 'Older CLI history needs explicit recovery before another prompt can be admitted.')
        }
      }
    }
    catch (error) {
      if (error instanceof ProviderError) throw conflict(error.code, error.message)
      throw error
    }
  }
  blocked(id: string) {
    const current = this.store.cliConversation(id)
    return current?.status === 'blocked' || current?.status === 'running' && this.store.step(current.stepID)?.status !== 'running'
  }
  begin(step: Step, provider: Provider, request: ProviderRequest): ProviderRequest['continuation'] {
    const identity = this.#identity(step.sessionID, provider, step.model)
    if (!identity) return undefined
    const session = this.store.session(step.sessionID)!
    let current = this.store.cliConversation(step.sessionID)
    const profileRef = `${identity.profileRef}:${hash(request.instructionIdentity ?? request.instructions)}`
    if (current && current.profileRef !== profileRef) {
      this.block(step.sessionID, 'Instructions changed. Start a fresh CLI conversation so the native context cannot silently retain obsolete instructions.')
      failure('cli_profile_changed', 'Instructions changed. Start a fresh CLI conversation before continuing.')
    }
    if (current && current.status !== 'ready') failure('cli_recovery_required', 'A previous CLI submission is still uncertain; it will not be replayed.')
    const resume = !!current
    if (!current) {
      // Older response-only turns were stateless. Do not silently turn their
      // unverified vendor identifiers into resumable native conversations.
      const legacy = !this.store.cliConversationHistory(step.sessionID).length && this.store.stepParts(step.sessionID).some((part) => part.kind === 'cli')
      const at = Date.now(), id = randomUUID()
      current = { ...identity, id, sessionID: step.sessionID, revision: 0, provider: provider.name, model: step.model, profileRef,
        cwd: session.cwd, workspaceIdentity: session.workspaceIdentity!, vendorSessionID: ['grok', 'pi'].includes(identity.adapter) ? randomUUID() : null,
        status: legacy ? 'blocked' : 'running', reason: legacy ? 'Older CLI history has no verified continuation binding. Start a fresh CLI conversation deliberately.' : null,
        stepID: step.id, throughSeq: 0, historyHash: this.#prefix(step.sessionID, 0), createdAt: at, updatedAt: at }
      if (legacy) { this.#save(current); failure('cli_legacy_history', current.reason!) }
    }
    const sessionFile = identity.adapter === 'pi' ? join(this.home, 'cli-sessions', current.id, 'session.jsonl') : undefined
    if (sessionFile) {
      if (!resume) {
        mkdirSync(join(this.home, 'cli-sessions', current.id), { recursive: true, mode: 0o700 })
        writeFileSync(sessionFile, JSON.stringify({ type: 'session', version: 3, id: current.vendorSessionID, timestamp: new Date().toISOString(), cwd: current.cwd }) + '\n', { flag: 'wx', mode: 0o600 })
      } else {
        try {
          if (!lstatSync(sessionFile).isFile()) throw new Error('not a file')
          const fd = openSync(sessionFile, 'r'), buffer = Buffer.alloc(8192)
          let count: number
          try { count = readSync(fd, buffer, 0, buffer.length, 0) } finally { closeSync(fd) }
          const line = buffer.subarray(0, count!).toString('utf8').split('\n')[0]!, header = JSON.parse(line)
          if (header.type !== 'session' || header.version !== 3 || header.id !== current.vendorSessionID || header.cwd !== current.cwd) throw new Error('mismatch')
        } catch {
          this.block(step.sessionID, 'The owned Pi session file is missing, incompatible or changed. It was not replaced or replayed.')
          failure('cli_session_missing', 'The Pi session file cannot be resumed safely. Start a fresh CLI conversation.')
        }
      }
    }
    current = this.#save({ ...current, status: 'running', stepID: step.id, revision: current.revision + 1, updatedAt: Date.now() })
    return { id: current.id, fingerprint: current.fingerprint, vendorSessionID: current.vendorSessionID, resume, throughSeq: current.throughSeq, ...(sessionFile ? { sessionFile } : {}) }
  }
  part(step: Step, part: ProviderPart) {
    if (part.kind !== 'cli' || part.phase !== 'session') return
    const current = this.store.cliConversation(step.sessionID)
    if (!current || current.stepID !== step.id || current.status !== 'running') return
    const id = part.vendorSessionID
    if (!id || !/^[a-zA-Z0-9_-]{1,200}$/.test(id) || current.adapter !== part.adapter || (current.vendorSessionID && current.vendorSessionID !== id)) {
      failure('cli_identity_mismatch', 'The CLI reported a different conversation. No fallback session was accepted.')
    }
    const owner = this.store.cliVendorOwner(current.adapter, id)
    if (owner && owner !== current.id) failure('cli_session_shared', 'This vendor conversation belongs to another Hiroshi task. It cannot be shared.')
    if (!current.vendorSessionID) this.#save({ ...current, vendorSessionID: id, revision: current.revision + 1, updatedAt: Date.now() })
  }
  complete(step: Step) {
    const current = this.store.cliConversation(step.sessionID)
    if (!current || current.stepID !== step.id || current.status !== 'running') return
    if (!current.vendorSessionID) { this.block(step.sessionID, 'The CLI completed without a confirmed conversation identifier.'); return }
    const throughSeq = this.store.activeMessages(step.sessionID).at(-1)?.seq ?? 0
    this.#save({ ...current, status: 'ready', reason: null, throughSeq, historyHash: this.#prefix(step.sessionID, throughSeq), revision: current.revision + 1, updatedAt: Date.now() })
  }
  block(sessionID: string, reason: string, stepID?: string) {
    const current = this.store.cliConversation(sessionID)
    if (current && current.status !== 'blocked' && (!stepID || current.stepID === stepID)) this.#save({ ...current, status: 'blocked', reason, revision: current.revision + 1, updatedAt: Date.now() })
  }
  reconcile(sessionID?: string) {
    for (const session of sessionID ? [this.store.session(sessionID)!].filter(Boolean) : this.store.sessions()) {
      const current = this.store.cliConversation(session.id)
      if (current?.status !== 'running') continue
      const step = this.store.step(current.stepID)
      if (step?.status === 'succeeded') this.complete(step)
      else if (!step || step.status !== 'running') this.block(session.id, 'The previous CLI submission was interrupted or failed. It was not replayed.')
    }
  }
  fresh(sessionID: string, input: FreshCliConversation) {
    if (!this.store.session(sessionID)) throw notFound('session')
    if (!input || typeof input !== 'object' || typeof input.conversationID !== 'string' || !Number.isSafeInteger(input.revision)) throw invalid('cli_recovery', 'Choose the current CLI conversation and revision.')
    if (typeof input.key !== 'string' || !input.key.trim() || input.key.length > 128) throw invalid('cli_recovery_key', 'Fresh conversation requires an explicit request key.')
    if (this.store.cliReset(sessionID, input.key) === input.conversationID) return this.store.cliConversation(sessionID)
    const current = this.store.cliConversation(sessionID)
    if (!current || current.id !== input.conversationID || current.revision !== input.revision) throw conflict('cli_revision', 'The CLI conversation changed. Reload before starting a fresh one.')
    const archived = { ...current, status: 'archived' as const, reason: 'Explicitly replaced; its vendor history is retained.', revision: current.revision + 1, updatedAt: Date.now() }
    this.store.record({ type: 'cli.updated', sessionID, data: { conversation: null }, project: () => this.store.putCliConversation(archived, input.key) })
    return null
  }
}
