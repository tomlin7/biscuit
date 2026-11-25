/** User-owned settings + observed inventory. No discovery or auth I/O at
 * startup, no invented availability, and no prompt during a refresh. */
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AgentID, AgentInfo, ProviderState, ProviderUpdate } from '../protocol'
import type { Provider } from '../provider'
import { ProviderError } from '../provider'
import { conflict, invalid } from '../errors'
import type { Store } from '../store'
import type { ExecutionBudget } from '../execution'
import { ProviderCatalog, readProvidersConfig } from './catalog'
import { LocalProvider } from './local'
import { AGENTS, discoverCommand, fingerprint, validCommand } from './discovery'
import { probe } from './probe'
import { agyPolicyReady } from './cli'

interface Preference { enabled: boolean; command?: string[]; trustWorkspace?: boolean }
interface Saved { version: 1; revision: number; defaultModel?: string; preferences: Partial<Record<AgentID, Preference>>; agents: AgentInfo[] }
const empty = (id: AgentID, name: string): AgentInfo => ({ id, name, enabled: true, trustWorkspace: false, command: null, source: null, version: null, fingerprint: null,
  checkedAt: null, auth: 'unknown', status: 'unchecked', detail: 'Not checked. Refresh to inspect this CLI.', models: [],
  capabilities: { responses: false, coding: false, nativeContinuation: false, approvals: false, cancellation: false, instructions: 'unknown' } })
const required: Record<AgentID, string[]> = {
  agy: ['--input-format', '--output-format', '--disable-slash-commands', '--conversation'],
  cursor: ['--print', '--stream-partial-output', '--mode', '--resume'],
  pi: ['--mode', '--no-extensions', '--no-mcp', '--no-tools', '--session', '--no-approve'],
  grok: ['--tools', '--deny', '--no-subagents', '--prompt-file', '--output-format', '--session-id', '--resume'],
}
function modelIDs(output: string): { id: string; label: string }[] {
  const models: { id: string; label: string }[] = []
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s*(?:[-*•]\s*)?([a-z0-9][a-z0-9_.:/-]{0,120})\s+(?:-\s+)?(.{1,100})$/i.exec(line)
    if (!match || ['provider', 'model', 'available', 'id'].includes(match[1]!.toLowerCase()) || /@|credential|secret|token|error|sign.in/i.test(match[2]!)) continue
    if (!models.some((model) => model.id === match[1])) models.push({ id: match[1]!, label: match[2]! })
    if (models.length >= 64) break
  }
  return models
}

export class ProviderRegistry {
  #saved: Saved
  #catalog!: ProviderCatalog
  #error: string | null = null
  #refresh: AbortController | null = null
  #refreshTask: Promise<void> | null = null
  readonly #file: string
  constructor(readonly home: string, readonly store: Store, readonly budget: ExecutionBudget,
    readonly env: Record<string, string | undefined> = process.env, readonly local = new LocalProvider()) {
    this.#file = join(home, 'agents.json')
    this.#saved = { version: 1, revision: 0, preferences: {}, agents: AGENTS.map(({ id, name }) => empty(id, name)) }
    try {
      if (statSync(this.#file).size > 256 * 1024) throw new Error('size')
      const value = JSON.parse(readFileSync(this.#file, 'utf8')) as Saved
      if (value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !value.preferences || typeof value.preferences !== 'object' || Array.isArray(value.preferences)) throw new Error('shape')
      for (const [id, pref] of Object.entries(value.preferences)) {
        if (!AGENTS.some((agent) => agent.id === id) || !pref || typeof pref.enabled !== 'boolean' ||
          (pref.command !== undefined && !validCommand(pref.command)) || (pref.trustWorkspace !== undefined && typeof pref.trustWorkspace !== 'boolean')) throw new Error('settings')
      }
      if (value.defaultModel !== undefined && (typeof value.defaultModel !== 'string' || value.defaultModel.length > 256)) throw new Error('selection')
      this.#saved = { ...this.#saved, revision: value.revision, preferences: value.preferences, defaultModel: value.defaultModel }
      // Inventory is a cache, never authority for credentials or executables.
      for (const row of Array.isArray(value.agents) ? value.agents : []) {
        if (!row || typeof row !== 'object') continue
        const target = this.#saved.agents.find((agent) => agent.id === row.id)
        if (!target || !validCommand(row.command) || typeof row.fingerprint !== 'string' || fingerprint(row.command) !== row.fingerprint || !Array.isArray(row.models)) continue
        Object.assign(target, { command: row.command, fingerprint: row.fingerprint, version: typeof row.version === 'string' ? row.version.slice(0, 100) : null,
          source: this.#saved.preferences[row.id]?.command ? 'manual' : 'discovered', checkedAt: typeof row.checkedAt === 'number' && Number.isFinite(row.checkedAt) ? row.checkedAt : null,
          auth: 'unknown', status: 'installed', detail: 'Cached executable check. Refresh to revalidate sign-in and capabilities.',
          capabilities: { ...target.capabilities, responses: row.capabilities?.responses === true, cancellation: row.capabilities?.responses === true,
            nativeContinuation: row.capabilities?.nativeContinuation === true,
            instructions: row.id === 'pi' ? 'supplied-only' : 'native-and-supplied' },
          models: row.models.filter((model) => model && typeof model.id === 'string' && /^[a-z0-9_.:/-]{1,128}$/i.test(model.id) && typeof model.label === 'string' && model.label.length <= 100)
            .slice(0, 65).map((model) => this.#model(row.id, row.fingerprint!, model.id, model.label)) })
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw invalid('provider_configuration', 'agents.json must contain valid versioned provider settings')
    }
    for (const agent of this.#saved.agents) {
      agent.enabled = this.#saved.preferences[agent.id]?.enabled ?? true
      agent.trustWorkspace = this.#saved.preferences[agent.id]?.trustWorkspace ?? false
      if (!agent.enabled) { agent.status = 'disabled'; agent.detail = 'Disabled. Enable and refresh to inspect this CLI.' }
    }
    this.#rebuild()
  }
  #model(id: AgentID, hash: string, model: string, label: string) {
    return { id: model, label, catalogID: `cli_${id}/${hash}_${createHash('sha256').update(model).digest('hex').slice(0, 16)}` }
  }
  get defaultModel() { return this.#saved.defaultModel ?? this.#catalog.defaultModel }
  has(id: string) { return this.#catalog.has(id) }
  models() { return this.#catalog.models() }
  snapshot(): ProviderState {
    return structuredClone({ revision: this.#saved.revision, refreshing: this.#refresh !== null, error: this.#error,
      agents: this.#saved.agents, models: this.models(), defaultModel: this.defaultModel })
  }
  #emit() { this.store.record({ type: 'providers.updated', data: { providers: this.snapshot() } }) }
  #save() {
    const temp = `${this.#file}.${randomUUID()}.tmp`
    try { writeFileSync(temp, JSON.stringify(this.#saved), { flag: 'wx', mode: 0o600 }); renameSync(temp, this.#file) }
    finally { try { unlinkSync(temp) } catch {} }
  }
  #rebuild() {
    const config = readProvidersConfig(this.home)
    const providers = [...config.providers ?? []]
    for (const row of this.#saved.agents) {
      if (!row.command || !row.fingerprint || !row.capabilities.responses || !row.models.length) continue
      providers.push({ id: `cli_${row.id}`, adapter: `${row.id}-cli`, command: row.command, enabled: row.enabled,
        unavailable: fingerprint(row.command) !== row.fingerprint || row.auth === 'signed_out', trustWorkspace: this.#saved.preferences[row.id]?.trustWorkspace, cliVersion: row.version,
        models: row.models.map((model) => ({ id: model.catalogID.split('/')[1]!, model: model.id, label: `${row.name}: ${model.label}`,
          contextWindow: 32768, reservedOutput: 1024 })) })
    }
    this.#catalog = new ProviderCatalog({ ...config, providers }, this.env, this.local, this.budget.limits)
  }
  resolve(id = this.defaultModel): Provider {
    const provider = this.#catalog.resolve(id)
    const check = () => {
      this.#catalog.resolve(id).check?.()
      if (!this.#catalog.has(id)) throw new ProviderError('model_unavailable', 'the selected provider/model is no longer available; choose explicitly in Providers')
      const row = this.#saved.agents.find((agent) => agent.models.some((model) => model.catalogID === id))
      if (row?.command && fingerprint(row.command) !== row.fingerprint) throw new ProviderError('cli_unavailable', 'the CLI executable changed or disappeared; refresh Providers before using it')
    }
    return { ...provider, check, cliIdentity: provider.cliIdentity ? () => this.#catalog.resolve(id).cliIdentity!() : undefined, stream: async (request, onText, onPart) => {
      check()
      // Settings can change while this request waits for a shared slot.
      // Use the current adapter so revoked workspace trust is respected too.
      try { await this.#catalog.resolve(id).stream(request, onText, onPart) }
      catch (error) {
        if (error instanceof ProviderError && error.code === 'cli_authentication') {
          const row = this.#saved.agents.find((agent) => agent.models.some((model) => model.catalogID === id))
          if (row) {
            row.auth = 'signed_out'; row.status = 'signed_out'; row.detail = 'Sign-in expired or failed. Sign in with this CLI, then refresh.'
            this.#saved.revision++; this.#rebuild()
            try { this.#save() } catch { this.#error = 'Sign-in status changed, but could not be saved. Check the engine data directory.' }
            this.#emit()
          }
        }
        throw error
      }
    } }
  }
  update(input: ProviderUpdate): ProviderState {
    if (!input || !Number.isSafeInteger(input.revision) || input.revision !== this.#saved.revision) throw conflict('provider_revision', 'Provider settings changed. Reload before saving.')
    if (this.#refresh) throw conflict('provider_busy', 'Cancel or finish the current refresh before changing settings.')
    if (Object.keys(input).some((key) => !['revision', 'agent', 'enabled', 'command', 'trustWorkspace', 'defaultModel'].includes(key))) throw invalid('provider_settings', 'Unknown provider setting')
    const previous = structuredClone(this.#saved)
    try {
      if (input.agent !== undefined) {
        const row = this.#saved.agents.find((agent) => agent.id === input.agent)
        if (!row) throw invalid('provider_settings', 'Unknown agent')
        const pref = this.#saved.preferences[row.id] ?? { enabled: true }
        if (input.enabled !== undefined) {
          if (typeof input.enabled !== 'boolean') throw invalid('provider_settings', 'enabled must be boolean')
          pref.enabled = input.enabled
          row.auth = 'unknown'; row.status = input.enabled ? (row.capabilities.responses ? 'installed' : 'unchecked') : 'disabled'
          row.detail = input.enabled ? 'Enabled. Refresh to revalidate sign-in and capabilities.' : 'Disabled. No requests will be sent to this CLI.'
        }
        if (input.trustWorkspace !== undefined) { if (typeof input.trustWorkspace !== 'boolean' || row.id !== 'cursor') throw invalid('provider_settings', 'Workspace trust is only configurable for Cursor'); pref.trustWorkspace = input.trustWorkspace }
        if (input.command !== undefined) {
          if (input.command !== null && !validCommand(input.command)) throw invalid('provider_settings', 'Use an absolute executable, optionally followed by an absolute JS entry point. Shell wrappers and extra flags are unsupported.')
          if (input.command === null) delete pref.command; else pref.command = [...input.command]
          Object.assign(row, empty(row.id, row.name))
        }
        row.enabled = pref.enabled; row.trustWorkspace = pref.trustWorkspace ?? false; this.#saved.preferences[row.id] = pref
      } else if (input.command !== undefined || input.enabled !== undefined || input.trustWorkspace !== undefined) throw invalid('provider_settings', 'Choose an agent for these settings')
      this.#rebuild()
      if (input.defaultModel !== undefined) {
        if (typeof input.defaultModel !== 'string' || !this.#catalog.has(input.defaultModel)) throw invalid('unknown_model', 'Choose a model currently reported in the catalog')
        const model = this.#catalog.models().find((model) => model.id === input.defaultModel)!
        if (model.reason) throw invalid('provider_unavailable', 'This provider is disabled, blocked or unavailable. Resolve its status before selecting it.')
        this.#saved.defaultModel = input.defaultModel
      }
      this.#saved.revision++; this.#error = null; this.#save()
    } catch (error) { this.#saved = previous; this.#rebuild(); throw error }
    this.#emit()
    return this.snapshot()
  }
  cancel(): ProviderState { this.#refresh?.abort(); return this.snapshot() }
  async stop() { this.#refresh?.abort(); await this.#refreshTask }
  refresh(sessionID: string): ProviderState {
    if (this.#refresh) return this.snapshot()
    const controller = new AbortController(); this.#refresh = controller; this.#error = null; this.#saved.revision++; this.#emit()
    this.#refreshTask = this.budget.execute({ id: `providers_${randomUUID()}`, sessionID, kind: 'maintenance' }, controller.signal, async (signal) => {
      const next: AgentInfo[] = []
      for (const def of AGENTS) { signal.throwIfAborted(); next.push(await this.#inspect(def.id, def.name, signal)) }
      signal.throwIfAborted()
      const previous = this.#saved
      this.#saved = { ...this.#saved, agents: next, revision: this.#saved.revision + 1 }
      try { this.#rebuild(); this.#save() } catch (error) { this.#saved = previous; this.#rebuild(); throw error }
    }).catch(() => { this.#error = controller.signal.aborted ? 'Refresh cancelled. Previous results were kept.' : 'Refresh could not complete within its resource limits. Previous results were kept.' })
      .finally(() => { this.#refresh = null; this.#saved.revision++; this.#emit(); this.#refreshTask = null })
    return this.snapshot()
  }
  async #inspect(id: AgentID, name: string, signal: AbortSignal): Promise<AgentInfo> {
    const pref = this.#saved.preferences[id] ?? { enabled: true }
    const row = empty(id, name); row.enabled = pref.enabled; row.trustWorkspace = pref.trustWorkspace ?? false
    row.command = pref.command ?? discoverCommand(id, this.env); row.source = pref.command ? 'manual' : row.command ? 'discovered' : null
    row.checkedAt = Date.now()
    if (!row.command || !(row.fingerprint = fingerprint(row.command))) {
      row.status = pref.enabled ? 'missing' : 'disabled'; row.detail = 'Executable not found. Set an absolute executable path or install this CLI.'; return row
    }
    if (!pref.enabled) { row.status = 'disabled'; row.detail = 'Disabled. No metadata commands were run.'; return row }
    const run = (args: string[]) => probe(row.command!, args, this.home, this.env, this.budget.limits, signal)
    try {
      const safePi = ['--no-extensions', '--no-mcp', '--no-skills', '--no-prompt-templates', '--no-approve', '--offline']
      const help = await run([...(id === 'pi' ? safePi : []), '--help'])
      if (help.code !== 0 || help.timedOut || required[id].some((flag) => !(help.out + help.err).includes(flag))) {
        row.status = 'unsupported'; row.detail = 'This executable did not report the required headless and response-only flags. Check its version/path.'; return row
      }
      const version = await run([...(id === 'pi' ? safePi : []), '--version'])
      if (!version.code && !version.timedOut) row.version = /\b\d{1,4}\.\d{1,3}\.\d{1,3}(?:-[a-zA-Z0-9.-]{1,64})?\b/.exec(version.out + version.err)?.[0] ?? null
      row.capabilities = { responses: true, coding: false, nativeContinuation: true, approvals: false, cancellation: true,
        instructions: id === 'pi' ? 'supplied-only' : 'native-and-supplied' }
      const models = [this.#model(id, row.fingerprint!, 'default', 'CLI default (availability not inferred)')]
      // Agy models may be a static catalog, not proof of account access. Pi's
      // auth check needs a selected provider; never print or inspect credentials.
      if (id === 'cursor') {
        const status = await run(['status', '--format', 'json'])
        if (!status.timedOut) {
          let value: any; try { value = JSON.parse(status.out) } catch {}
          if (value?.authenticated === true || value?.isAuthenticated === true || value?.loggedIn === true) row.auth = 'authenticated'
          else if (value?.authenticated === false || value?.isAuthenticated === false || value?.loggedIn === false || /not logged in|not authenticated|sign.in required/i.test(status.out + status.err)) row.auth = 'signed_out'
        }
      }
      if (id !== 'pi') {
        const listing = await run(['models'])
        if (listing.code === 0 && !listing.timedOut) {
          for (const model of modelIDs(listing.out + listing.err)) if (model.id !== 'default') models.push(this.#model(id, row.fingerprint!, model.id, model.label))
        } else if (/not logged in|authentication required|sign.in required|unauthorized/i.test(listing.out + listing.err)) row.auth = 'signed_out'
      }
      row.models = models
      row.status = row.auth === 'signed_out' ? 'signed_out' : id === 'agy' && !agyPolicyReady(this.env) ? 'blocked' : row.auth === 'authenticated' ? 'ready' : 'installed'
      row.detail = row.status === 'blocked' ? 'Strict Agy permissions and side-effect denials are required; see provider setup.'
        : row.auth === 'signed_out' ? 'Sign in using this CLI, then refresh.' : row.auth === 'unknown' ? 'Installed; sign-in/model access is unknown. No AI request was made.' : 'Signed in. Response-only conversations are available.'
      return row
    } catch (error) {
      signal.throwIfAborted(); row.status = 'unsupported'; row.models = []; row.capabilities.responses = false
      row.detail = 'Metadata probe failed or exceeded its output/process limits. Check the executable and refresh.'; return row
    }
  }
}
