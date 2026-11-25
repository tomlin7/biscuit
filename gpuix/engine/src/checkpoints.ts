/** Git owns checkpoint content; SQLite journals which conversation owns it. */
import { randomUUID, createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmdirSync, symlinkSync, unlinkSync, openSync, writeFileSync, fsyncSync, closeSync, chmodSync } from 'node:fs'
import path from 'node:path'
import { conflict, invalid, notFound } from './errors'
import { assertWorkspace } from './projects'
import type { Checkpoint, GitEntry, InboxItem, Rewind } from './protocol'
import type { Store } from './store'

function workspacePath(cwd: string): string {
  let value: string
  try { value = realpathSync(cwd) } catch { value = path.resolve(cwd) }
  return process.platform === 'win32' ? value.toLowerCase() : value
}
function overlaps(left: string, right: string): boolean {
  const a = workspacePath(left), b = workspacePath(right)
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep)
}

const same = (a: GitEntry | null, b: GitEntry | null) => a?.mode === b?.mode && a?.hash === b?.hash

/** Independent object database/index: never stages or resets the user's repo. */
export class WorkspaceTrees {
  readonly directory: string
  readonly root: string
  readonly env: Record<string, string>
  constructor(readonly home: string, cwd: string) {
    this.root = realpathSync(cwd)
    this.directory = path.join(home, 'checkpoints', createHash('sha256').update(this.root).digest('hex') + '.git')
    this.env = Object.fromEntries(Object.entries(process.env).filter(([name, value]) => !name.toUpperCase().startsWith('GIT_') && value !== undefined)) as Record<string, string>
    Object.assign(this.env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
      GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'Hiroshi', GIT_AUTHOR_EMAIL: 'checkpoint@hiroshi.local',
      GIT_COMMITTER_NAME: 'Hiroshi', GIT_COMMITTER_EMAIL: 'checkpoint@hiroshi.local' })
    if (!existsSync(this.directory)) {
      mkdirSync(path.dirname(this.directory), { recursive: true })
      const result = Bun.spawnSync({ cmd: ['git', 'init', '--bare', '--object-format=sha1', this.directory], env: this.env, windowsHide: true, stdout: 'pipe', stderr: 'pipe', timeout: 8000, maxBuffer: 1024 * 1024 })
      if (result.exitCode !== 0) throw invalid('checkpoint_git', 'Git is required to create workspace checkpoints')
    }
    // Preserve exact workspace bytes even when project attributes normalize
    // line endings, expand identifiers or configure external clean filters.
    mkdirSync(path.join(this.directory, 'info'), { recursive: true })
    writeFileSync(path.join(this.directory, 'info', 'attributes'), '* -text -filter -ident -working-tree-encoding\n')
  }

  git(args: string[], input?: Uint8Array): Buffer {
    const result = Bun.spawnSync({ cmd: ['git', '--git-dir', this.directory, '--work-tree', this.root,
      '-c', 'core.autocrlf=false', '-c', 'core.fsync=all', '-c', 'core.fsmonitor=false',
      '-c', `core.hooksPath=${path.join(this.home, 'checkpoints', 'no-hooks')}`, ...args],
      cwd: this.root, env: this.env, stdin: input, stdout: 'pipe', stderr: 'pipe', windowsHide: true, timeout: 8000, maxBuffer: 96 * 1024 * 1024 })
    if (result.exitCode !== 0) throw invalid('checkpoint_git', 'Git could not complete the checkpoint operation; workspace and conversation were not advanced')
    return Buffer.from(result.stdout)
  }

  capture(id: string): { commit: string; tree: string; ref: string } {
    // Start empty: ignored files must not remain tracked merely because an
    // earlier snapshot saw them before an ignore rule was added.
    this.git(['read-tree', '--empty'])
    const excluded = ['.git', '**/.git']
    const relative = path.relative(this.root, path.resolve(this.home))
    if (!relative) excluded.push('engine.db*', 'engine.json', 'engine.lock', 'logs', 'tool-results', 'checkpoints', 'providers.json', 'tools.json', 'execution.json')
    else if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) excluded.push(relative.split(path.sep).join('/'))
    this.git(['add', '-A', '--', '.', ...excluded.map((name) => `:(exclude)${name}`)])
    const tree = this.git(['write-tree']).toString().trim()
    this.entries(tree) // Reject unsupported entries before publishing a checkpoint.
    const commit = this.git(['commit-tree', tree, '-m', `Hiroshi checkpoint ${id}`]).toString().trim()
    const ref = `refs/hiroshi/checkpoints/${id}`
    this.git(['update-ref', ref, commit])
    return { commit, tree, ref }
  }

  entries(tree: string): Map<string, GitEntry> {
    if (!/^[0-9a-f]{40,64}$/.test(tree)) throw invalid('checkpoint_tree', 'invalid checkpoint tree')
    const result = new Map<string, GitEntry>()
    const raw = this.git(['ls-tree', '-rlz', tree])
    const decoded = raw.toString('utf8')
    if (!Buffer.from(decoded).equals(raw)) throw invalid('checkpoint_path', 'checkpoint filenames must use valid UTF-8')
    let total = 0
    for (const record of decoded.split('\0')) {
      if (!record) continue
      const split = record.indexOf('\t')
      const [mode, type, hash, length] = record.slice(0, split).trim().split(/\s+/)
      const name = record.slice(split + 1)
      this.target(name)
      if (type !== 'blob' || !['100644', '100755', '120000'].includes(mode!)) {
        throw invalid('checkpoint_entry', 'nested repositories and submodules are not supported by checkpoints')
      }
      total += Number(length)
      if (!Number.isSafeInteger(total) || total > 128 * 1024 * 1024) throw invalid('checkpoint_size', 'checkpoint contents exceed the 128 MiB workspace limit; ignore generated or large files before retrying')
      result.set(name, { mode: mode!, hash: hash! })
    }
    return result
  }

  target(name: string): string {
    const parts = name.split('/')
    if (!name || parts.some((part) => !part || part === '.' || part === '..' || part.toLowerCase() === '.git' || /[\\:\0]/.test(part) || /[. ]$/.test(part))) {
      throw invalid('checkpoint_path', 'checkpoint contains an unsafe workspace path')
    }
    const target = path.resolve(this.root, ...parts)
    const relative = path.relative(this.root, target)
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw invalid('checkpoint_path', 'checkpoint path escaped the workspace')
    return target
  }

  plan(before: string, after: string): Rewind['plan'] {
    const old = this.entries(before)
    const next = this.entries(after)
    return [...new Set([...old.keys(), ...next.keys()])].sort().flatMap((name) => {
      const a = old.get(name) ?? null, b = next.get(name) ?? null
      return same(a, b) ? [] : [{ path: name, before: a, after: b }]
    })
  }

  /** Validate the whole plan before touching any file. Recovery accepts only
   * the saved or desired contents, never overwriting an unrelated later edit. */
  validate(plan: Rewind['plan'], operationID?: string): void {
    const known = new Set(plan.map((entry) => entry.path))
    if (operationID) for (const entry of plan.filter((entry) => entry.after)) {
      known.add(path.relative(this.root, this.temporary(entry.path, operationID)).split(path.sep).join('/'))
    }
    const removing = new Set(plan.filter((entry) => entry.before).map((entry) => entry.path))
    const walk = (directory: string, prefix: string): void => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        const name = `${prefix}/${item.name}`
        const target = this.target(name)
        if (item.isDirectory() && !item.isSymbolicLink()) walk(target, name)
        else if (!known.has(name)) throw conflict('rewind_obstruction', 'an ignored or unsnapshotted file would be overwritten; move it before retrying the rewind')
      }
    }
    for (const entry of plan) {
      const target = this.target(entry.path)
      let blockedParent = false
      const parents = entry.path.split('/').slice(0, -1)
      for (let i = 1; i <= parents.length; i++) {
        const name = parents.slice(0, i).join('/')
        try {
          const info = lstatSync(this.target(name))
          if (info.isSymbolicLink() || !info.isDirectory()) {
            if (!removing.has(name)) throw conflict('rewind_obstruction', 'a parent path changed or points outside the workspace')
            blockedParent = true
            break
          }
        } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error }
      }
      if (blockedParent) continue
      let info
      try { info = lstatSync(target) } catch (error) {
        if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) continue
        throw error
      }
      if (info.isDirectory() && !info.isSymbolicLink()) { walk(target, entry.path); continue }
      if (!info.isSymbolicLink() && !info.isFile()) throw conflict('rewind_obstruction', 'a special file obstructs the rewind')
      const bytes = info.isSymbolicLink() ? Buffer.from(readlinkSync(target)) : readFileSync(target)
      const hash = createHash((entry.before ?? entry.after)!.hash.length === 64 ? 'sha256' : 'sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
      const mode = info.isSymbolicLink() ? '120000' : process.platform !== 'win32' && (info.mode & 0o111) ? '100755' : '100644'
      const equal = (value: GitEntry | null) => value?.hash === hash && (process.platform === 'win32' && value.mode !== '120000' ? mode !== '120000' : value.mode === mode)
      if (!equal(entry.before) && !equal(entry.after)) throw conflict('rewind_changed', 'the workspace changed since this rewind began; later edits were preserved')
    }
  }

  temporary(name: string, operationID: string): string {
    return path.join(path.dirname(this.target(name)), `.hiroshi-rewind-${operationID}-${createHash('sha256').update(name).digest('hex').slice(0, 12)}.tmp`)
  }

  apply(plan: Rewind['plan'], operationID: string): void {
    if (!/^[a-zA-Z0-9_-]+$/.test(operationID)) throw invalid('rewind_id', 'invalid rewind identity')
    // Load every desired blob before effects. The batch protocol preserves raw
    // bytes and avoids starting one Git process per restored file.
    const hashes = [...new Set(plan.flatMap((entry) => entry.after ? [entry.after.hash] : []))]
    const blobs = new Map<string, Buffer>()
    if (hashes.length) {
      const data = this.git(['cat-file', '--batch'], Buffer.from(hashes.join('\n') + '\n'))
      let offset = 0
      for (const hash of hashes) {
        const end = data.indexOf(10, offset)
        const [actual, type, length] = data.subarray(offset, end).toString().split(' ')
        const size = Number(length)
        if (end < 0 || actual !== hash || type !== 'blob' || !Number.isSafeInteger(size) || size < 0 || end + size + 2 > data.length) {
          throw invalid('checkpoint_blob', 'a saved workspace blob is unavailable')
        }
        blobs.set(hash, data.subarray(end + 1, end + 1 + size))
        offset = end + size + 2
      }
    }
    this.validate(plan, operationID)
    // Remove only enumerated saved files. Never recursively delete a directory.
    for (const entry of [...plan].sort((a, b) => b.path.length - a.path.length)) {
      const target = this.target(entry.path)
      // A parent symlink scheduled for removal must never be followed.
      if (entry.path.split('/').slice(0, -1).some((_, i, parts) => {
        try { return lstatSync(this.target(parts.slice(0, i + 1).join('/'))).isSymbolicLink() } catch { return false }
      })) continue
      try { const info = lstatSync(target); if (!info.isDirectory() || info.isSymbolicLink()) unlinkSync(target) }
      catch (error) { if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error }
    }
    const empty = (directory: string): void => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        if (item.isDirectory() && !item.isSymbolicLink()) empty(path.join(directory, item.name))
      }
      rmdirSync(directory) // A remaining ignored file makes this fail safely.
    }
    for (const entry of plan.filter((entry) => entry.after).sort((a, b) => a.path.length - b.path.length)) {
      const target = this.target(entry.path)
      try { if (lstatSync(target).isDirectory()) empty(target) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      mkdirSync(path.dirname(target), { recursive: true })
      const bytes = blobs.get(entry.after!.hash)!
      if (entry.after!.mode === '120000') symlinkSync(bytes.toString('utf8'), target)
      else {
        const temporary = this.temporary(entry.path, operationID)
        try {
          // This reserved sibling belongs to the durable rewind identity. A
          // crash during writing may leave it partial; recovery replaces it.
          try { unlinkSync(temporary) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
          const fd = openSync(temporary, 'wx', entry.after!.mode === '100755' ? 0o755 : 0o644)
          try { writeFileSync(fd, bytes); fsyncSync(fd) } finally { closeSync(fd) }
          renameSync(temporary, target)
          if (process.platform !== 'win32') chmodSync(target, entry.after!.mode === '100755' ? 0o755 : 0o644)
        } finally { try { unlinkSync(temporary) } catch {} }
      }
    }
  }
}

export class Checkpoints {
  constructor(readonly store: Store, readonly home: string) {}
  busy: ((sessionID: string) => boolean) | null = null

  blocked(sessionID: string, override?: string): boolean {
    const session = this.store.session(sessionID)
    const cwd = override && session ? path.resolve(session.cwd, override) : session?.cwd
    return this.store.rewinds().some((rewind) => rewind.state === 'pending' && !!cwd && overlaps(this.store.session(rewind.sessionID)!.cwd, cwd))
  }

  assertReady(sessionID: string, cwd?: string): void {
    if (this.blocked(sessionID) || (cwd && this.blocked(sessionID, cwd))) throw conflict('rewind_pending', 'a workspace rewind needs recovery before new work can run')
  }

  prepare(sessionID: string, item: InboxItem): Checkpoint {
    this.assertReady(sessionID)
    return this.#capture(sessionID, 'prompt', item.text, item.id)
  }

  #capture(sessionID: string, kind: Checkpoint['kind'], label: string, promptID: string | null): Checkpoint {
    assertWorkspace(this.store, sessionID)
    const session = this.store.session(sessionID)
    if (!session) throw notFound('session')
    const id = `checkpoint_${randomUUID()}`
    const trees = new WorkspaceTrees(this.home, session.cwd)
    return { id, sessionID, kind, promptID, label: label.slice(0, 120), cwd: trees.root, ...trees.capture(id),
      messageIDs: this.store.activeMessages(sessionID).map((message) => message.id), at: Date.now() }
  }

  restore(sessionID: string, checkpointID: string, key: string): Rewind {
    assertWorkspace(this.store, sessionID)
    if (typeof checkpointID !== 'string' || !checkpointID) throw invalid('bad_checkpoint', 'checkpointID is required')
    if (typeof key !== 'string' || !key.trim() || key.length > 128) throw invalid('bad_key', 'rewind requires an idempotency key up to 128 characters')
    const existing = this.store.rewinds(sessionID).find((rewind) => rewind.key === key)
    if (existing) {
      if (existing.checkpointID !== checkpointID) throw conflict('rewind_key', 'this key already names a different rewind')
      return existing.state === 'completed' ? existing : this.#complete(existing)
    }
    this.assertReady(sessionID)
    const checkpoint = this.store.checkpoint(checkpointID)
    if (!checkpoint || checkpoint.sessionID !== sessionID) throw notFound('checkpoint')
    const cwd = realpathSync(this.store.session(sessionID)!.cwd)
    if (cwd !== checkpoint.cwd) throw conflict('checkpoint_workspace', 'the workspace location changed since this checkpoint')
    if (this.store.runningRuns().some((run) => overlaps(run.cwd, cwd))) throw conflict('workspace_busy', 'stop active workspace commands before rewinding')
    for (const other of this.store.sessions()) {
      if (overlaps(other.cwd, cwd) && this.busy?.(other.id)) {
        throw conflict('workspace_busy', 'stop active commands, model calls and tool turns in this workspace before rewinding')
      }
    }
    const safety = this.#capture(sessionID, 'safety', 'Before rewind', null)
    const trees = new WorkspaceTrees(this.home, cwd)
    const plan = trees.plan(safety.tree, checkpoint.tree)
    trees.validate(plan)
    this.store.record({ type: 'checkpoint.created', sessionID, data: { checkpoint: safety }, project: () => this.store.insertCheckpoint(safety) })
    const rewind: Rewind = { id: `rewind_${randomUUID()}`, sessionID, checkpointID, safetyCheckpointID: safety.id,
      key, state: 'pending', plan, error: null, at: Date.now(), completedAt: null }
    for (const entry of plan.filter((entry) => entry.after)) {
      if (existsSync(trees.temporary(entry.path, rewind.id))) throw conflict('rewind_obstruction', 'a reserved rewind temporary path is already occupied')
    }
    this.store.record({ type: 'rewind.started', sessionID, data: { rewind }, project: () => this.store.putRewind(rewind) })
    return this.#complete(rewind)
  }

  recover(): void {
    for (const rewind of this.store.rewinds().filter((rewind) => rewind.state === 'pending')) {
      try { this.#complete(rewind) } catch { /* The durable error and lock remain visible; an API retry can recover. */ }
    }
  }

  #complete(rewind: Rewind): Rewind {
    assertWorkspace(this.store, rewind.sessionID)
    try {
      const checkpoint = this.store.checkpoint(rewind.checkpointID)!
      const trees = new WorkspaceTrees(this.home, checkpoint.cwd)
      if (trees.root !== checkpoint.cwd) throw conflict('checkpoint_workspace', 'the workspace location changed since this checkpoint')
      trees.apply(rewind.plan, rewind.id)
      const message = this.store.newMessage(rewind.sessionID, 'system', `Rewound workspace and conversation to checkpoint ${checkpoint.id}. Earlier turns remain in history.`, Date.now())
      message.rewindID = rewind.id
      const activeMessageIDs = [...checkpoint.messageIDs, message.id]
      const cancelledInboxIDs = this.store.inbox(rewind.sessionID, 'pending').map((item) => item.id)
      const done: Rewind = { ...rewind, state: 'completed', error: null, completedAt: Date.now() }
      this.store.record({ type: 'rewind.completed', sessionID: rewind.sessionID, data: { rewind: done, message, activeMessageIDs, cancelledInboxIDs },
        project: () => {
          this.store.insertMessage(message)
          this.store.setConversationView(rewind.sessionID, checkpoint.messageIDs, message.seq)
          this.store.cancelPendingInbox(rewind.sessionID)
          this.store.putRewind(done)
          this.store.touchSession(rewind.sessionID, message.at)
        } })
      return done
    } catch (error) {
      const failed: Rewind = { ...rewind, error: error instanceof Error ? error.message : 'the rewind could not finish' }
      this.store.record({ type: 'rewind.failed', sessionID: rewind.sessionID, data: { rewind: failed }, project: () => this.store.putRewind(failed) })
      throw conflict('rewind_pending', 'the rewind is incomplete; workspace work is paused and the saved state remains available for recovery')
    }
  }
}
