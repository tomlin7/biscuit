/**
 * The wire shapes between the engine and whatever draws it.
 *
 * The daemon and the cockpit import this same file, so a shape cannot drift
 * between the two sides. It holds three things:
 *
 *   - the shapes: a session, a message, a run, a snapshot;
 *   - `EventPayloads`: the union of everything the engine can publish;
 *   - `operations`: the route table every command is declared in, which the
 *     daemon matches and the client is generated from.
 *
 * `PROTOCOL_VERSION` changes only when a client built against the previous
 * shape would misread the new daemon: a client that sees another protocol
 * version refuses to attach instead of guessing.
 *
 * Everything here is data. Nothing in this file may import a runtime module,
 * because the cockpit bundles it for the GPU renderer and for the browser.
 */

export const ENGINE_NAME = 'hiroshi-engine'

/**
 * The version of the shapes below. Bump it when a field is renamed, removed or
 * reinterpreted. Adding an optional field does not need a bump.
 */
export const PROTOCOL_VERSION = 18

/** Kept in step with `package.json` by a test. */
export const ENGINE_VERSION = '0.27.0'

export interface ModelInfo {
  /** Stable catalog identity; the adapter owns the provider's model id. */
  id: string
  provider: string
  label: string
  contextWindow: number
  reservedOutput: number
  reason: 'provider_denied' | 'credentials_missing' | 'cli_policy_required' | 'provider_disabled' | 'cli_unavailable' | null
}

export type AgentID = 'agy' | 'cursor' | 'pi' | 'grok'
export interface AgentInfo {
  id: AgentID
  name: string
  enabled: boolean
  trustWorkspace: boolean
  command: string[] | null
  source: 'manual' | 'discovered' | null
  version: string | null
  fingerprint: string | null
  checkedAt: number | null
  auth: 'unknown' | 'authenticated' | 'signed_out'
  status: 'unchecked' | 'missing' | 'unsupported' | 'disabled' | 'installed' | 'signed_out' | 'blocked' | 'ready'
  detail: string
  models: { id: string; label: string; catalogID: string }[]
  capabilities: { responses: boolean; coding: false; nativeContinuation: boolean; approvals: false; cancellation: boolean; instructions: 'native-and-supplied' | 'supplied-only' | 'unknown' }
}
export interface ProviderState {
  revision: number
  refreshing: boolean
  error: string | null
  agents: AgentInfo[]
  models: ModelInfo[]
  defaultModel: string
}
export interface ProviderUpdate {
  revision: number
  agent?: AgentID
  enabled?: boolean
  /** null restores automatic discovery. */
  command?: string[] | null
  trustWorkspace?: boolean
  defaultModel?: string
}

export type StepPart = {
  id: string
  sessionID: string
  stepID: string
  at: number
  attempt?: number
} & (
  | { kind: 'cli'; version: 1 | 2; adapter: AgentID; phase: 'started' | 'session' | 'completed'; vendorSessionID?: string; text: string }
  | ({ kind: 'usage' } & UsageCounters)
  | { kind: 'reasoning'; text: string }
  | { kind: 'state'; provider: 'openai' | 'anthropic'; text: string }
  | { kind: 'tool'; phase: 'start' | 'delta' | 'end'; callID: string; name?: string; text: string }
)

export type RunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted'

export interface ExecutionLimits {
  maxActive: number
  maxQueued: number
  queueTimeoutMs: number
  timeoutMs: number
  minFreeMemoryMB: number
  processMemoryMB: number
  maxProcesses: number
}

export interface Execution {
  messageID?: string
  id: string
  sessionID: string
  kind: 'model' | 'tool' | 'command' | 'maintenance'
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted'
  reason: string | null
  queuedAt: number
  queueDeadline: number
  startedAt: number | null
  deadline: number | null
  endedAt: number | null
}

export interface ExecutionStatus {
  limits: ExecutionLimits
  active: number
  queued: number
  freeMemoryMB: number
  containment: 'windows-job' | 'process-group'
}

export interface Health {
  execution?: ExecutionStatus
  name: string
  version: string
  protocol: number
  pid: number
  startedAt: number
  uptimeMs: number
  database: string
  workspace: string
  /** Sequence of the newest durable event, for diagnostics and resumption. */
  lastSeq: number
}

export interface NetworkUpdate { revision: number; enabled: boolean; port: number; origins: string[] }
export interface NetworkSettings extends NetworkUpdate { active: boolean; urls: string[]; error: string | null; transport: string }
export interface InternetSettings { revision: number; enabled: boolean; state: 'disabled' | 'starting' | 'connected' | 'reconnecting' | 'failed'; url: string | null; error: string | null }

export interface UsageCounters {
  inputTokens?: number; outputTokens?: number; cachedInputTokens?: number
  cacheWriteTokens?: number; reasoningTokens?: number; costUSD?: number
}
export interface UsageRate { input: number; cachedInput: number; cacheWrite: number; output: number }
export interface UsageTotals {
  input: number; cachedInput: number; cacheWrites: number; uncachedInput: number; unclassifiedInput: number; output: number; reasoning: number; tokens: number
  attempts: number; reportedAttempts: number; cacheReportedAttempts: number; activeDays: number
  costUSD: number | null; providerCostUSD: number; estimatedCostUSD: number; cacheSavingsUSD: number | null
  providerPricedTokens: number; estimatedPricedTokens: number; unpricedTokens: number
}
export interface UsageGroup extends UsageTotals { id: string; label: string }
export interface UsageSource { name: string; status: 'included' | 'missing' | 'unsupported' | 'partial'; files: number; records: number; skipped: number; detail: string }
export interface UsageQuery { from: number; to: number; includeHistory: boolean }
export interface UsageReport {
  from: number; to: number; generatedAt: number; totals: UsageTotals
  days: UsageGroup[]; months: UsageGroup[]; projects: UsageGroup[]; providers: UsageGroup[]; models: UsageGroup[]
  sources: UsageSource[]; warnings: string[]; pricing: Record<string, UsageRate>; pricingRevision: number; scannedRecords: number
}
export interface UsagePricingUpdate { revision: number; model: string; rate: UsageRate | null }

export interface Session {
  /** An isolated engine-owned workspace, excluded from the project list. */
  projectless?: boolean
  id: string
  title: string
  cwd: string
  workspaceIdentity?: string
  createdAt: number
  updatedAt: number
  runs: number
  running: number
  lastRunAt: number | null
}

export interface ProjectInfo {
  id: string
  cwd: string
  name: string
  sessionID: string
  status: 'ready' | 'missing' | 'changed' | 'inaccessible'
  detail: string | null
}

export interface CliConversation {
  id: string; sessionID: string; revision: number
  adapter: AgentID; contractVersion: number; cliVersion: string | null; fingerprint: string
  provider: string; model: string; vendorModel: string; profileRef: string
  cwd: string; workspaceIdentity: string; vendorSessionID: string | null
  status: 'running' | 'ready' | 'blocked' | 'archived'; reason: string | null
  stepID: string; throughSeq: number; historyHash: string
  createdAt: number; updatedAt: number
}

export interface FreshCliConversation { conversationID: string; revision: number; key: string }

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/**
 * How a prompt waits in a session's inbox.
 *
 * `steer` wants the next safe boundary and is delivered ahead of anything
 * queued. `queue` waits for the session to go idle. Neither one interrupts a
 * run: the command that is going keeps going, and the prompt lands after it.
 */
export type DeliveryMode = 'steer' | 'queue'

export type InboxState = 'pending' | 'delivered' | 'cancelled'

/**
 * One prompt, from the moment it is admitted to the moment it is delivered.
 *
 * The item is durable before the message exists: `pending` means the model
 * has not been shown it yet, `delivered` means the transcript has it. `key` is
 * the client's idempotency key: admitting the same key twice returns the first
 * item instead of writing a second one.
 */
export interface InboxItem {
  id: string
  sessionID: string
  /** Admission order inside the session. */
  seq: number
  text: string
  mode: DeliveryMode
  state: InboxState
  key: string | null
  admittedAt: number
  deliveredAt: number | null
  messageID: string | null
  model?: string
}

/** A pre-prompt workspace tree and the exact active conversation at that boundary. */
export interface Checkpoint {
  id: string
  sessionID: string
  promptID: string | null
  kind: 'prompt' | 'safety'
  label: string
  cwd: string
  commit: string
  tree: string
  ref: string
  messageIDs: string[]
  at: number
}

export interface GitEntry { mode: string; hash: string }
export interface Rewind {
  id: string
  sessionID: string
  checkpointID: string
  safetyCheckpointID: string
  key: string
  state: 'pending' | 'completed'
  plan: { path: string; before: GitEntry | null; after: GitEntry | null }[]
  error: string | null
  at: number
  completedAt: number | null
}

export interface WorkspaceEntry { path: string; name: string; kind: 'file' | 'directory' | 'symlink'; bytes: number }
export interface WorkspaceDirectory { path: string; entries: WorkspaceEntry[]; truncated: boolean }
export interface WorkspaceFile { path: string; text: string; bytes: number; binary: boolean; truncated: boolean; digest: string }
export interface FileChange { path: string; previousPath?: string; status: string; staged: boolean; unstaged: boolean }
export interface WorkspaceReview {
  available: boolean; reason: string | null; root: string; branch: string; base: string; baseCommit: string
  revision: string; files: FileChange[]; patch: string; stagedPatch: string; workingPatch: string; truncated: boolean
}
export interface BrowserPage { url: string; title: string; text: string; links: { label: string; url: string }[]; truncated: boolean; scripted: boolean }
export interface SkillOrigin { source: string; scope: 'user' | 'project'; path: string; managed: boolean; linked: boolean }
export interface SkillInfo { id: string; name: string; description: string; path: string; bytes: number; updatedAt: number; hash: string; enabled: boolean; invoke: string; origins: SkillOrigin[] }
export interface SkillInventory { revision: number; skills: SkillInfo[]; warnings: string[]; truncated: boolean; scannedAt: number }
export interface SkillSelection { skillID: string; hash: string }
export interface SkillDocument { skill: SkillInfo; raw: string; markdown: string }
export interface PairedDevice { id: string; name: string; createdAt: number; expiresAt: number }
export interface PairingGrant { id: string; expiresAt: number; state: 'pending' | 'expired' | 'canceled' | 'redeemed' }
export interface PairingState { revision: number; devices: PairedDevice[]; grants: PairingGrant[] }
export interface PairingTicket extends PairingGrant { payload: string; links: string[] }
export interface PairingInvitation extends PairingTicket { qr: string }
export interface PairingConnection { type: 'hiroshi.connection'; version: 1; server: { id: string; name: string; version: string; protocol: number; transport: 'http-sse'; capabilities: string[] }; token: string; device: PairedDevice }

export interface ModelToolRequest { id: string; name: string; arguments: string }

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
}

export type AccessMode = 'ask' | 'edits' | 'auto' | 'full'
export interface AccessSettings { mode: AccessMode; revision: number }
export interface AccessReview {
  toolCallID: string; sessionID: string; revision: number; inputHash: string; model: string
  usage?: UsageCounters; vendorSessionID?: string
  status: 'running' | 'allow' | 'ask'; reason: string; at: number
}
export type PermissionAction = 'allow' | 'ask' | 'deny'

export interface Permission {
  id: string
  sessionID: string
  toolCallID: string
  tool: string
  input: string
  cwd: string
  revision: string
  state: 'pending' | 'answered'
  decision: 'allow' | 'deny' | null
  remember: boolean
  createdAt: number
  answeredAt: number | null
}

export interface SavedPermission {
  id: string
  scope: string
  decision: 'allow' | 'deny'
  at: number
}

export interface Message {
  id: string
  sessionID: string
  /** Monotonic inside a session. */
  seq: number
  role: MessageRole
  text: string
  at: number
  /** The delivery mode the prompt arrived with, when it came through the inbox. */
  mode?: DeliveryMode
  model?: string
  rewindID?: string
  providerState?: { provider: 'openai' | 'anthropic'; value: unknown }[]
  stepID?: string
  toolCalls?: ModelToolRequest[]
  toolResult?: { callID: string; toolCallID: string; status: ToolStatus }
}

/** Source values are sent to the provider; only hashes enter the context ledger. */
export interface InstructionSource {
  source: string
  text: string
  scope?: string
  hash?: string
}

export interface InstructionHash {
  source: string
  hash: string
  scope?: string
  delivery?: 'supplied' | 'native-unverified'
}
export interface ConfigurationReport {
  error?: string
  admittedModel?: string
  settings: { defaultModel?: string; compaction?: boolean }
  provenance: { setting: 'defaultModel' | 'compaction'; source: string }[]
  sources: InstructionHash[]
  warnings: string[]
}

export interface Compaction {
  id: string
  sessionID: string
  stepID: string
  /** Inclusive durable message sequence replaced in active history only. */
  throughSeq: number
  retainedFromSeq: number
  text: string
  reason: 'budget' | 'provider_overflow'
  at: number
}

export interface StepContext {
  configuration?: ConfigurationReport
  id: string
  sessionID: string
  stepID: string
  attempt: number
  sources: InstructionHash[]
  /** Added, edited and removed source names, without rendered instruction prose. */
  changed: string[]
  estimatedInput: number
  reservedOutput: number
  window: number
  compactionID: string | null
  at: number
}

export interface Run {
  id: string
  sessionID: string
  command: string
  cwd: string
  /** The shell that ran it, or the one that will run it. */
  shell: string
  status: RunStatus
  exitCode: number | null
  /**
   * Why the run did not finish on its own, when there is a reason to give:
   * a spawn failure, an operator's interrupt or a crash. A plain non-zero
   * exit is not an error; the exit code says it.
   */
  error: string | null
  startedAt: number
  endedAt: number | null
}

export type OutputStream = 'stdout' | 'stderr'

export interface RunChunk {
  runID: string
  seq: number
  stream: OutputStream
  data: string
  at: number
}

/**
 * How a step ended. A step is not retried after it succeeds or is stopped.
 *
 * `cancelled` belongs to the operator: an interrupt aborted the provider
 * stream. A failure the engine could not retry ends `failed`.
 */
export type StepStatus = 'running' | 'succeeded' | 'failed' | 'cancelled'

/**
 * Why a step failed, in terms a client can switch on.
 *
 * `retryable` says whether the failure was one of the narrow kinds the engine
 * retries on its own (a rate limit, a transport failure with no output). It is
 * what the engine decided, not a promise that another attempt would help.
 */
export interface StepError {
  code: string
  message: string
  retryable: boolean
}

/**
 * One model call, durable before it streams.
 *
 * A step is the unit of allowance: it is written down with `status: running`
 * and the daemon's `claim` before the provider is asked for anything, so a
 * crash leaves a record that names the work that was in flight. A retry keeps
 * the same step and increments `attempt`; it never creates a second step and
 * never replays output that already reached the transcript.
 *
 * `messageID` is the user message the step answers. `output` is the bounded
 * text produced so far; the assistant message is written only when the step
 * completes.
 */
export interface Step {
  id: string
  /** Each continuation is another durable model call, never an in-memory loop. */
  parentID?: string
  sessionID: string
  messageID: string | null
  provider: string
  model: string
  /** 1-based. A retry of the same step increments this. */
  attempt: number
  status: StepStatus
  /** The daemon pid that owns the running step, so a claim is visible. */
  claim: number | null
  output: string
  truncated: boolean
  error: StepError | null
  startedAt: number
  endedAt: number | null
}

export type ToolStatus = 'queued' | 'waiting' | 'running' | 'succeeded' | 'failed' | 'denied' | 'cancelled' | 'interrupted'

/**
 * One effect, durable before it happens.
 *
 * The shell is the first tool: a run writes its tool call before the process
 * is spawned, and the call ends with the run. Later tools will fill the same
 * record, which is why `stepID` exists even though a client-started run has
 * none. A call that is still `running` when the engine dies is ended
 * explicitly on the next start; it is never replayed.
 */
export interface ToolCall {
  id: string
  /** Optional on legacy operator-started shell runs. */
  callID?: string
  messageID?: string
  resultMessageID?: string
  cwd?: string
  revision?: string
  definition?: ToolDefinition
  output?: string
  outputPath?: string
  truncated?: boolean
  decisionSource?: string
  sessionID: string
  stepID: string | null
  runID: string | null
  tool: string
  /** The tool's input as text. For `shell`, the command. */
  input: string
  status: ToolStatus
  /** Why the call did not succeed, when there is a reason. */
  error: string | null
  createdAt: number
  endedAt: number | null
}

/**
 * The payload each durable event carries.
 *
 * This table is the whole of what the engine can publish: `EventType` is
 * derived from it, `EngineEvent` is derived from it, and the store checks the
 * payload of every `record()` against it. Adding an event means adding one row
 * here; nothing else in the protocol has to learn about it.
 */
export interface EventPayloads {
  'access.updated': { access: AccessSettings }
  'access.reviewed': { review: AccessReview }
  'cli.updated': { conversation: CliConversation | null }
  'providers.updated': { providers: ProviderState }
  'execution.updated': { execution: Execution }
  'session.created': { session: Session }
  'session.updated': { session: Session }
  'prompt.admitted': { item: InboxItem }
  'prompt.delivered': { item: InboxItem; message: Message; checkpoint?: Checkpoint }
  'context.compacted': { compaction: Compaction }
  'context.prepared': { context: StepContext }
  'step.part': { part: StepPart }
  'step.started': { step: Step }
  'step.resumed': { step: Step; reason: string }
  'step.retry': { step: Step; delay: number; error: StepError }
  'step.output': { stepID: string; data: string }
  'step.completed': { step: Step; message: Message | null; toolCalls?: ToolCall[] }
  'step.failed': { step: Step }
  'step.cancelled': { step: Step }
  'checkpoint.created': { checkpoint: Checkpoint }
  'checkpoint.failed': { itemID: string; error: string }
  'rewind.started': { rewind: Rewind }
  'rewind.failed': { rewind: Rewind }
  'rewind.completed': { rewind: Rewind; message: Message; activeMessageIDs: string[]; cancelledInboxIDs: string[] }
  'tool.updated': { call: ToolCall; message?: Message }
  'permission.requested': { permission: Permission; call: ToolCall }
  'permission.answered': { permission: Permission; saved?: SavedPermission }
  'run.started': { run: Run; toolCall: ToolCall | null }
  'run.output': { runID: string; stream: OutputStream; data: string }
  'run.truncated': { runID: string; limit: number }
  'run.ended': { run: Run; toolCall: ToolCall | null }
}

export type EventType = keyof EventPayloads

/**
 * One durable fact, as the feed publishes it.
 *
 * A union rather than `{ type: EventType; data: unknown }`, so a subscriber
 * that switches on `type` sees the payload without a cast and a new event
 * cannot be published with the wrong body.
 */
export type EngineEvent = {
  [Type in EventType]: {
    seq: number
    type: Type
    at: number
    sessionID: string | null
    runID: string | null
    data: EventPayloads[Type]
  }
}[EventType]

/** A session and everything the engine has committed about it. */
export interface SessionDetail {
  configuration?: ConfigurationReport
  access?: AccessSettings
  accessReviews?: AccessReview[]
  cliConversation?: CliConversation | null
  executions?: Execution[]
  /** Ordered from the durable event log, including retries and boundaries. */
  transcript?: TranscriptEntry[]
  session: Session
  messages: Message[]
  runs: Run[]
  chunks: RunChunk[]
  /** Prompts admitted but not delivered yet, oldest first. */
  inbox: InboxItem[]
  /** Model calls, oldest first. */
  steps: Step[]
  /** Effects recorded before they ran, oldest first. */
  toolCalls: ToolCall[]
  compactions: Compaction[]
  contexts: StepContext[]
  parts: StepPart[]
  permissions: Permission[]
  checkpoints: Checkpoint[]
  rewinds: Rewind[]
  activeMessageIDs: string[]
  checkpointError: string | null
  /** The watermark this snapshot was read at. Subscribe with `after: seq`. */
  seq: number
}

export interface TranscriptEntry {
  seq: number
  kind: 'user' | 'markdown' | 'reasoning' | 'code' | 'boundary'
  text: string
  messageID?: string
  stream?: string
}

export interface RunDetail {
  run: Run
  chunks: RunChunk[]
}

export interface CreateSessionRequest {
  projectless?: boolean
  /** Attach to the latest session for this workspace, creating it only if absent. */
  reuseWorkspace?: boolean
  title?: string
  cwd?: string
}

export interface PromptRequest {
  text: string
  /** Catalog model chosen when this prompt is admitted. */
  model?: string
  /** Defaults to `queue`: it waits until the session has no run going. */
  mode?: DeliveryMode
  /**
   * The client's idempotency key. A retry with the same key is a no-op: the
   * first admission wins, even after it has been delivered.
   */
  key?: string
}

export interface InterruptRequest {
  /** Why the operator stopped the session; it is written into each run. */
  reason?: string
}

export interface StartRunRequest {
  command: string
  cwd?: string
}

export interface SessionsResponse {
  sessions: Session[]
}

/** A command that names a session. The `id` is the path, not the body. */
export interface SessionRef {
  id: string
}

/** A command that names a run. The `id` is the path, not the body. */
export interface RunRef {
  id: string
}

/** A command that carries nothing. */
export type NoInput = Record<string, never>

export type PromptInput = SessionRef & PromptRequest

export type InterruptInput = SessionRef & InterruptRequest

export type StartRunInput = SessionRef & StartRunRequest

/**
 * Every command: what it takes and what it answers.
 *
 * This table is types only. The runtime side is `operations` below, and the
 * two are tied together by `OperationName`, so a row cannot name a command
 * without a shape and a client method cannot take the wrong body.
 */
export interface OperationShapes {
  pairingState: { request: NoInput; response: PairingState }
  createPairing: { request: { address?: string; remote?: boolean }; response: PairingInvitation }
  internetSettings: { request: NoInput; response: InternetSettings }
  updateInternet: { request: { revision: number; enabled: boolean }; response: InternetSettings }
  cancelPairing: { request: { grantID: string }; response: PairingState }
  revokePairedDevice: { request: { deviceID: string; revision: number }; response: PairingState }
  skills: { request: SessionRef; response: SkillInventory }
  skillDocument: { request: SessionRef & SkillSelection; response: SkillDocument }
  updateSkill: { request: SessionRef & SkillSelection & { revision: number; enabled: boolean }; response: SkillInventory }
  removeSkill: { request: SessionRef & SkillSelection & { revision: number; origin: string }; response: { inventory: SkillInventory; removedTo: string } }
  updateAccess: { request: SessionRef & AccessSettings; response: AccessSettings }
  usageReport: { request: SessionRef & UsageQuery; response: UsageReport }
  updateUsagePricing: { request: UsagePricingUpdate; response: { revision: number } }
  networkSettings: { request: NoInput; response: NetworkSettings }
  updateNetwork: { request: NetworkUpdate; response: NetworkSettings }
  networkToken: { request: NoInput; response: { token: string } }
  rotateNetworkToken: { request: { revision: number }; response: NetworkSettings }
  freshCliConversation: { request: SessionRef & FreshCliConversation; response: { conversation: CliConversation | null } }
  projects: { request: NoInput; response: { projects: ProjectInfo[] } }
  openProject: { request: { cwd: string }; response: { session: Session } }
  providers: { request: NoInput; response: ProviderState }
  refreshProviders: { request: SessionRef; response: ProviderState }
  cancelProviderRefresh: { request: NoInput; response: ProviderState }
  updateProviders: { request: ProviderUpdate; response: ProviderState }
  workspaceList: { request: SessionRef & { path?: string }; response: WorkspaceDirectory }
  workspaceFile: { request: SessionRef & { path: string }; response: WorkspaceFile }
  workspaceReview: { request: SessionRef & { base?: string }; response: WorkspaceReview }
  workspaceCommit: { request: SessionRef & { revision: string; base?: string; message: string; includeUnstaged: boolean; push: boolean; pushOnly?: boolean }; response: { run: Run } }
  browse: { request: SessionRef & { url: string }; response: BrowserPage }

  rewind: { request: SessionRef & { checkpointID: string; key: string }; response: { rewind: Rewind } }
  answerPermission: { request: { id: string; decision: 'allow' | 'deny'; remember?: boolean }; response: { permission: Permission } }
  toolOutput: { request: { id: string }; response: { path: string; text: string } }
  models: { request: NoInput; response: { models: ModelInfo[]; defaultModel: string } }
  health: { request: NoInput; response: Health }
  listSessions: { request: NoInput; response: SessionsResponse }
  createSession: { request: CreateSessionRequest; response: { session: Session } }
  session: { request: SessionRef; response: SessionDetail }
  prompt: { request: PromptInput; response: { item: InboxItem; message: Message | null } }
  interrupt: { request: InterruptInput; response: { runs: Run[]; steps: Step[] } }
  startRun: { request: StartRunInput; response: { run: Run } }
  run: { request: RunRef; response: RunDetail }
  cancelRun: { request: RunRef; response: { run: Run } }
  shutdown: { request: NoInput; response: { ok: boolean } }
}

export type OperationName = keyof OperationShapes

export type OperationRequest<Name extends OperationName> = OperationShapes[Name]['request']

export type OperationResponse<Name extends OperationName> = OperationShapes[Name]['response']

/**
 * One row of the route table.
 *
 * `:name` segments come from the request and are consumed; whatever the
 * request has left over is the body. The daemon matches the same rows, so a
 * path is written once and both sides read it from here.
 */
export interface Operation<Name extends OperationName = OperationName> {
  readonly name: Name
  readonly method: 'GET' | 'POST'
  readonly path: string
  /** The status a success answers with. `200` when the row omits it. */
  readonly status?: number
}

export const operations: readonly Operation[] = [
  { name: 'internetSettings', method: 'GET', path: '/v1/internet' },
  { name: 'updateInternet', method: 'POST', path: '/v1/internet' },
  { name: 'pairingState', method: 'GET', path: '/v1/network/pairing' },
  { name: 'createPairing', method: 'POST', path: '/v1/network/pairing/create' },
  { name: 'cancelPairing', method: 'POST', path: '/v1/network/pairing/cancel' },
  { name: 'revokePairedDevice', method: 'POST', path: '/v1/network/devices/revoke' },
  { name: 'skills', method: 'POST', path: '/v1/sessions/:id/skills' },
  { name: 'skillDocument', method: 'POST', path: '/v1/sessions/:id/skills/document' },
  { name: 'updateSkill', method: 'POST', path: '/v1/sessions/:id/skills/update' },
  { name: 'removeSkill', method: 'POST', path: '/v1/sessions/:id/skills/remove' },
  { name: 'updateAccess', method: 'POST', path: '/v1/sessions/:id/access' },
  { name: 'usageReport', method: 'POST', path: '/v1/sessions/:id/usage' },
  { name: 'updateUsagePricing', method: 'POST', path: '/v1/usage/pricing' },
  { name: 'networkSettings', method: 'GET', path: '/v1/network' },
  { name: 'updateNetwork', method: 'POST', path: '/v1/network/settings' },
  { name: 'networkToken', method: 'POST', path: '/v1/network/token' },
  { name: 'rotateNetworkToken', method: 'POST', path: '/v1/network/rotate' },
  { name: 'freshCliConversation', method: 'POST', path: '/v1/sessions/:id/cli/fresh' },
  { name: 'projects', method: 'GET', path: '/v1/projects' },
  { name: 'openProject', method: 'POST', path: '/v1/projects/open' },
  { name: 'providers', method: 'GET', path: '/v1/providers' },
  { name: 'refreshProviders', method: 'POST', path: '/v1/sessions/:id/providers/refresh' },
  { name: 'cancelProviderRefresh', method: 'POST', path: '/v1/providers/cancel' },
  { name: 'updateProviders', method: 'POST', path: '/v1/providers/settings' },
  { name: 'workspaceList', method: 'POST', path: '/v1/sessions/:id/workspace/list' },
  { name: 'workspaceFile', method: 'POST', path: '/v1/sessions/:id/workspace/file' },
  { name: 'workspaceReview', method: 'POST', path: '/v1/sessions/:id/workspace/review' },
  { name: 'workspaceCommit', method: 'POST', path: '/v1/sessions/:id/workspace/commit' },
  { name: 'browse', method: 'POST', path: '/v1/sessions/:id/browser' },
  { name: 'rewind', method: 'POST', path: '/v1/sessions/:id/rewind' },
  { name: 'answerPermission', method: 'POST', path: '/v1/permissions/:id/answer' },
  { name: 'toolOutput', method: 'GET', path: '/v1/tools/:id/output' },
  { name: 'models', method: 'GET', path: '/v1/models' },
  { name: 'health', method: 'GET', path: '/v1/health' },
  { name: 'listSessions', method: 'GET', path: '/v1/sessions' },
  { name: 'createSession', method: 'POST', path: '/v1/sessions', status: 201 },
  { name: 'session', method: 'GET', path: '/v1/sessions/:id' },
  { name: 'prompt', method: 'POST', path: '/v1/sessions/:id/messages', status: 201 },
  { name: 'interrupt', method: 'POST', path: '/v1/sessions/:id/interrupt' },
  { name: 'startRun', method: 'POST', path: '/v1/sessions/:id/runs', status: 201 },
  { name: 'run', method: 'GET', path: '/v1/runs/:id' },
  { name: 'cancelRun', method: 'POST', path: '/v1/runs/:id/cancel' },
  { name: 'shutdown', method: 'POST', path: '/v1/shutdown' },
]

/**
 * The one feed. It is not a command: it answers with a stream rather than a
 * body, so it is not a row of the table above.
 */
export const FEED_PATH = '/v1/events'

/**
 * The frame names the feed sends besides events.
 *
 * An event frame has no name and carries one `EngineEvent` in its `data`. The
 * two named frames are the feed talking about itself: the watermark it opened
 * at, and the reason a connection is about to close.
 */
export const FEED_HELLO = 'hello'
export const FEED_OVERFLOW = 'overflow'

/**
 * The first frame on every feed: the durable edge the connection opened at.
 *
 * A client compares `lastSeq` with the watermark it asked from. `lastSeq`
 * ahead of `after` means the replay will fill the gap; `lastSeq` behind
 * `after` means the log lost ground (a different database) and replaying
 * cannot help, so the client has to take a fresh snapshot instead.
 */
export interface FeedHello {
  /** The newest durable sequence when this connection opened. */
  lastSeq: number
  /** The watermark the client asked from, echoed for the log. */
  after: number
}

/**
 * The last frame a connection sees before the feed closes it.
 *
 * A queue that overflows loses one connection, not the run: the client knows
 * the last sequence it applied and reconnects from it.
 */
export interface FeedOverflow {
  reason: 'client_too_slow'
  /** Frames one connection's queue holds before it is dropped. */
  capacity: number
}

export interface OperationMatch {
  operation: Operation
  /** The path segments the template named. */
  params: Record<string, string>
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/**
 * Find the row a request names, or nothing.
 *
 * Pure string work, no runtime imports: the daemon routes on the result and
 * the client builds its paths from the same rows.
 */
export function matchOperation(method: string, pathname: string): OperationMatch | null {
  const verb = method.toUpperCase()
  const segments = pathname.split('/').filter((segment) => segment.length > 0)

  for (const operation of operations) {
    if (operation.method !== verb) continue
    const pattern = operation.path.split('/').filter((segment) => segment.length > 0)
    if (pattern.length !== segments.length) continue

    const params: Record<string, string> = {}
    let matched = true
    for (let index = 0; index < pattern.length; index += 1) {
      const expected = pattern[index]!
      const actual = segments[index]!
      if (expected.startsWith(':')) {
        const value = decode(actual)
        if (value === null) {
          matched = false
          break
        }
        params[expected.slice(1)] = value
      } else if (expected !== actual) {
        matched = false
        break
      }
    }

    if (matched) return { operation, params }
  }

  return null
}

/** The discovery contract: what a live daemon writes next to its database. */
export interface RegistryRecord {
  name: string
  version: string
  protocol: number
  url: string
  host: string
  port: number
  pid: number
  token: string
  startedAt: number
  database: string
  log: string
}

export interface ErrorBody {
  error: {
    code: string
    message: string
  }
}
