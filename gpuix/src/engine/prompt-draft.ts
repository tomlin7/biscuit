import type { DeliveryMode } from '../../engine/src/protocol'
import type { EngineClient } from './client'
import type { PromptDraft, PromptScope, PromptStore } from '../shell/prompt-store'

export interface DraftView extends PromptDraft { scope?: PromptScope; busy: boolean; error: string | null; unsaved: boolean }
type Connection = Pick<EngineClient, 'prompt'> | null
const message = (error: unknown) => error instanceof Error ? error.message : 'Could not save this draft. Keep this window open.'

/** A controller belongs to one scope, including its outstanding callback. A late
 * acknowledgement can never change another task or erase a newer draft edit. */
export class PromptDraftController {
  #view: DraftView
  #listeners = new Set<() => void>()
  #disposed = false
  constructor(readonly store: PromptStore) {
    try { this.#view = { ...store.read(), scope: store.scope, busy: false, error: null, unsaved: false } }
    catch (error) { this.#view = { revision: 0, draftRevision: 0, text: '', pending: null, scope: store.scope, busy: false, error: message(error), unsaved: true } }
  }
  getSnapshot = () => this.#view
  subscribe = (listener: () => void) => { this.#listeners.add(listener); return () => { this.#listeners.delete(listener) } }
  #update(patch: Partial<DraftView>) { this.#view = { ...this.#view, ...patch }; for (const listener of this.#listeners) listener() }
  edit = (text: string) => {
    try { this.#update({ ...this.store.edit(text, this.#view.revision), error: null, unsaved: false }) }
    catch (error) { this.#update({ text, error: message(error), unsaved: true }) }
  }
  reload = () => {
    if (this.#view.busy) return
    try { this.#update({ ...this.store.read(), error: null, unsaved: false }) }
    catch (error) { this.#update({ error: message(error), unsaved: true }) }
  }
  discard = () => { if (!this.#view.busy) this.edit('') }
  forget = () => {
    if (!this.#view.pending || this.#view.busy || this.#view.unsaved) return
    try { this.#update({ ...this.store.forget(this.#view.pending.key), error: null }) }
    catch (error) { this.#update({ error: message(error), unsaved: true }) }
  }
  submit = async (connection: Connection, mode: DeliveryMode, model?: string): Promise<boolean> => {
    if (this.#view.busy || this.#view.pending || this.#view.unsaved || !this.#view.text.trim()) return false
    try { this.#update({ ...this.store.stage(this.#view.revision, mode, model), error: null }) }
    catch (error) { this.#update({ error: message(error), unsaved: true }); return false }
    return this.retry(connection)
  }
  retry = async (connection: Connection): Promise<boolean> => {
    const pending = this.#view.pending
    if (!pending || this.#view.busy || this.#view.unsaved) return false
    try {
      const current = this.store.read()
      if (current.pending?.key !== pending.key) {
        this.#update({ ...current, error: 'This saved send changed in another window. Review the current draft before sending.' })
        return false
      }
    } catch (error) { this.#update({ error: message(error), unsaved: true }); return false }
    this.#update({ busy: true, error: null })
    let accepted = false
    try {
      // The exact persisted request is retried, including its model and key.
      // No automatic submission/replay runs on load or reconnect.
      if (!connection) throw new Error('The engine is disconnected. Retry this saved send after reconnecting.')
      const { item } = await connection.prompt({ id: this.store.scope.id, text: pending.text, mode: pending.mode, key: pending.key,
        ...(pending.model ? { model: pending.model } : {}) })
      if (!item || item.sessionID !== this.store.scope.id || item.key !== pending.key || item.text !== pending.text || item.mode !== pending.mode ||
        (pending.model !== undefined && item.model !== pending.model)) {
        throw new Error('The engine did not acknowledge this saved send. Retry to check its admission.')
      }
      const saved = this.store.settle(pending.key)
      this.#update(this.#view.unsaved ? { pending: saved.pending } : saved)
      accepted = true
    } catch (error) {
      const status = (error as { status?: number })?.status
      const rejected = typeof status === 'number' && status >= 400 && status < 500
      try {
        const saved = this.store.settle(pending.key, { status: rejected ? 'rejected' : 'uncertain', message: message(error) })
        this.#update(this.#view.unsaved ? { pending: saved.pending } : saved)
      } catch (storageError) { this.#update({ error: message(storageError), unsaved: true }) }
    } finally {
      this.#update({ busy: false })
      if (this.#disposed) this.store.close()
    }
    return accepted
  }
  dispose = () => { this.#disposed = true; if (!this.#view.busy) this.store.close() }
}
