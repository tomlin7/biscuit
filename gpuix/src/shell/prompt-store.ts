/** Local input survives even when the daemon cannot be reached. SQLite provides
 * atomic revisions across windows and FULL durability before any prompt RPC. */
import type { Database } from 'bun:sqlite'
import { chmodSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { currentEngineHome } from '../../engine/src/home'
import type { DeliveryMode } from '../../engine/src/protocol'

export interface PromptScope { cwd: string; id: string }
export interface SavedPrompt {
  key: string; text: string; mode: DeliveryMode; model?: string; draftRevision: number
  status: 'saved' | 'uncertain' | 'rejected'; error?: string
}
export interface PromptDraft {
  revision: number; draftRevision: number; text: string; pending: SavedPrompt | null
}
export interface PromptStore {
  readonly scope: PromptScope
  read(): PromptDraft
  edit(text: string, revision: number): PromptDraft
  stage(revision: number, mode: DeliveryMode, model?: string): PromptDraft
  settle(key: string, error?: { status: 'uncertain' | 'rejected'; message: string }): PromptDraft
  forget(key: string): PromptDraft
  close(): void
}
export const emptyDraft = (): PromptDraft => ({ revision: 0, draftRevision: 0, text: '', pending: null })
const bounded = (text: string) => {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 256 * 1024) throw new Error('Draft exceeds the 256 KiB limit. Shorten it before sending.')
}

export function createPromptStore(scope: PromptScope, home = currentEngineHome()): PromptStore {
  const identity = JSON.stringify([scope.cwd, scope.id])
  let database: Database | undefined
  const db = () => {
    if (database) return database
    mkdirSync(home, { recursive: true })
    const { Database } = require('bun:sqlite') as typeof import('bun:sqlite')
    const file = join(home, 'composer.db')
    const opened = new Database(file, { create: true })
    try {
      chmodSync(file, 0o600)
      opened.exec('pragma busy_timeout = 1000; pragma journal_mode = wal; pragma synchronous = full')
      const version = (opened.query('pragma user_version').get() as { user_version: number }).user_version
      if (version > 1) throw new Error('This saved draft format needs a newer Hiroshi version.')
      opened.exec(`create table if not exists draft (
        scope text primary key, revision integer not null, draft_revision integer not null,
        text text not null, pending text
      ); pragma user_version = 1`)
      database = opened
      return opened
    } catch (error) { opened.close(); throw error }
  }
  const read = (): PromptDraft => {
    const row = db().query('select revision, draft_revision, text, pending from draft where scope = ?').get(identity) as
      { revision: number; draft_revision: number; text: string; pending: string | null } | null
    if (!row) return emptyDraft()
    bounded(row.text)
    const pending = row.pending ? JSON.parse(row.pending) as SavedPrompt : null
    if (!Number.isSafeInteger(row.revision) || row.revision < 0 || !Number.isSafeInteger(row.draft_revision) || row.draft_revision < 0 ||
      (pending && (typeof pending.key !== 'string' || !/^send_[a-f0-9-]{36}$/.test(pending.key) ||
        !['queue', 'steer'].includes(pending.mode) || !['saved', 'uncertain', 'rejected'].includes(pending.status) ||
        !Number.isSafeInteger(pending.draftRevision) || pending.draftRevision < 0 ||
        (pending.model !== undefined && (typeof pending.model !== 'string' || pending.model.length > 256)) ||
        (pending.error !== undefined && (typeof pending.error !== 'string' || pending.error.length > 500))))) {
      throw new Error('Saved draft is invalid. Its file has been preserved.')
    }
    if (pending) bounded(pending.text)
    return { revision: row.revision, draftRevision: row.draft_revision, text: row.text, pending }
  }
  const change = (update: (current: PromptDraft) => void | false): PromptDraft => db().transaction(() => {
    const current = read()
    if (update(current) === false) return current
    current.revision++
    db().query('insert or replace into draft (scope, revision, draft_revision, text, pending) values (?, ?, ?, ?, ?)')
      .run(identity, current.revision, current.draftRevision, current.text, current.pending ? JSON.stringify(current.pending) : null)
    return current
  }).immediate()
  const expectRevision = (current: PromptDraft, revision: number) => {
    if (current.revision !== revision) throw new Error('This draft changed in another window. Reload the saved draft before sending.')
  }
  return {
    scope, read,
    edit: (text, revision) => { bounded(text); return change((current) => {
      expectRevision(current, revision); current.text = text; current.draftRevision++
    }) },
    stage: (revision, mode, model) => change((current) => {
      expectRevision(current, revision)
      if (current.pending) throw new Error('Resolve the saved send before sending another prompt.')
      if (!current.text.trim()) throw new Error('Write a prompt before sending.')
      current.pending = { key: `send_${randomUUID()}`, text: current.text.trim(), mode, ...(model ? { model } : {}),
        draftRevision: current.draftRevision, status: 'saved' }
    }),
    settle: (key, error) => change((current) => {
      if (current.pending?.key !== key) return false
      if (error) current.pending = { ...current.pending, status: error.status, error: error.message.slice(0, 500) }
      else {
        if (current.draftRevision === current.pending.draftRevision) { current.text = ''; current.draftRevision++ }
        current.pending = null
      }
    }),
    forget: (key) => change((current) => { if (current.pending?.key !== key) return false; current.pending = null }),
    close: () => { database?.close(); database = undefined },
  }
}
