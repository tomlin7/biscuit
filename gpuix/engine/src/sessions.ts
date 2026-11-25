/**
 * Sessions: the durable unit a client attaches to.
 *
 * Creating one and prompting one are both recorded facts, not rows inserted
 * behind the client's back. A prompt is admitted to the session's inbox first
 * (see `Inbox`); delivery to the transcript happens at a safe boundary, not
 * when the request arrives.
 *
 * The title is derived once from the first admitted prompt so the sidebar has
 * something to show, and it is never derived again.
 */

import { existsSync, mkdirSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { currentEngineHome } from './home'
import path from 'node:path'

import { invalid, notFound } from './errors'
import { directory, project, assertWorkspace } from './projects'
import { Inbox, type Admitted } from './inbox'
import type { Logger } from './log'
import type { CreateSessionRequest, PromptRequest, Session, SessionDetail } from './protocol'
import type { Store } from './store'

const DEFAULT_TITLE = 'New task'
const TITLE_LIMIT = 64

function newSessionID(): string {
  return `ses_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function titleFromText(text: string): string {
  const firstLine = text.trim().split(/\r?\n/, 1)[0]?.trim() ?? ''
  if (!firstLine) return DEFAULT_TITLE
  return firstLine.length > TITLE_LIMIT ? `${firstLine.slice(0, TITLE_LIMIT - 1)}…` : firstLine
}

export class Sessions {
  readonly #store: Store
  readonly #log: Logger
  readonly #defaultCwd: string
  readonly #inbox: Inbox
  readonly #scratchRoot: string

  constructor(store: Store, log: Logger, defaults: { cwd: string; inbox?: Inbox; home?: string }) {
    this.#store = store
    this.#log = log.child('sessions')
    this.#defaultCwd = defaults.cwd
    this.#inbox = defaults.inbox ?? new Inbox(store, log)
    this.#scratchRoot = path.join(defaults.home ?? currentEngineHome(), 'workspaces', 'scratch')
    for (const session of store.sessions()) {
      if (session.workspaceIdentity) continue
      try {
        const observed = directory(session.cwd)
        store.record({ type: 'session.updated', sessionID: session.id, data: { session: { ...session, cwd: observed.cwd, workspaceIdentity: observed.identity } },
          project: () => store.bindWorkspace(session.id, observed.identity, observed.cwd) })
      } catch {
        // Do not adopt an unrelated folder that later appears at this path.
        store.record({ type: 'session.updated', sessionID: session.id, data: { session: { ...session, workspaceIdentity: 'unavailable-at-upgrade' } },
          project: () => store.bindWorkspace(session.id, 'unavailable-at-upgrade') })
      }
    }
  }

  create(input: CreateSessionRequest = {}): Session {
    if (input.projectless !== undefined && typeof input.projectless !== 'boolean') throw invalid('projectless', 'projectless must be a boolean')
    let requested = input.cwd || this.#defaultCwd
    if (input.projectless) {
      requested = path.join(this.#scratchRoot, randomUUID())
      mkdirSync(requested, { recursive: true, mode: 0o700 })
    }
    let observed: ReturnType<typeof directory>
    try { observed = directory(path.resolve(requested)) }
    catch { throw invalid('bad_working_directory', 'Choose an existing folder that you can read.') }
    const workspaceIdentity = observed.identity
    // Windows can report both a DOS short path and a long path for one folder.
    // Prefer the already bound spelling while that directory still exists.
    const existing = this.#store.sessions().find((session) => session.workspaceIdentity === workspaceIdentity && project(session).status === 'ready')
    const cwd = existing?.cwd ?? observed.cwd
    if (input.reuseWorkspace === true) {
      if (existing) return existing
    }
    if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
      throw invalid('bad_working_directory', `${cwd} is not a directory`)
    }

    const at = Date.now()
    const id = newSessionID()
    const title = input.title?.trim() || DEFAULT_TITLE
    const session = { id, title, cwd, workspaceIdentity, createdAt: at, updatedAt: at, ...(input.projectless ? { projectless: true } : {}) }

    this.#store.record({
      type: 'session.created',
      sessionID: id,
      data: { session: { ...session, runs: 0, running: 0, lastRunAt: null } },
      at,
      project: () => this.#store.createSession(session),
    })

    this.#log.info('session created', { session: id, cwd })
    return this.#store.session(id)!
  }

  list(): Session[] {
    return this.#store.sessions()
  }

  projects() {
    const seen = new Set<string>()
    return this.list().filter((session) => {
      if (session.projectless) return false
      const key = `${session.cwd}\0${session.workspaceIdentity ?? ''}`
      if (seen.has(key)) return false
      seen.add(key); return true
    }).map(project)
  }

  detail(id: string): SessionDetail {
    const detail = this.#store.snapshot(id)
    if (!detail) throw notFound('session')
    return detail
  }

  /**
   * Admit a prompt and, if the session is idle, deliver it.
   *
   * The title is renamed inside the admission transaction when this is the
   * first prompt the session has ever been given. A retry of an already
   * admitted prompt is a no-op and does not rename anything.
   */
  prompt(id: string, input: PromptRequest): Admitted {
    const session = this.#store.session(id)
    if (!session) throw notFound('session')
    // A replayed admission is still the same operation when a folder is gone.
    if (!input.key || !this.#store.inboxByKey(id, input.key)) assertWorkspace(this.#store, id)

    const rename = session.title === DEFAULT_TITLE ? titleFromText(input.text ?? '') : null
    const admitted = this.#inbox.admit(
      id,
      input,
      rename && rename !== DEFAULT_TITLE ? (at) => this.#store.renameSession(id, rename, at) : undefined,
    )

    // The rename happened inside the admission transaction, so the row is read
    // back rather than the new title being invented a second time.
    const updated = this.#store.session(id)
    if (updated && updated.title !== session.title) {
      this.#store.record({
        type: 'session.updated',
        sessionID: id,
        data: { session: updated },
        at: admitted.item.admittedAt,
      })
    }

    return admitted
  }
}
