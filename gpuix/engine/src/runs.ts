/**
 * Runs: a command the engine owns.
 *
 * A run is durable before it has any effect. The row and the `run.started`
 * event commit first, then the process is spawned. A spawn failure is a
 * recorded failure, not an exception that leaves the database believing a
 * command is running.
 *
 * Output is written in batches: one durable event and one projection row per
 * batch, so a chatty command cannot turn into one transaction per line. The
 * stored output is bounded; a command that floods the terminal is marked
 * truncated instead of filling the disk.
 *
 * A claimed command becomes interrupted on restart. A command that was only
 * queued retains its deadline and argv and may acquire its first claim.
 */

import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import { invalid, notFound } from './errors'
import type { Logger } from './log'
import type { OutputStream, Run, RunStatus, ToolCall, ToolStatus } from './protocol'
import { resolveShell } from './shell'
import type { Store } from './store'
import { ExecutionBudget, ExecutionError } from './execution'
import { spawnOwned } from './process'
import { assertWorkspace } from './projects'

/** Per run. Past this the output stops being stored and the run is marked. */
const DEFAULT_OUTPUT_LIMIT = Number(process.env.HIROSHI_OUTPUT_LIMIT) || 512 * 1024
/** How often a partial batch is flushed while a command keeps writing. */
const FLUSH_MS = 40
/** A batch is also flushed early once it is this large. */
const FLUSH_CHARS = 8 * 1024

interface Proc {
  terminateTree?: () => void
  pid: number
  readonly exited: Promise<number>
  readonly stdout: ReadableStream<Uint8Array>
  readonly stderr: ReadableStream<Uint8Array>
  kill(signal?: string | number): void
}

interface ActiveRun {
  abortStatus?: RunStatus
  abortReason?: string
  run: Run
  proc: Proc
  cancelled: boolean
}

function newRunID(): string {
  return `run_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function newToolCallID(): string {
  return `tool_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function toolStatusFor(status: RunStatus): ToolStatus {
  switch (status) {
    case 'running':
      return 'running'
    case 'succeeded':
      return 'succeeded'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    case 'interrupted':
      return 'interrupted'
  }
}

/**
 * The reason a tool call carries. A command that ran and exited non-zero is a
 * failure with the exit code as its reason; a spawn failure or a stop carries
 * the sentence the run itself recorded.
 */
function toolErrorFor(run: Run, status: RunStatus): string | null {
  if (run.error) return run.error
  if (status === 'failed') return run.exitCode === null ? 'the command failed' : `exit code ${run.exitCode}`
  if (status === 'cancelled') return 'the command was cancelled'
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Stop the process and everything it started. */
export function killTree(proc: Proc): void {
  if (proc.terminateTree) { proc.terminateTree(); return }
  if (process.platform === 'win32') {
    try {
      Bun.spawnSync({
        cmd: ['taskkill', '/pid', String(proc.pid), '/t', '/f'],
        stdio: ['ignore', 'ignore', 'ignore'],
        windowsHide: true,
      })
      return
    } catch {
      // Fall through to the plain signal if taskkill is unavailable.
    }
  }
  try {
    proc.kill('SIGTERM')
  } catch {
    // Already gone.
  }
  const timer = setTimeout(() => {
    try {
      proc.kill('SIGKILL')
    } catch {
      // Already gone.
    }
  }, 2000)
  ;(timer as unknown as { unref?: () => void }).unref?.()
}

export class Runs {
  readonly #store: Store
  readonly #log: Logger
  readonly #active = new Map<string, ActiveRun>()
  readonly #limit: number
  readonly #onIdle: ((sessionID: string) => void) | undefined
  readonly #budget?: ExecutionBudget
  readonly #controllers = new Map<string, AbortController>()
  #stopping = false

  constructor(store: Store, log: Logger, options: { budget?: ExecutionBudget; outputLimit?: number; onIdle?: (sessionID: string) => void } = {}) {
    this.#store = store
    this.#log = log.child('runs')
    this.#limit = options.outputLimit ?? DEFAULT_OUTPUT_LIMIT
    this.#onIdle = options.onIdle
    this.#budget = options.budget
  }

  /** The number of commands currently executing, for status output and tests. */
  get active(): number {
    return this.#active.size
  }

  startProgram(sessionID: string, label: string, commands: string[][], cwd?: string): Run {
    if (!commands.length || commands.some((command) => !command.length)) throw invalid('empty_command', 'a program is required')
    return this.start(sessionID, label, cwd, commands)
  }

  start(sessionID: string, command: string, cwd?: string, programs?: string[][]): Run {
    const trimmed = command.trim()
    if (!trimmed) throw invalid('empty_command', 'a command is required')

    const session = this.#store.session(sessionID)
    if (!session) throw notFound('session')

    const target = cwd ? path.resolve(session.cwd, cwd) : session.cwd
    if (!existsSync(target) || !statSync(target).isDirectory()) {
      throw invalid('bad_working_directory', `${target} is not a directory`)
    }

    const shell = programs ? { label: programs[0]![0]!, argv: [] } : resolveShell()
    const at = Date.now()
    const run: Run = {
      id: newRunID(),
      sessionID,
      command: trimmed,
      cwd: target,
      shell: shell.label,
      status: 'running',
      exitCode: null,
      error: null,
      startedAt: at,
      endedAt: null,
    }
    const toolCall: ToolCall = {
      id: newToolCallID(),
      sessionID,
      stepID: null,
      runID: run.id,
      tool: 'shell',
      input: trimmed,
      status: 'running',
      error: null,
      createdAt: at,
      endedAt: null,
    }

    // Durable before the effect. The tool call and the run commit together,
    // before the process exists, so a crash leaves a call that names exactly
    // what was about to touch the workspace. If the process cannot start, the
    // failure is recorded below against a run that already exists.
    this.#store.record({
      type: 'run.started',
      sessionID,
      runID: run.id,
      data: { run, toolCall },
      at,
      project: () => {
        this.#store.insertRun(run)
        this.#store.saveCommand(run.id, programs ?? [[...shell.argv, trimmed]], !!programs)
        this.#store.insertToolCall(toolCall)
        this.#store.touchSession(sessionID, at)
      },
    })

    this.#launch(run, programs ?? [[...shell.argv, trimmed]], !!programs)
    return run
  }

  /** Only never-admitted commands may cross a restart. Claimed effects never do. */
  resumeQueued(): void {
    if (!this.#budget) return
    for (const run of this.#store.runningRuns()) {
      const execution = this.#store.execution(run.id)
      const payload = this.#store.queuedCommand(run.id)
      if (payload && (!execution || execution.state === 'queued')) this.#launch(run, payload.commands, payload.program)
    }
  }

  #launch(run: Run, commands: string[][], program: boolean): void {
    if (this.#stopping || this.#controllers.has(run.id)) return
    const controller = new AbortController()
    this.#controllers.set(run.id, controller)
    const effect = async (signal: AbortSignal) => {
      signal.throwIfAborted()
      assertWorkspace(this.#store, run.sessionID)
      if (this.#store.run(run.id)?.status !== 'running') throw new Error('the command already ended')
      const env = program ? { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0' } : process.env
      const proc = spawnOwned({ cmd: commands[0]!, cwd: run.cwd, env, limits: this.#budget?.limits })
      const abort = () => {
        const reason = signal.reason
        const active = this.#active.get(run.id)
        if (active) {
          active.cancelled = true
          active.abortStatus = reason instanceof ExecutionError && reason.code !== 'execution_cancelled' ? 'failed' : 'cancelled'
          active.abortReason = reason instanceof Error ? reason.message : 'the command was cancelled'
        }
        killTree(active?.proc ?? proc)
      }
      signal.addEventListener('abort', abort, { once: true })
      this.#active.set(run.id, { run, proc, cancelled: false })
      try {
        if (signal.aborted) abort()
        await this.#execute(run, proc, commands.slice(1))
        if (this.#store.run(run.id)?.status === 'failed') throw new Error(this.#store.run(run.id)?.error ?? 'the command failed')
      } finally { signal.removeEventListener('abort', abort) }
    }
    const work = this.#budget ? this.#budget.execute({ id: run.id, sessionID: run.sessionID, kind: 'command' }, controller.signal, effect) : effect(controller.signal)
    void work.catch((error) => {
      if (this.#stopping || this.#store.run(run.id)?.status !== 'running') return
      const reason = `the command could not finish: ${String(error)}`
      this.#write(run, 'stderr', `hiroshi-engine: ${reason}\n`)
      this.#finish(run, controller.signal.aborted ? 'cancelled' : 'failed', null, { error: reason })
      this.#log.error('command failed', { run: run.id, error: String(error) })
    }).finally(() => this.#controllers.delete(run.id))
  }

  /** Queued cancellation is immediate; active cancellation waits for exit. */
  cancel(runID: string): Run {
    const run = this.#store.run(runID)
    if (!run) throw notFound('run')
    const active = this.#active.get(runID)
    if (!active) {
      this.#controllers.get(runID)?.abort(new ExecutionError('execution_cancelled', 'the command was cancelled'))
      this.#finish(run, 'cancelled', null, { error: 'the command was cancelled' })
      return this.#store.run(runID) ?? run
    }
    active.cancelled = true
    this.#controllers.get(runID)?.abort(new ExecutionError('execution_cancelled', 'the command was cancelled'))
    this.#log.info('run cancel requested', { run: runID, pid: active.proc.pid })
    killTree(active.proc)
    return run
  }

  /**
   * Stop every run a session is holding, as one decision by the operator.
   *
   * The end row is written before the kill, so the database never claims a
   * stopped command is still going even if the process dies immediately after.
   * The inbox is untouched: pending input survives the interruption, and the
   * boundary this creates is what delivers it to the transcript.
   */
  interrupt(sessionID: string, reason?: string): Run[] {
    const session = this.#store.session(sessionID)
    if (!session) throw notFound('session')

    const why = (reason ?? '').trim()
    if (why.length > 200) throw invalid('bad_reason', 'the reason is longer than 200 characters')
    const note = why
      ? `hiroshi-engine: the operator stopped this command: ${why}`
      : 'hiroshi-engine: the operator stopped this command'

    const stopped: Run[] = []
    for (const run of this.#store.runningRuns(sessionID)) {
      const active = this.#active.get(run.id)
      this.#controllers.get(run.id)?.abort(new ExecutionError('execution_cancelled', note))
      if (active) active.cancelled = true
      this.#write(run, 'stderr', `${note}\n`)
      this.#finish(run, 'cancelled', null, { error: note })
      if (active) killTree(active.proc)
      stopped.push(this.#store.run(run.id) ?? run)
    }

    if (stopped.length > 0) {
      this.#log.info('session interrupted', { session: sessionID, runs: stopped.length, reason: why || null })
    } else {
      this.#log.info('interrupt found nothing running', { session: sessionID })
    }
    return stopped
  }

  /**
   * Settle every run the previous process left behind. Called once on startup
   * and once on shutdown, and safe to call twice: a run is only settled while
   * it is still `running`.
   */
  settleInterrupted(note: string): number {
    const stale = this.#store.runningRuns().filter((run) => {
      const execution = this.#store.execution(run.id)
      return !this.#budget || !this.#store.queuedCommand(run.id) || (execution && execution.state !== 'queued')
    })
    for (const run of stale) {
      const at = Date.now()
      this.#write(run, 'stderr', `${note}\n`)
      this.#finish(run, 'interrupted', null, { at, error: note })
    }
    if (stale.length > 0) this.#log.warn('settled interrupted runs', { runs: stale.length })
    return stale.length
  }

  /**
   * End every run the daemon is still holding, then kill the children.
   *
   * A shutdown the operator asked for is not an accident: each held run ends as
   * `cancelled`, with a line that says why, and the row is written before the
   * kill so it is on disk even if the process goes away immediately after. The
   * next start then finds nothing to guess about.
   */
  async stopAll(note = 'hiroshi-engine: the engine was shut down while this command was running'): Promise<void> {
    this.#stopping = true
    const active = [...this.#active.values()]
    for (const entry of active) {
      entry.cancelled = true
      this.#write(entry.run, 'stderr', `${note}\n`)
      this.#finish(entry.run, 'cancelled', null, { error: note })
      killTree(entry.proc)
    }
    this.#active.clear()
    if (active.length > 0) {
      // Let the children die, but never hang the shutdown on one that will not.
      await Promise.race([Promise.all(active.map((entry) => entry.proc.exited)), sleep(1500)])
    }
  }

  // -- internals -----------------------------------------------------------

  #write(run: Run, stream: OutputStream, text: string): void {
    const at = Date.now()
    this.#store.record({
      type: 'run.output',
      sessionID: run.sessionID,
      runID: run.id,
      at,
      data: { runID: run.id, stream, data: text },
      project: () => {
        this.#store.appendChunk(run.id, stream, text, at)
      },
    })
  }

  #truncate(run: Run): void {
    this.#store.record({
      type: 'run.truncated',
      sessionID: run.sessionID,
      runID: run.id,
      data: { runID: run.id, limit: this.#limit },
    })
  }

  #finish(
    run: Run,
    status: RunStatus,
    exitCode: number | null,
    options: { at?: number; error?: string } = {},
  ): void {
    const at = options.at ?? Date.now()
    const error = options.error ?? null
    const current = this.#store.run(run.id)
    if (!current || current.status !== 'running') return
    const ended: Run = { ...current, status, exitCode, error, endedAt: at }

    // The call and the run end in one transaction. A crash cannot leave a run
    // that finished next to a tool call that still claims to be running.
    const call = this.#store.toolCallForRun(run.id)
    const endedCall: ToolCall | null = call
      ? { ...call, status: toolStatusFor(status), error: toolErrorFor(ended, status), endedAt: at }
      : null

    this.#store.record({
      type: 'run.ended',
      sessionID: run.sessionID,
      runID: run.id,
      data: { run: ended, toolCall: endedCall },
      at,
      project: () => {
        this.#store.finishRun(run.id, status, exitCode, at, error)
        if (endedCall) this.#store.updateToolCall(endedCall)
        this.#store.touchSession(run.sessionID, at)
      },
    })
    this.#log.info('run ended', { run: run.id, status, exitCode })
    // The boundary: a run just ended, so the session may be idle again. The
    // inbox decides whether anything may be delivered; it reads the database,
    // not `#active`, which still holds this run until `#execute` unwinds.
    this.#onIdle?.(run.sessionID)
  }

  async #execute(run: Run, proc: Proc, remaining: string[][] = []): Promise<void> {
    const buffers: Record<OutputStream, string> = { stdout: '', stderr: '' }
    let stored = 0
    let truncated = false

    const flush = (): void => {
      for (const stream of ['stdout', 'stderr'] as const) {
        let text = buffers[stream]
        if (!text) continue
        buffers[stream] = ''
        if (truncated) continue
        const room = this.#limit - stored
        if (text.length > room) {
          text = text.slice(0, Math.max(0, room))
          truncated = true
        }
        if (text.length > 0) {
          stored += text.length
          this.#write(run, stream, text)
        }
        if (truncated) {
          this.#write(run, 'stderr', `\nhiroshi-engine: output truncated after ${this.#limit} characters\n`)
          this.#truncate(run)
        }
      }
    }

    const timer = setInterval(flush, FLUSH_MS)
    try {
      // One decoder per stream, kept for the whole run: a multi-byte character
      // split across two reads must not be decoded as two replacement glyphs.
      const decoders: Record<OutputStream, TextDecoder> = {
        stdout: new TextDecoder(),
        stderr: new TextDecoder(),
      }
      const decode = (stream: OutputStream) => (bytes: Uint8Array) => {
        buffers[stream] += decoders[stream].decode(bytes, { stream: true })
        if (buffers[stream].length >= FLUSH_CHARS) flush()
      }
      for (;;) {
        await Promise.all([this.#pump(proc.stdout, decode('stdout')), this.#pump(proc.stderr, decode('stderr'))])
        buffers.stdout += decoders.stdout.decode(); buffers.stderr += decoders.stderr.decode()
        const code = await proc.exited
        flush()
        const active = this.#active.get(run.id)
        if (active?.cancelled || code !== 0 || !remaining.length || this.#store.run(run.id)?.status !== 'running') {
          const status: RunStatus = active?.abortStatus ?? (active?.cancelled ? 'cancelled' : code === 0 ? 'succeeded' : 'failed')
          this.#finish(run, status, code, active?.abortReason ? { error: active.abortReason } : {})
          break
        }
        assertWorkspace(this.#store, run.sessionID)
        proc = spawnOwned({ cmd: remaining.shift()!, cwd: run.cwd, env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0' }, limits: this.#budget?.limits })
        if (active) active.proc = proc
      }
    } catch (error) {
      flush()
      this.#write(run, 'stderr', `hiroshi-engine: the run failed: ${String(error)}\n`)
      this.#finish(run, 'failed', null, { error: String(error) })
      this.#log.error('run failed', { run: run.id, error: String(error) })
    } finally {
      clearInterval(timer)
      killTree(proc)
      this.#active.delete(run.id)
    }
  }

  async #pump(stream: ReadableStream<Uint8Array>, onText: (text: Uint8Array) => void): Promise<void> {
    const reader = stream.getReader()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) onText(value)
      }
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // Already released.
      }
    }
  }
}

export { DEFAULT_OUTPUT_LIMIT }
