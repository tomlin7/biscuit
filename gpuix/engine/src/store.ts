/**
 * The durable side of the engine: one SQLite file, one write path.
 *
 * Every method that changes state goes through `record()`: the projector and
 * the event row commit in the same transaction, and subscribers are told only
 * after the transaction is on disk. Nothing outside this file writes SQL, so
 * "the log is the truth and the tables are a projection of it" stays true by
 * construction rather than by convention.
 *
 * The engine is the only writer. It opens the database with WAL, so a reader
 * (a second daemon inspecting a stale file, a script) never blocks a write.
 */

import { Database } from 'bun:sqlite'
import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'
import { replayTranscript } from './cockpit'

import type {
  AccessSettings, AccessReview,
  CliConversation,
  Execution,
  Compaction,
  Checkpoint,
  Rewind,
  Permission,
  SavedPermission,
  StepContext,
  StepPart,
  DeliveryMode,
  EngineEvent,
  EventPayloads,
  EventType,
  InboxItem,
  InboxState,
  Message,
  MessageRole,
  OutputStream,
  Run,
  RunChunk,
  RunStatus,
  Session,
  SessionDetail,
  Step,
  StepError,
  StepStatus,
  ToolCall,
  ToolStatus,
} from './protocol'

interface Migration {
  id: number
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'core',
    sql: `
      create table session (
        id         text primary key,
        title      text not null,
        cwd        text not null,
        created_at integer not null,
        updated_at integer not null
      );

      create table message (
        id         text primary key,
        session_id text not null references session(id) on delete cascade,
        seq        integer not null,
        role       text not null,
        text       text not null,
        at         integer not null,
        unique (session_id, seq)
      );

      create table run (
        id         text primary key,
        session_id text not null references session(id) on delete cascade,
        command    text not null,
        cwd        text not null,
        shell      text not null,
        status     text not null,
        exit_code  integer,
        started_at integer not null,
        ended_at   integer
      );
      create index run_session on run (session_id, started_at);
      create index run_status on run (status);

      create table run_chunk (
        run_id text not null references run(id) on delete cascade,
        seq    integer not null,
        stream text not null,
        data   text not null,
        at     integer not null,
        primary key (run_id, seq)
      );

      create table event (
        seq        integer primary key autoincrement,
        type       text not null,
        session_id text,
        run_id     text,
        at         integer not null,
        data       text not null
      );
      create index event_session on event (session_id, seq);
    `,
  },
  {
    id: 2,
    name: 'inbox',
    sql: `
      alter table message add column mode text;

      create table inbox (
        id           text primary key,
        session_id   text not null references session(id) on delete cascade,
        seq          integer not null,
        text         text not null,
        mode         text not null,
        state        text not null,
        key          text,
        admitted_at  integer not null,
        delivered_at integer,
        message_id   text references message(id) on delete set null,
        unique (session_id, seq)
      );
      create unique index inbox_key on inbox (session_id, key) where key is not null;
      create index inbox_pending on inbox (session_id, state, seq);
    `,
  },
  {
    id: 3,
    name: 'step',
    sql: `
      alter table run add column error text;

      create table step (
        id              text primary key,
        session_id      text not null references session(id) on delete cascade,
        message_id      text references message(id) on delete set null,
        provider        text not null,
        model           text not null,
        attempt         integer not null,
        status          text not null,
        claim           integer,
        output          text not null default '',
        truncated       integer not null default 0,
        error_code      text,
        error_message   text,
        error_retryable integer,
        started_at      integer not null,
        ended_at        integer
      );
      create unique index step_message on step (message_id) where message_id is not null;
      create index step_session on step (session_id, started_at);
      create index step_status on step (status);

      create table tool_call (
        id         text primary key,
        session_id text not null references session(id) on delete cascade,
        step_id    text references step(id) on delete set null,
        run_id     text references run(id) on delete set null,
        tool       text not null,
        input      text not null,
        status     text not null,
        error      text,
        created_at integer not null,
        ended_at   integer
      );
      create index tool_call_session on tool_call (session_id, created_at);
      create index tool_call_run on tool_call (run_id);
    `,
  },
  {
    id: 4,
    name: 'context',
    sql: `
      create table compaction (
        id text not null unique,
        session_id text not null references session(id),
        ordinal integer primary key autoincrement,
        data text not null
      );
      create index compaction_session on compaction(session_id, ordinal);
      create table step_context (
        ordinal integer primary key autoincrement,
        id text not null unique,
        session_id text not null references session(id),
        data text not null
      );
      create index step_context_session on step_context(session_id, ordinal);
    `,
  },
  {
    id: 5,
    name: 'providers',
    sql: `
      alter table message add column model text;
      alter table inbox add column model text;
      create table step_part (
        ordinal integer primary key autoincrement,
        id text not null unique,
        session_id text not null references session(id),
        step_id text not null references step(id),
        data text not null
      );
      create index step_part_session on step_part(session_id, ordinal);
      create index step_part_step on step_part(step_id, ordinal);
    `,
  },
  {
    id: 6,
    name: 'tools-and-permissions',
    sql: `
      alter table step add column parent_id text references step(id);
      drop index step_message;
      create unique index step_message on step(message_id) where message_id is not null and parent_id is null;
      create unique index step_parent on step(parent_id) where parent_id is not null;
      alter table message add column details text;
      alter table tool_call add column details text;
      alter table tool_call add column provider_call_id text;
      create unique index tool_step_call on tool_call(step_id, provider_call_id) where provider_call_id is not null;
      create table permission (
        id text primary key,
        session_id text not null references session(id),
        tool_call_id text not null unique references tool_call(id),
        data text not null
      );
      create table saved_permission (
        ordinal integer primary key autoincrement,
        id text not null unique,
        scope text not null,
        data text not null
      );
      create index saved_permission_scope on saved_permission(scope, ordinal);
    `,
  },
  {
    id: 7, name: 'checkpoints-and-rewinds',
    sql: `
      create table checkpoint (id text primary key, session_id text not null references session(id), data text not null);
      create table rewind (id text primary key, session_id text not null references session(id), request_key text not null, data text not null, unique(session_id, request_key));
      create table conversation_view (session_id text primary key references session(id), retained text not null, after_seq integer not null);
      create table checkpoint_error (session_id text primary key references session(id), error text not null);
    `,
  },
  {
    id: 8, name: 'execution-budget',
    sql: `
      create table execution (id text primary key, session_id text not null references session(id), details text not null);
      create index execution_session on execution(session_id);
      create table command_queue (run_id text primary key references run(id), details text not null);
    `,
  },
  { id: 9, name: 'workspace-identity', sql: 'alter table session add column workspace_identity text;' },
  { id: 10, name: 'scratch-tasks', sql: 'alter table session add column projectless integer not null default 0;' },
  { id: 11, name: 'cli-conversations', sql: `
    create table cli_conversation (id text primary key, session_id text not null references session(id), adapter text not null,
      vendor_id text, active integer not null, reset_key text, data text not null);
    create unique index cli_current on cli_conversation(session_id) where active = 1;
    create unique index cli_vendor_owner on cli_conversation(adapter, vendor_id) where vendor_id is not null;
    create unique index cli_reset on cli_conversation(session_id, reset_key) where reset_key is not null;
  ` },
  { id: 12, name: 'task-access', sql: `
    create table task_access (session_id text primary key references session(id), mode text not null, revision integer not null);
    create table access_review (call_id text primary key references tool_call(id), session_id text not null references session(id), data text not null);
  ` },
]

type Row = Record<string, any>

const SESSION_SELECT = `
  select s.id, s.title, s.cwd, s.workspace_identity, s.projectless, s.created_at, s.updated_at,
    (select count(*) from run r where r.session_id = s.id)                              as runs,
    (select count(*) from run r where r.session_id = s.id and r.status = 'running')    as running,
    (select max(r.started_at) from run r where r.session_id = s.id)                    as last_run_at
  from session s`

function toSession(row: Row): Session {
  return {
    id: row.id,
    title: row.title,
    cwd: row.cwd,
    ...(row.projectless ? { projectless: true } : {}),
    ...(row.workspace_identity ? { workspaceIdentity: row.workspace_identity } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    runs: row.runs ?? 0,
    running: row.running ?? 0,
    lastRunAt: row.last_run_at ?? null,
  }
}

function toMessage(row: Row): Message {
  const message: Message = {
    id: row.id,
    sessionID: row.session_id,
    seq: row.seq,
    role: row.role as MessageRole,
    text: row.text,
    at: row.at,
  }
  if (row.details) Object.assign(message, JSON.parse(row.details))
  if (row.mode) message.mode = row.mode as DeliveryMode
  if (row.model) message.model = row.model
  return message
}

function toInboxItem(row: Row): InboxItem {
  return {
    id: row.id,
    sessionID: row.session_id,
    seq: row.seq,
    text: row.text,
    mode: row.mode as DeliveryMode,
    state: row.state as InboxState,
    key: row.key ?? null,
    admittedAt: row.admitted_at,
    deliveredAt: row.delivered_at ?? null,
    messageID: row.message_id ?? null,
    ...(row.model ? { model: row.model } : {}),
  }
}

function toRun(row: Row): Run {
  return {
    id: row.id,
    sessionID: row.session_id,
    command: row.command,
    cwd: row.cwd,
    shell: row.shell,
    status: row.status as RunStatus,
    exitCode: row.exit_code ?? null,
    error: row.error ?? null,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
  }
}

function toStepError(row: Row): StepError | null {
  if (!row.error_code) return null
  return {
    code: row.error_code,
    message: row.error_message ?? '',
    retryable: Boolean(row.error_retryable),
  }
}

function toStep(row: Row): Step {
  return {
    ...(row.parent_id ? { parentID: row.parent_id } : {}),
    id: row.id,
    sessionID: row.session_id,
    messageID: row.message_id ?? null,
    ...(row.model ? { model: row.model } : {}),
    provider: row.provider,
    model: row.model,
    attempt: row.attempt,
    status: row.status as StepStatus,
    claim: row.claim ?? null,
    output: row.output ?? '',
    truncated: Boolean(row.truncated),
    error: toStepError(row),
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
  }
}

function toToolCall(row: Row): ToolCall {
  return {
    ...(row.details ? JSON.parse(row.details) : {}),
    id: row.id,
    sessionID: row.session_id,
    stepID: row.step_id ?? null,
    runID: row.run_id ?? null,
    tool: row.tool,
    input: row.input,
    status: row.status as ToolStatus,
    error: row.error ?? null,
    createdAt: row.created_at,
    endedAt: row.ended_at ?? null,
  }
}

function toChunk(row: Row): RunChunk {
  return {
    runID: row.run_id,
    seq: row.seq,
    stream: row.stream as OutputStream,
    data: row.data,
    at: row.at,
  }
}

function toEvent(row: Row): EngineEvent {
  // The daemon wrote the type and the payload together, in one insert, from a
  // record the compiler checked. Reading the pair back is the one place that
  // has to take the row's word for it.
  return {
    seq: row.seq,
    type: row.type as EventType,
    at: row.at,
    sessionID: row.session_id ?? null,
    runID: row.run_id ?? null,
    data: JSON.parse(row.data),
  } as EngineEvent
}

/** One event, minus what the store fills in. `data` is checked per type. */
export type RecordInputOf<Type extends EventType> = {
  type: Type
  data: EventPayloads[Type]
  sessionID?: string | null
  runID?: string | null
  at?: number
  /** Runs inside the same transaction as the event insert. */
  project?: () => void
}

export type RecordInput = { [Type in EventType]: RecordInputOf<Type> }[EventType]

export class Store {
  readonly #db: Database
  readonly #listeners = new Set<(event: EngineEvent) => void>()
  #closed = false

  private constructor(file: string) {
    if (file !== ':memory:') {
      const directory = dirname(file)
      if (directory && directory !== '.') mkdirSync(directory, { recursive: true })
    }
    this.#db = new Database(file, { create: true })
    this.#db.exec('pragma journal_mode = wal')
    // The engine can lose power; it must not lose the transcript. FULL is the
    // price of that promise and the engine is not a hot loop.
    this.#db.exec('pragma synchronous = full')
    this.#db.exec('pragma foreign_keys = on')
    this.#db.exec('pragma busy_timeout = 5000')
  }

  static open(file: string): Store {
    return new Store(file)
  }

  migrate(): void {
    this.#db.exec(`create table if not exists schema_migration (
      id integer primary key,
      name text not null,
      applied_at integer not null
    )`)
    const applied = new Set(
      (this.#db.query('select id from schema_migration').all() as Row[]).map((row) => row.id as number),
    )
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue
      const apply = this.#db.transaction(() => {
        this.#db.exec(migration.sql)
        this.#db.run('insert into schema_migration (id, name, applied_at) values (?, ?, ?)', [
          migration.id,
          migration.name,
          Date.now(),
        ])
      })
      apply()
    }
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#listeners.clear()
    this.#db.close()
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  /**
   * Append one durable fact and project it.
   *
   * The listener call happens after the transaction returns, so no subscriber
   * can observe an event whose projection is not visible yet.
   */
  record<Type extends EventType>(input: RecordInputOf<Type>): EngineEvent {
    const at = input.at ?? Date.now()
    const sessionID = input.sessionID ?? null
    const runID = input.runID ?? null
    const payload = JSON.stringify(input.data)

    const commit = this.#db.transaction(() => {
      input.project?.()
      const result = this.#db.run(
        'insert into event (type, session_id, run_id, at, data) values (?, ?, ?, ?, ?)',
        [input.type, sessionID, runID, at, payload],
      )
      return Number(result.lastInsertRowid)
    })

    const seq = commit()
    // `type` and `data` were checked against the same `EventPayloads` row by
    // the generic input, which is what this assertion restates for the union.
    const event = {
      seq,
      type: input.type,
      at,
      sessionID,
      runID,
      data: input.data,
    } as EngineEvent
    for (const listener of [...this.#listeners]) {
      try {
        listener(event)
      } catch {
        // A subscriber that throws is the subscriber's problem. Losing one
        // event for one client must not fail the write that just committed.
      }
    }
    return event
  }

  /**
   * Durable events after `after`, oldest first.
   *
   * The limit is what the caller asks for; there is no default, because a
   * default is a cap nobody named and a replay silently cut short. A caller
   * that wants a page passes one and keeps asking until it reaches its
   * watermark: the feed pages so one long replay cannot block the daemon.
   */
  eventsSince(after: number, limit?: number): EngineEvent[] {
    const statement =
      limit === undefined
        ? this.#db.query('select * from event where seq > ? order by seq asc')
        : this.#db.query('select * from event where seq > ? order by seq asc limit ?')
    const rows = (
      limit === undefined ? statement.all(after) : statement.all(after, limit)
    ) as Row[]
    return rows.map(toEvent)
  }

  lastSeq(): number {
    const row = this.#db.query('select coalesce(max(seq), 0) as seq from event').get() as Row
    return row.seq ?? 0
  }

  // -- sessions ------------------------------------------------------------

  createSession(session: Omit<Session, 'runs' | 'running' | 'lastRunAt'>): void {
    this.#db.run('insert into session (id, title, cwd, created_at, updated_at, workspace_identity, projectless) values (?, ?, ?, ?, ?, ?, ?)', [
      session.id,
      session.title,
      session.cwd,
      session.createdAt,
      session.updatedAt,
      session.workspaceIdentity ?? null,
      session.projectless ? 1 : 0,
    ])
  }

  touchSession(id: string, at: number): void {
    this.#db.run('update session set updated_at = ? where id = ?', [at, id])
  }

  bindWorkspace(id: string, identity: string, cwd?: string): void {
    this.#db.run('update session set workspace_identity = ?, cwd = coalesce(?, cwd) where id = ? and workspace_identity is null', [identity, cwd ?? null, id])
  }

  renameSession(id: string, title: string, at: number): void {
    this.#db.run('update session set title = ?, updated_at = ? where id = ?', [title, at, id])
  }

  session(id: string): Session | null {
    const row = this.#db.query(`${SESSION_SELECT} where s.id = ?`).get(id) as Row | null
    return row ? toSession(row) : null
  }

  sessions(): Session[] {
    const rows = this.#db.query(`${SESSION_SELECT} order by s.updated_at desc`).all() as Row[]
    return rows.map(toSession)
  }

  // -- transcript ----------------------------------------------------------

  /** Reserve the identity and sequence of a message that is not written yet. */
  newMessage(sessionID: string, role: MessageRole, text: string, at: number, mode?: DeliveryMode): Message {
    const next = this.#db
      .query('select coalesce(max(seq), -1) + 1 as seq from message where session_id = ?')
      .get(sessionID) as Row
    const message: Message = {
      id: `msg_${(at).toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      sessionID,
      seq: next.seq as number,
      role,
      text,
      at,
    }
    if (mode) message.mode = mode
    return message
  }

  /**
   * Write a reserved message. Called by the projector of the event that made
   * it durable, so the row and the event commit together.
   */
  insertMessage(message: Message): void {
    this.#db.run(
      'insert into message (id, session_id, seq, role, text, at, mode, model, details) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [message.id, message.sessionID, message.seq, message.role, message.text, message.at, message.mode ?? null, message.model ?? null, JSON.stringify(message)],
    )
  }

  messages(sessionID: string): Message[] {
    const rows = this.#db.query('select * from message where session_id = ? order by seq asc').all(sessionID) as Row[]
    return rows.map(toMessage)
  }

  message(id: string): Message | null {
    const row = this.#db.query('select * from message where id = ?').get(id) as Row | null
    return row ? toMessage(row) : null
  }

  insertStepPart(part: StepPart): void {
    this.#db.run('insert into step_part (id, session_id, step_id, data) values (?, ?, ?, ?)',
      [part.id, part.sessionID, part.stepID, JSON.stringify(part)])
  }

  stepParts(sessionID: string): StepPart[] {
    return (this.#db.query('select data from step_part where session_id = ? order by ordinal').all(sessionID) as Row[])
      .map((row) => JSON.parse(row.data) as StepPart)
  }

  access(sessionID: string): AccessSettings {
    const row = this.#db.query('select mode, revision from task_access where session_id = ?').get(sessionID) as AccessSettings | null
    return row ?? { mode: 'ask', revision: 0 }
  }
  putAccess(sessionID: string, access: AccessSettings) {
    this.#db.run('insert into task_access values (?, ?, ?) on conflict(session_id) do update set mode = excluded.mode, revision = excluded.revision', [sessionID, access.mode, access.revision])
  }
  accessReviews(sessionID: string): AccessReview[] {
    return (this.#db.query('select data from access_review where session_id = ?').all(sessionID) as Row[]).map((row) => JSON.parse(row.data))
  }
  putAccessReview(review: AccessReview) {
    this.#db.run('insert into access_review values (?, ?, ?) on conflict(call_id) do update set data = excluded.data', [review.toolCallID, review.sessionID, JSON.stringify(review)])
  }
  accessUsageRows(from: number, to: number): { data: string; cwd: string; projectless: number }[] {
    return this.#db.query(`select r.data, s.cwd, s.projectless from access_review r join session s on s.id = r.session_id where json_extract(r.data, '$.at') >= ? and json_extract(r.data, '$.at') < ? limit 100001`).all(from, to) as { data: string; cwd: string; projectless: number }[]
  }
  cliConversation(sessionID: string): CliConversation | null {
    const row = this.#db.query('select data from cli_conversation where session_id = ? and active = 1').get(sessionID) as Row | null
    return row ? JSON.parse(row.data) : null
  }
  cliConversationHistory(sessionID: string): CliConversation[] {
    return (this.#db.query('select data from cli_conversation where session_id = ? order by rowid').all(sessionID) as Row[]).map((row) => JSON.parse(row.data))
  }
  cliVendorOwner(adapter: string, vendorID: string): string | null {
    return (this.#db.query('select id from cli_conversation where adapter = ? and vendor_id = ?').get(adapter, vendorID) as Row | null)?.id ?? null
  }
  cliReset(sessionID: string, key: string): string | null {
    return (this.#db.query('select id from cli_conversation where session_id = ? and reset_key = ?').get(sessionID, key) as Row | null)?.id ?? null
  }
  putCliConversation(value: CliConversation, resetKey?: string) {
    this.#db.run(`insert into cli_conversation (id, session_id, adapter, vendor_id, active, reset_key, data) values (?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set vendor_id = excluded.vendor_id, active = excluded.active, reset_key = coalesce(excluded.reset_key, cli_conversation.reset_key), data = excluded.data`,
    [value.id, value.sessionID, value.adapter, value.vendorSessionID, value.status === 'archived' ? 0 : 1, resetKey ?? null, JSON.stringify(value)])
  }

  /** Usage-only projection: never read assistant text, reasoning or tool data. */
  usageRows(from: number, to: number): { stepID: string; sessionID: string; cwd: string; projectless: number; provider: string; model: string; attempts: number; at: number; data: string | null }[] {
    const rows = this.#db.query(`select st.id stepID, st.session_id sessionID, s.cwd, s.projectless, st.provider, st.model,
      st.attempt attempts, st.started_at at, p.data from step st join session s on s.id = st.session_id
      left join step_part p on p.step_id = st.id and json_extract(p.data, '$.kind') = 'usage'
      where st.started_at >= ? and st.started_at < ? order by st.started_at, p.ordinal limit 200001`).all(from, to) as ReturnType<Store['usageRows']>
    if (rows.length > 200000) throw new Error('This usage window has too many records. Choose a shorter date range.')
    return rows
  }
  vendorSessions(): Set<string> {
    const rows = this.#db.query(`select distinct json_extract(data, '$.vendorSessionID') id from step_part
      where json_extract(data, '$.kind') = 'cli' and json_extract(data, '$.phase') = 'session' limit 100001`).all() as { id: string | null }[]
    if (rows.length > 100000) throw new Error('The agent-session history is too large to import safely.')
    const reviews = this.#db.query("select json_extract(data, '$.vendorSessionID') id from access_review where json_extract(data, '$.vendorSessionID') is not null limit 100001").all() as { id: string }[]
    if (reviews.length > 100000) throw new Error('The reviewer-session history is too large to import safely.')
    return new Set([...rows.flatMap((row) => typeof row.id === 'string' ? [row.id] : []), ...reviews.map((row) => row.id)])
  }

  insertCompaction(value: Compaction): void {
    this.#db.run('insert into compaction (id, session_id, data) values (?, ?, ?)', [value.id, value.sessionID, JSON.stringify(value)])
  }

  compactions(sessionID: string): Compaction[] {
    return (this.#db.query('select data from compaction where session_id = ? order by ordinal').all(sessionID) as Row[])
      .map((row) => JSON.parse(row.data) as Compaction)
  }

  insertContext(value: StepContext): void {
    this.#db.run('insert into step_context (id, session_id, data) values (?, ?, ?)', [value.id, value.sessionID, JSON.stringify(value)])
  }

  contexts(sessionID: string): StepContext[] {
    return (this.#db.query('select data from step_context where session_id = ? order by ordinal').all(sessionID) as Row[])
      .map((row) => JSON.parse(row.data) as StepContext)
  }

  // -- inbox ---------------------------------------------------------------

  /** The next admission sequence inside a session. */
  inboxSeq(sessionID: string): number {
    const next = this.#db
      .query('select coalesce(max(seq), -1) + 1 as seq from inbox where session_id = ?')
      .get(sessionID) as Row
    return next.seq as number
  }

  insertInboxItem(item: InboxItem): void {
    this.#db.run(
      `insert into inbox (id, session_id, seq, text, mode, state, key, admitted_at, delivered_at, message_id, model)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.sessionID,
        item.seq,
        item.text,
        item.mode,
        item.state,
        item.key,
        item.admittedAt,
        item.deliveredAt,
        item.messageID,
        item.model ?? null,
      ],
    )
  }

  deliverInboxItem(id: string, messageID: string, at: number): void {
    this.#db.run("update inbox set state = 'delivered', delivered_at = ?, message_id = ? where id = ?", [
      at,
      messageID,
      id,
    ])
  }

  inboxItem(id: string): InboxItem | null {
    const row = this.#db.query('select * from inbox where id = ?').get(id) as Row | null
    return row ? toInboxItem(row) : null
  }

  inboxByKey(sessionID: string, key: string): InboxItem | null {
    const row = this.#db.query('select * from inbox where session_id = ? and key = ?').get(sessionID, key) as Row | null
    return row ? toInboxItem(row) : null
  }

  /** A session's inbox, oldest first. `state` narrows it to what is waiting. */
  inbox(sessionID: string, state?: InboxState): InboxItem[] {
    const statement =
      state === undefined
        ? this.#db.query('select * from inbox where session_id = ? order by seq asc')
        : this.#db.query('select * from inbox where session_id = ? and state = ? order by seq asc')
    const rows = (state === undefined ? statement.all(sessionID) : statement.all(sessionID, state)) as Row[]
    return rows.map(toInboxItem)
  }

  /** Sessions with anything still waiting, for the startup delivery sweep. */
  inboxSessions(): string[] {
    const rows = this.#db
      .query("select distinct session_id from inbox where state = 'pending' order by session_id")
      .all() as Row[]
    return rows.map((row) => row.session_id as string)
  }

  // -- runs ----------------------------------------------------------------

  insertRun(run: Run): void {
    this.#db.run(
      `insert into run (id, session_id, command, cwd, shell, status, exit_code, error, started_at, ended_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.sessionID,
        run.command,
        run.cwd,
        run.shell,
        run.status,
        run.exitCode,
        run.error,
        run.startedAt,
        run.endedAt,
      ],
    )
  }

  finishRun(id: string, status: RunStatus, exitCode: number | null, at: number, error: string | null = null): void {
    this.#db.run('update run set status = ?, exit_code = ?, error = ?, ended_at = ? where id = ?', [
      status,
      exitCode,
      error,
      at,
      id,
    ])
  }

  run(id: string): Run | null {
    const row = this.#db.query('select * from run where id = ?').get(id) as Row | null
    return row ? toRun(row) : null
  }

  runs(sessionID: string): Run[] {
    const rows = this.#db.query('select * from run where session_id = ? order by started_at asc').all(sessionID) as Row[]
    return rows.map(toRun)
  }

  /** Runs a dead process left behind, for the startup sweep. */
  runningRuns(sessionID?: string): Run[] {
    const statement =
      sessionID === undefined
        ? this.#db.query("select * from run where status = 'running' order by started_at asc")
        : this.#db.query("select * from run where status = 'running' and session_id = ? order by started_at asc")
    const rows = (sessionID === undefined ? statement.all() : statement.all(sessionID)) as Row[]
    return rows.map(toRun)
  }

  appendChunk(runID: string, stream: OutputStream, data: string, at: number): RunChunk {
    const next = this.#db
      .query('select coalesce(max(seq), -1) + 1 as seq from run_chunk where run_id = ?')
      .get(runID) as Row
    const chunk: RunChunk = { runID, seq: next.seq as number, stream, data, at }
    this.#db.run('insert into run_chunk (run_id, seq, stream, data, at) values (?, ?, ?, ?, ?)', [
      chunk.runID,
      chunk.seq,
      chunk.stream,
      chunk.data,
      chunk.at,
    ])
    return chunk
  }

  chunks(runID: string): RunChunk[] {
    const rows = this.#db.query('select * from run_chunk where run_id = ? order by seq asc').all(runID) as Row[]
    return rows.map(toChunk)
  }

  chunksForSession(sessionID: string): RunChunk[] {
    const rows = this.#db
      .query(
        `select c.* from run_chunk c join run r on r.id = c.run_id
         where r.session_id = ? order by c.run_id, c.seq asc`,
      )
      .all(sessionID) as Row[]
    return rows.map(toChunk)
  }

  // -- steps ---------------------------------------------------------------

  insertStep(step: Step): void {
    this.#db.run(
      `insert into step (id, session_id, message_id, provider, model, attempt, status, claim,
        output, truncated, error_code, error_message, error_retryable, started_at, ended_at, parent_id)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        step.id,
        step.sessionID,
        step.messageID,
        step.provider,
        step.model,
        step.attempt,
        step.status,
        step.claim,
        step.output,
        step.truncated ? 1 : 0,
        step.error?.code ?? null,
        step.error?.message ?? null,
        step.error === null ? null : step.error.retryable ? 1 : 0,
        step.startedAt,
        step.endedAt,
        step.parentID ?? null,
      ],
    )
  }

  updateStep(step: Step): void {
    this.#db.run(
      `update step set attempt = ?, status = ?, claim = ?, output = ?, truncated = ?,
        error_code = ?, error_message = ?, error_retryable = ?, ended_at = ?
       where id = ?`,
      [
        step.attempt,
        step.status,
        step.claim,
        step.output,
        step.truncated ? 1 : 0,
        step.error?.code ?? null,
        step.error?.message ?? null,
        step.error === null ? null : step.error.retryable ? 1 : 0,
        step.endedAt,
        step.id,
      ],
    )
  }

  step(id: string): Step | null {
    const row = this.#db.query('select * from step where id = ?').get(id) as Row | null
    return row ? toStep(row) : null
  }

  stepForMessage(messageID: string): Step | null {
    const row = this.#db.query('select * from step where message_id = ? and parent_id is null').get(messageID) as Row | null
    return row ? toStep(row) : null
  }

  steps(sessionID: string): Step[] {
    const rows = this.#db
      .query('select * from step where session_id = ? order by started_at asc, rowid asc')
      .all(sessionID) as Row[]
    return rows.map(toStep)
  }

  /** Steps a dead process left claimed, for the startup resume. */
  runningSteps(): Step[] {
    const rows = this.#db
      .query("select * from step where status = 'running' order by started_at asc, rowid asc")
      .all() as Row[]
    return rows.map(toStep)
  }

  /** The newest prompt in a session, for the turn the next step answers. */
  lastUserMessage(sessionID: string): Message | null {
    return this.activeMessages(sessionID).filter((message) => message.role === 'user').at(-1) ?? null
  }

  // -- tool calls ----------------------------------------------------------

  insertToolCall(call: ToolCall): void {
    this.#db.run(
      `insert into tool_call (id, session_id, step_id, run_id, tool, input, status, error, created_at, ended_at, details, provider_call_id)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        call.id,
        call.sessionID,
        call.stepID,
        call.runID,
        call.tool,
        call.input,
        call.status,
        call.error,
        call.createdAt,
        call.endedAt,
        JSON.stringify(call),
        call.callID ?? null,
      ],
    )
  }

  updateToolCall(call: ToolCall): void {
    this.#db.run('update tool_call set status = ?, error = ?, ended_at = ?, details = ?, run_id = ? where id = ?', [
      call.status, call.error, call.endedAt, JSON.stringify(call), call.runID, call.id,
    ])
  }

  toolCall(id: string): ToolCall | null {
    const row = this.#db.query('select * from tool_call where id = ?').get(id) as Row | null
    return row ? toToolCall(row) : null
  }

  toolCallForRun(runID: string): ToolCall | null {
    const row = this.#db.query('select * from tool_call where run_id = ?').get(runID) as Row | null
    return row ? toToolCall(row) : null
  }

  toolCalls(sessionID: string): ToolCall[] {
    const rows = this.#db
      .query('select * from tool_call where session_id = ? order by created_at asc, rowid asc')
      .all(sessionID) as Row[]
    return rows.map(toToolCall)
  }

  insertPermission(permission: Permission): void {
    this.#db.run('insert into permission (id, session_id, tool_call_id, data) values (?, ?, ?, ?)',
      [permission.id, permission.sessionID, permission.toolCallID, JSON.stringify(permission)])
  }

  updatePermission(permission: Permission): void {
    this.#db.run('update permission set data = ? where id = ?', [JSON.stringify(permission), permission.id])
  }

  permission(id: string): Permission | null {
    const row = this.#db.query('select data from permission where id = ?').get(id) as Row | null
    return row ? JSON.parse(row.data) : null
  }

  permissions(sessionID: string): Permission[] {
    return (this.#db.query('select data from permission where session_id = ? order by rowid').all(sessionID) as Row[])
      .map((row) => JSON.parse(row.data))
  }

  insertSavedPermission(value: SavedPermission): void {
    this.#db.run('insert into saved_permission (id, scope, data) values (?, ?, ?)', [value.id, value.scope, JSON.stringify(value)])
  }

  savedPermission(scope: string): SavedPermission | null {
    const row = this.#db.query('select data from saved_permission where scope = ? order by ordinal desc limit 1').get(scope) as Row | null
    return row ? JSON.parse(row.data) : null
  }

  childStep(id: string): Step | null {
    const row = this.#db.query('select * from step where parent_id = ?').get(id) as Row | null
    return row ? toStep(row) : null
  }

  insertCheckpoint(value: Checkpoint): void {
    this.#db.run('insert into checkpoint (id, session_id, data) values (?, ?, ?)', [value.id, value.sessionID, JSON.stringify(value)])
    this.#db.run('delete from checkpoint_error where session_id = ?', [value.sessionID])
  }

  checkpoint(id: string): Checkpoint | null {
    const row = this.#db.query('select data from checkpoint where id = ?').get(id) as Row | null
    return row ? JSON.parse(row.data) : null
  }

  checkpoints(sessionID: string): Checkpoint[] {
    return (this.#db.query('select data from checkpoint where session_id = ? order by rowid').all(sessionID) as Row[]).map((row) => JSON.parse(row.data))
  }

  putRewind(value: Rewind): void {
    this.#db.run('insert into rewind (id, session_id, request_key, data) values (?, ?, ?, ?) on conflict(id) do update set data = excluded.data',
      [value.id, value.sessionID, value.key, JSON.stringify(value)])
  }

  rewinds(sessionID?: string): Rewind[] {
    const rows = sessionID === undefined ? this.#db.query('select data from rewind order by rowid').all()
      : this.#db.query('select data from rewind where session_id = ? order by rowid').all(sessionID)
    return (rows as Row[]).map((row) => JSON.parse(row.data))
  }

  setConversationView(sessionID: string, retained: string[], afterSeq: number): void {
    this.#db.run('delete from checkpoint_error where session_id = ?', [sessionID])
    this.#db.run('insert into conversation_view (session_id, retained, after_seq) values (?, ?, ?) on conflict(session_id) do update set retained = excluded.retained, after_seq = excluded.after_seq',
      [sessionID, JSON.stringify(retained), afterSeq])
  }

  activeMessages(sessionID: string): Message[] {
    const row = this.#db.query('select retained, after_seq from conversation_view where session_id = ?').get(sessionID) as Row | null
    const messages = this.messages(sessionID)
    if (!row) return messages
    const retained = new Set<string>(JSON.parse(row.retained))
    return messages.filter((message) => retained.has(message.id) || message.seq >= row.after_seq)
  }

  activeCompactions(sessionID: string): Compaction[] {
    const active = new Set(this.activeMessages(sessionID).map((message) => message.id))
    return this.compactions(sessionID).filter((boundary) => active.has(this.step(boundary.stepID)?.messageID ?? ''))
  }

  cancelPendingInbox(sessionID: string): void {
    this.#db.run("update inbox set state = 'cancelled' where session_id = ? and state = 'pending'", [sessionID])
  }

  setCheckpointError(sessionID: string, error: string): void {
    this.#db.run('insert into checkpoint_error (session_id, error) values (?, ?) on conflict(session_id) do update set error = excluded.error', [sessionID, error])
  }

  checkpointError(sessionID: string): string | null {
    return (this.#db.query('select error from checkpoint_error where session_id = ?').get(sessionID) as Row | null)?.error ?? null
  }

  // -- snapshots -----------------------------------------------------------

  execution(id: string): Execution | null {
    const row = this.#db.query('select details from execution where id = ?').get(id) as Row | null
    return row ? JSON.parse(row.details) : null
  }

  executions(sessionID?: string): Execution[] {
    const rows = (sessionID ? this.#db.query('select details from execution where session_id = ? order by rowid').all(sessionID)
      : this.#db.query('select details from execution order by rowid').all()) as Row[]
    return rows.map((row) => JSON.parse(row.details))
  }

  saveExecution(value: Execution): void {
    this.#db.run('insert into execution (id, session_id, details) values (?, ?, ?) on conflict(id) do update set details = excluded.details',
      [value.id, value.sessionID, JSON.stringify(value)])
  }

  saveCommand(runID: string, commands: string[][], program: boolean): void {
    this.#db.run('insert into command_queue (run_id, details) values (?, ?)', [runID, JSON.stringify({ commands, program })])
  }

  queuedCommand(runID: string): { commands: string[][]; program: boolean } | null {
    const row = this.#db.query('select details from command_queue where run_id = ?').get(runID) as Row | null
    return row ? JSON.parse(row.details) : null
  }

  /**
   * Everything a client needs to draw a session, read at one watermark.
   *
   * The watermark is what makes a reconnect gap-free: the client takes the
   * snapshot, then subscribes from `seq`, so an event either lands in the
   * snapshot or arrives on the feed, never both and never neither.
   */
  snapshot(sessionID: string): SessionDetail | null {
    const read = this.#db.transaction((): SessionDetail | null => {
      const session = this.session(sessionID)
      if (!session) return null
      return {
        access: this.access(sessionID), accessReviews: this.accessReviews(sessionID),
        cliConversation: this.cliConversation(sessionID),
        executions: this.executions(sessionID),
        session,
        transcript: replayTranscript((this.#db.query('select * from event where session_id = ? order by seq').all(sessionID) as Row[]).map(toEvent)),
        messages: this.messages(sessionID),
        runs: this.runs(sessionID),
        chunks: this.chunksForSession(sessionID),
        inbox: this.inbox(sessionID, 'pending'),
        steps: this.steps(sessionID),
        toolCalls: this.toolCalls(sessionID),
        compactions: this.compactions(sessionID),
        contexts: this.contexts(sessionID),
        parts: this.stepParts(sessionID),
        permissions: this.permissions(sessionID),
        checkpoints: this.checkpoints(sessionID),
        rewinds: this.rewinds(sessionID),
        activeMessageIDs: this.activeMessages(sessionID).map((message) => message.id),
        checkpointError: this.checkpointError(sessionID),
        seq: this.lastSeq(),
      }
    })
    return read()
  }
}
