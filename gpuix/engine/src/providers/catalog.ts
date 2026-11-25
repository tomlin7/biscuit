/** The only adapter registration table. Credentials never leave this module. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProviderError, type Provider, type RemoteModelOptions } from '../provider'
import type { ExecutionLimits, ModelInfo } from '../protocol'
import { CliProvider, agyPolicyReady } from './cli'
import { validCommand } from './discovery'
import { LocalProvider } from './local'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'

export interface ModelConfig {
  id: string
  model: string
  label: string
  contextWindow: number
  reservedOutput: number
}
export interface ProviderConfig {
  id: string
  adapter: string
  apiKeyEnv?: string
  baseURL?: string
  /** Explicit executable, optionally followed by an absolute JS entry point. No shell wrappers. */
  command?: string[]
  trustWorkspace?: boolean
  cliVersion?: string | null
  enabled?: boolean
  unavailable?: boolean
  models: ModelConfig[]
}
export interface ProvidersConfig {
  defaultModel?: string
  providers?: ProviderConfig[]
  policy?: { provider: string; action: 'allow' | 'deny' }[]
}

type Factory = (options: RemoteModelOptions) => Provider
const adapters: Record<string, { endpoint: string; credential: string; create: Factory }> = {
  openai: { endpoint: 'https://api.openai.com/v1', credential: 'OPENAI_API_KEY', create: (options) => new OpenAIProvider(options) },
  anthropic: { endpoint: 'https://api.anthropic.com/v1', credential: 'ANTHROPIC_API_KEY', create: (options) => new AnthropicProvider(options) },
}

export function readProvidersConfig(home: string): ProvidersConfig {
  try {
    const value = JSON.parse(readFileSync(join(home, 'providers.json'), 'utf8'))
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('shape')
    return value
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    // Do not echo parser errors: they can contain the configuration contents.
    throw new ProviderError('provider_configuration', 'providers.json must contain a valid configuration object')
  }
}

export class ProviderCatalog {
  readonly defaultModel: string
  readonly #models = new Map<string, { info: ModelInfo; provider: Provider }>()

  constructor(config: ProvidersConfig = {}, env: Record<string, string | undefined> = process.env, local = new LocalProvider(), limits?: ExecutionLimits) {
    if (config.policy !== undefined && !Array.isArray(config.policy)) throw new ProviderError('provider_configuration', 'policy must be an array')
    const denied = (provider: string) => {
      let result = false
      for (const rule of config.policy ?? []) {
        if (!rule || typeof rule.provider !== 'string' || !['allow', 'deny'].includes(rule.action)) {
          throw new ProviderError('provider_configuration', 'provider policy needs provider and allow/deny action')
        }
        if (rule.provider === '*' || rule.provider === provider) result = rule.action === 'deny'
      }
      return result
    }
    const add = (info: ModelInfo, provider: Provider) => {
      if (this.#models.has(info.id)) throw new ProviderError('provider_configuration', 'duplicate catalog model id')
      const reason = info.reason
      const check = () => {
        if (reason) throw new ProviderError(reason, reason === 'provider_denied'
          ? 'this provider is denied by local policy' : reason === 'provider_disabled' ? 'this provider is disabled; enable it in Providers'
            : reason === 'cli_unavailable' ? 'the CLI is missing, changed or signed out; refresh Providers'
            : reason === 'cli_policy_required'
            ? 'Agy response-only mode requires strict tool permissions and explicit write/command/MCP/browser denials; see provider configuration'
            : 'this provider needs a local credential')
        provider.check?.()
      }
      this.#models.set(info.id, { info, provider: {
        check,
        replayAfterRestart: provider.replayAfterRestart,
        nativeInstructions: provider.nativeInstructions,
        cliIdentity: provider.cliIdentity,
        name: info.provider, model: info.id, context: { window: info.contextWindow, reservedOutput: info.reservedOutput },
        stream: async (request, onText, onPart) => {
          check()
          await provider.stream(request, onText, onPart)
        },
      } })
    }
    add({ id: 'local/echo', provider: 'local', label: 'Local echo', contextWindow: 32768, reservedOutput: 1024,
      reason: denied('local') ? 'provider_denied' : null }, local)
    const ids = new Set(['local'])
    if (config.providers !== undefined && !Array.isArray(config.providers)) throw new ProviderError('provider_configuration', 'providers must be an array')
    for (const entry of config.providers ?? []) {
      if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(entry.id) || ids.has(entry.id)) {
        throw new ProviderError('provider_configuration', 'provider ids must be unique lowercase names')
      }
      ids.add(entry.id)
      if ((entry.enabled !== undefined && typeof entry.enabled !== 'boolean') || (entry.unavailable !== undefined && typeof entry.unavailable !== 'boolean')) throw new ProviderError('provider_configuration', 'enabled and unavailable must be booleans')
      const cli = entry.adapter === 'agy-cli' ? 'agy' : entry.adapter === 'cursor-cli' ? 'cursor' : entry.adapter === 'pi-cli' ? 'pi' : entry.adapter === 'grok-cli' ? 'grok' : null
      if (entry.trustWorkspace !== undefined && typeof entry.trustWorkspace !== 'boolean') throw new ProviderError('provider_configuration', 'trustWorkspace must be a boolean')
      const adapter = Object.hasOwn(adapters, entry.adapter) ? adapters[entry.adapter] : undefined
      if ((!adapter && !cli) || !Array.isArray(entry.models) || entry.models.length === 0) {
        throw new ProviderError('provider_configuration', 'each provider needs a registered adapter and models')
      }
      if (cli && !validCommand(entry.command)) {
        throw new ProviderError('provider_configuration', 'CLI command needs an absolute executable, optionally followed by an absolute JavaScript entry point; shell wrappers and extra flags are unsupported')
      }
      if (cli && entry.cliVersion !== undefined && entry.cliVersion !== null && (typeof entry.cliVersion !== 'string' || !/^\d{1,4}\.\d{1,3}\.\d{1,3}(?:-[a-zA-Z0-9.-]{1,64})?$/.test(entry.cliVersion))) {
        throw new ProviderError('provider_configuration', 'cliVersion must be an observed bounded version string')
      }
      const credential = entry.apiKeyEnv ?? adapter?.credential ?? 'UNUSED'
      if (!cli && (typeof credential !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(credential))) {
        throw new ProviderError('provider_configuration', 'apiKeyEnv must name an environment variable')
      }
      let endpoint: URL
      try { endpoint = new URL(entry.baseURL ?? adapter?.endpoint ?? 'https://unused.invalid') } catch { throw new ProviderError('provider_configuration', 'invalid provider baseURL') }
      if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
        (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)))) {
        throw new ProviderError('provider_configuration', 'provider URLs need HTTPS or loopback HTTP, without credentials or query strings')
      }
      for (const model of entry.models) {
        if (!model || typeof model.id !== 'string' || !/^[a-zA-Z0-9_.-]{1,128}$/.test(model.id) ||
          typeof model.model !== 'string' || model.model.length === 0 || model.model.length > 256 ||
          typeof model.label !== 'string' || !model.label || model.label.length > 128 ||
          !Number.isSafeInteger(model.contextWindow) || !Number.isSafeInteger(model.reservedOutput) ||
          model.reservedOutput < 1 || model.contextWindow <= model.reservedOutput) {
          throw new ProviderError('provider_configuration', 'models need ids, labels and positive context/output limits')
        }
        const id = `${entry.id}/${model.id}`
        const apiKey = env[credential]?.trim() ?? ''
        const reason = denied(entry.id) ? 'provider_denied' : entry.enabled === false ? 'provider_disabled' : entry.unavailable ? 'cli_unavailable'
          : cli ? cli === 'agy' && !agyPolicyReady(env) ? 'cli_policy_required' : null : !apiKey ? 'credentials_missing' : null
        const context = { window: model.contextWindow, reservedOutput: model.reservedOutput }
        add({ id, provider: entry.id, label: cli ? `${model.label} · response only${reason === 'cli_policy_required' ? ' · policy required' : ''}` : model.label,
          contextWindow: model.contextWindow, reservedOutput: model.reservedOutput, reason },
          cli ? new CliProvider({ name: entry.id, model: id, providerModel: model.model, adapter: cli, command: entry.command!, context, env, limits, trustWorkspace: entry.trustWorkspace, cliVersion: entry.cliVersion })
            : adapter!.create({ name: entry.id, model: id, providerModel: model.model, apiKey,
              baseURL: endpoint.href.replace(/\/$/, ''), context }))
      }
    }
    this.defaultModel = config.defaultModel ?? 'local/echo'
    if (!this.has(this.defaultModel)) throw new ProviderError('provider_configuration', 'defaultModel must name a configured catalog model')
  }

  has(id: string): boolean { return this.#models.has(id) }
  models(): ModelInfo[] { return [...this.#models.values()].map(({ info }) => ({ ...info })) }
  resolve(id = this.defaultModel): Provider {
    const entry = this.#models.get(id)
    if (entry) return entry.provider
    // A model removed since a prompt was admitted still gets a durable failed
    // step on restart. Never silently switch it to a different provider.
    return { name: 'unavailable', model: id, async stream() {
      throw new ProviderError('model_unavailable', 'the selected model is no longer configured')
    } }
  }
}
