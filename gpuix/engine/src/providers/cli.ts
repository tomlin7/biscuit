/** Contract v2: one bounded response-only submission, never a shell command.
 * A CLI owns its auth. Raw diagnostic prose and arbitrary vendor fields are
 * deliberately excluded from durable events. Native continuation is always
 * selected by an engine-owned identifier, never a vendor's latest session. */
import { createHash } from 'node:crypto'
import { fingerprint } from './discovery'
import { existsSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { spawnOwned } from '../process'
import { DEFAULT_EXECUTION_LIMITS } from '../execution'
import type { AgentID, ExecutionLimits } from '../protocol'
import { ProviderError, type Provider, type ProviderPart, type ProviderRequest } from '../provider'

export type CliAdapter = AgentID
export interface CliOptions {
  name: string; model: string; providerModel: string; adapter: CliAdapter; command: string[]
  context: { window: number; reservedOutput: number }
  limits?: ExecutionLimits
  env?: Record<string, string | undefined>
  trustWorkspace?: boolean
  cliVersion?: string | null
}
const MAX_BYTES = 1024 * 1024
const MAX_LINE = 128 * 1024
const fail = (code: string, message: string) => new ProviderError(code, message)
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): string => {
  if (typeof value !== 'string') throw fail('cli_protocol', 'CLI text event has an unsupported shape')
  return value
}

/** Agy plan mode is only a prompt prefix, not a permission boundary. Do not
 * mutate the user's global settings to make it pass this check. */
export function agyPolicyReady(env: Record<string, string | undefined>): boolean {
  const home = (process.platform === 'win32' ? env.USERPROFILE : env.HOME) || homedir()
  try {
    const file = join(home, '.gemini', 'antigravity-cli', 'settings.json')
    if (statSync(file).size > 65536) return false
    const value = JSON.parse(readFileSync(file, 'utf8'))
    return value.toolPermission === 'strict' && Array.isArray(value.permissions?.deny) &&
      ['write_file(*)', 'command(*)', 'unsandboxed(*)', 'mcp(*)', 'execute_url(*)'].every((rule) => value.permissions.deny.includes(rule)) &&
      !existsSync(join(home, '.gemini', 'config', 'hooks.json'))
  } catch { return false }
}

/** Stateful NDJSON normalization. Result text must agree with streamed text,
 * so a duplicate flush cannot silently duplicate or replace the answer. */
export class CliEvents {
  #session = ''; #initialized = false; #completed = false; #output = ''; #count = 0
  #piFinal: any
  #pendingText = ''
  constructor(readonly adapter: CliAdapter, readonly onText: (value: string) => void, readonly onPart?: (part: ProviderPart) => void, readonly cwd?: string,
    readonly options: { expectedID?: string; contractVersion?: 1 | 2; deferUntilIdentified?: boolean } = {}) {}
  get completed() { return this.#completed }
  #id(value: unknown): void {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(value)) throw fail('cli_protocol', 'CLI conversation identifier is missing or invalid')
    if (this.options.expectedID && value !== this.options.expectedID) throw fail('cli_identity_mismatch', 'CLI did not resume the recorded conversation; no replacement session was accepted')
    if (this.#session && this.#session !== value) throw fail('cli_protocol', 'CLI conversation identity changed during a response')
    if (!this.#session) {
      this.#session = value
      this.onPart?.({ kind: 'cli', version: this.options.contractVersion ?? 1, adapter: this.adapter, phase: 'session', vendorSessionID: value, text: 'Response-only CLI session' })
      if (this.#pendingText) { this.onText(this.#pendingText); this.#pendingText = '' }
    }
  }
  #append(value: string) {
    if (Buffer.byteLength(this.#output) + Buffer.byteLength(value) > 256 * 1024) throw fail('cli_output_limit', 'CLI assistant output exceeded its limit')
    this.#output += value
    if (value) { if (this.options.deferUntilIdentified && !this.#session) this.#pendingText += value; else this.onText(value) }
  }
  #finish(value: unknown, usage: any) {
    const answer = text(value)
    if (!answer || !answer.startsWith(this.#output)) throw fail('cli_protocol', 'CLI final answer disagrees with streamed text')
    this.#append(answer.slice(this.#output.length))
    if (usage && object(usage)) {
      const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined
      this.onPart?.({ kind: 'usage', inputTokens: count(usage.input_tokens), outputTokens: count(usage.output_tokens),
        ...(usage.cached_input_tokens === undefined ? {} : { cachedInputTokens: count(usage.cached_input_tokens) }),
        ...(usage.cache_write_input_tokens === undefined ? {} : { cacheWriteTokens: count(usage.cache_write_input_tokens) }),
        ...(usage.reasoning_output_tokens === undefined ? {} : { reasoningTokens: count(usage.reasoning_output_tokens) }),
        ...(typeof usage.cost_usd === 'number' && Number.isFinite(usage.cost_usd) && usage.cost_usd >= 0 ? { costUSD: usage.cost_usd } : {}) })
    }
    this.#completed = true
  }
  accept(line: string) {
    if (++this.#count > 8192 || this.#completed) throw fail('cli_protocol', 'CLI emitted too many events or data after completion')
    let event: any
    try { event = JSON.parse(line) } catch { throw fail('cli_protocol', 'CLI emitted invalid NDJSON; check its supported version and stream format') }
    if (!object(event)) throw fail('cli_protocol', 'CLI event must be an object')
    if (this.adapter === 'grok') {
      if (event.type === 'text') this.#append(text(event.data))
      // Advertised capabilities and intermediate usage snapshots are metadata,
      // not tool invocations or public assistant text. Use terminal usage once.
      else if (['thought', 'available_commands', 'usage'].includes(event.type)) return
      else if (event.type === 'end') {
        if (!['EndTurn', 'end_turn'].includes(event.stopReason)) throw fail('cli_failed', 'Grok did not finish a response-only turn')
        this.#id(event.sessionId); this.#finish(this.#output, { ...event.usage, cost_usd: event.total_cost_usd })
      } else throw fail('cli_protocol', 'Grok emitted an unsupported response-only event')
      return
    }
    if (this.adapter === 'pi' && event.type !== 'session') {
      if (!this.#initialized) throw fail('cli_protocol', 'Pi emitted data before its session header')
      if (event.type === 'message_update') {
        const part = event.assistantMessageEvent
        if (part?.type === 'text_delta') this.#append(text(part.delta))
        else if (part?.type?.startsWith('toolcall')) throw fail('cli_capability', 'Pi tools are disabled in response-only mode')
        else if (part?.type === 'error') throw fail('cli_failed', 'Pi reported a failed response')
      } else if (event.type === 'message_end' && event.message?.role === 'assistant') {
        if (event.message.stopReason !== 'stop' || !Array.isArray(event.message.content) || event.message.content.some((part: any) => part.type === 'toolCall')) throw fail('cli_failed', 'Pi did not complete a response-only answer')
        this.#piFinal = event.message
      } else if (event.type === 'agent_settled') {
        if (event.aborted === true || !this.#piFinal) throw fail('cli_failed', 'Pi settled without a successful assistant answer')
        const answer = this.#piFinal.content.filter((part: any) => part.type === 'text').map((part: any) => text(part.text)).join('')
        this.#finish(answer, { input_tokens: this.#piFinal.usage?.input, output_tokens: this.#piFinal.usage?.output })
      } else if (event.type === 'agent_end' && event.willRetry === true) throw fail('cli_failed', 'Pi requested automatic recovery; the response was stopped')
      else if (!['agent_start', 'agent_end', 'turn_start', 'turn_end', 'message_start', 'message_end'].includes(event.type)) throw fail('cli_protocol', 'Pi event type is unsupported in response-only mode')
      return
    }
    const type = this.adapter === 'agy' ? event.event : event.type
    if (type === 'error') throw fail('cli_failed', 'CLI reported an error; check sign-in, model access and CLI version')
    const init = this.adapter === 'agy' ? type === 'init' : this.adapter === 'pi' ? type === 'session' : type === 'system' && event.subtype === 'init'
    if (init) {
      if (this.#initialized) throw fail('cli_protocol', 'CLI initialized more than once')
      if (this.adapter === 'pi' && event.version !== 3) throw fail('cli_protocol', 'Unsupported Pi session format; version 3 is required')
      if (this.adapter === 'agy' && event.init?.permission_mode !== 'strict') throw fail('cli_policy_required', 'Agy did not acknowledge strict tool permissions; coding actions remain unavailable')
      if (this.cwd) {
        const actual = this.adapter === 'agy' ? event.init?.cwd : event.cwd
        const canonical = (path: string) => process.platform === 'win32' ? realpathSync(path).toLowerCase() : realpathSync(path)
        try {
          if (typeof actual !== 'string' || canonical(actual) !== canonical(this.cwd)) throw new Error('workspace mismatch')
        } catch { throw fail('cli_workspace', 'CLI did not acknowledge the admitted workspace; the response was stopped') }
      }
      this.#id(this.adapter === 'agy' ? event.conversation_id : this.adapter === 'pi' ? event.id : event.session_id)
      this.#initialized = true
      return
    }
    if (!this.#initialized) throw fail('cli_protocol', 'CLI emitted response data before initialization')
    const id = this.adapter === 'agy' ? event.step_update?.conversation_id ?? event.result?.conversation_id : event.session_id
    if (id !== undefined) this.#id(id)
    if (type === 'result') {
      const result = this.adapter === 'agy' ? event.result : event
      if (!object(result) || (this.adapter === 'agy' ? result.status !== 'SUCCESS' : result.subtype !== 'success' || result.is_error !== false)) {
        throw fail('cli_failed', 'CLI did not report a successful result; check sign-in and model access')
      }
      this.#id(this.adapter === 'agy' ? result.conversation_id : result.session_id)
      const usage = result.usage
      this.#finish(this.adapter === 'agy' ? result.response : result.result, this.adapter === 'cursor' && object(usage)
        ? { input_tokens: usage.inputTokens ?? usage.input_tokens, output_tokens: usage.outputTokens ?? usage.output_tokens } : usage)
    } else if (this.adapter === 'agy' && type === 'step_update') {
      const step = event.step_update
      if (!object(step)) throw fail('cli_protocol', 'CLI step update is invalid')
      if (step.step_type === 'agent_response') { if (step.text_delta !== undefined) this.#append(text(step.text_delta)) }
      else if (step.step_type === 'tool' || step.subagent_info) throw fail('cli_capability', 'CLI tool activity is unavailable in this response-only adapter')
      else if (!['user_input', 'checkpoint'].includes(step.step_type)) throw fail('cli_protocol', 'CLI step type is not supported')
    } else if (this.adapter === 'cursor' && type === 'assistant') {
      // Cursor's timestamped model_call_id flush and final untimestamped flush
      // repeat already emitted text under --stream-partial-output.
      if (typeof event.timestamp_ms !== 'number' || event.model_call_id !== undefined) return
      if (!Array.isArray(event.message?.content)) throw fail('cli_protocol', 'CLI assistant content is invalid')
      for (const part of event.message.content) {
        if (!object(part) || part.type !== 'text') throw fail('cli_protocol', 'CLI assistant content type is not supported')
        this.#append(text(part.text))
      }
    } else if (this.adapter === 'cursor' && type === 'thinking') {
      // Vendor thinking events are not a public reasoning summary. Do not
      // expose or persist them as assistant output or model history.
      if (!['delta', 'completed'].includes(event.subtype)) throw fail('cli_protocol', 'CLI thinking event subtype is unsupported')
    } else if (type === 'tool_call') {
      // Read tools may be used in Cursor ask mode. Keep their content out of
      // assistant text and never feed them into the engine's tool executor.
      const keys = object(event.tool_call) ? Object.keys(event.tool_call) : []
      if (!keys.length || keys.some((key) => !['readToolCall', 'lsToolCall', 'grepToolCall', 'globToolCall', 'semanticSearchToolCall'].includes(key))) {
        throw fail('cli_capability', 'CLI emitted an unsupported tool in response-only mode')
      }
    } else if (type !== 'user') throw fail('cli_protocol', 'CLI event type is not supported by the response-only contract')
  }
}

export class CliProvider implements Provider {
  readonly replayAfterRestart = false
  readonly nativeInstructions: boolean
  readonly name: string; readonly model: string; readonly context: CliOptions['context']
  constructor(readonly options: CliOptions) {
    this.nativeInstructions = options.adapter !== 'pi'
    this.name = options.name; this.model = options.model; this.context = options.context
  }
  cliIdentity = () => {
    const executable = fingerprint(this.options.command)
    if (!executable) throw fail('cli_unavailable', 'The CLI executable is missing or unsupported; refresh Providers.')
    return { adapter: this.options.adapter, contractVersion: 2, fingerprint: executable, cliVersion: this.options.cliVersion ?? null,
      vendorModel: this.options.providerModel, profileRef: createHash('sha256').update(JSON.stringify({ mode: 'response-only', contract: 2, trustWorkspace: !!this.options.trustWorkspace })).digest('hex') }
  }
  check = () => {
    if (this.options.adapter === 'agy' && !agyPolicyReady(this.options.env ?? process.env)) {
      throw fail('cli_policy_required', 'Agy response-only mode requires strict tool permissions and explicit write/command/MCP/browser denials; see provider configuration')
    }
  }
  async stream(request: ProviderRequest, onText: (value: string) => void, onPart?: (part: ProviderPart) => void) {
    this.check(); request.signal.throwIfAborted()
    if (!request.cwd || !isAbsolute(request.cwd)) throw fail('cli_workspace', 'CLI requests require the admitted workspace path')
    const adapter = this.options.adapter
    const continuation = request.continuation
    if (continuation && this.cliIdentity().fingerprint !== continuation.fingerprint) throw fail('cli_upgrade', 'The CLI changed after admission. Refresh and start a fresh CLI conversation.')
    const env = Object.fromEntries(Object.entries(this.options.env ?? process.env).filter(([key]) => !['BUN_OPTIONS', 'NODE_OPTIONS'].includes(key.toUpperCase())))
    env.NO_OPEN_BROWSER = '1'
    const home = (process.platform === 'win32' ? env.USERPROFILE : env.HOME) || homedir()
    if ((adapter === 'agy' && existsSync(join(request.cwd, '.agents', 'hooks.json'))) ||
      (adapter === 'cursor' && [join(request.cwd, '.cursor', 'hooks.json'), join(home, '.cursor', 'hooks.json')].some(existsSync)) ||
      (adapter === 'grok' && [join(request.cwd, '.grok', 'hooks.json'), join(home, '.grok', 'hooks.json')].some(existsSync))) {
      throw fail('cli_capability', 'CLI hooks are unavailable in response-only mode; use a workspace/profile without startup hooks')
    }
    const messages = continuation?.resume ? request.messages.filter((item) => item.role === 'user') : request.messages
    if (!messages.length) throw fail('cli_no_prompt', 'There are no new prompts for this native CLI conversation.')
    const prompt = 'Answer using the conversation below. This is a response-only turn: do not edit files, run commands, delegate or invoke external tools.\n' +
      JSON.stringify({ instructions: request.instructions, conversation: messages.map(({ role, text }) => ({ role, text })) })
    const input = adapter === 'agy' ? JSON.stringify({ event: 'user', message: { content: prompt } }) + '\n' : prompt + '\n'
    if (Buffer.byteLength(input) > 256 * 1024) throw fail('context_overflow', 'CLI input exceeds the bounded stdin limit')
    const flags = adapter === 'agy'
      ? ['--input-format', 'stream-json', '--output-format', 'stream-json', '--disable-slash-commands', '--print-timeout', '120s']
      : adapter === 'pi' ? ['--mode', 'json', '--print', ...(continuation?.sessionFile ? ['--session', continuation.sessionFile] : ['--no-session']), '--no-tools', '--no-extensions', '--no-mcp', '--no-skills', '--no-prompt-templates', '--no-approve', '--no-context-files']
      : adapter === 'grok' ? ['--output-format', 'streaming-json', '--tools', '', '--deny', '*', '--no-subagents', '--disable-web-search', '--max-turns', '1', '--permission-mode', 'plan', '--cwd', request.cwd]
      : ['--print', '--output-format', 'stream-json', '--stream-partial-output', '--mode', 'ask']
    if (continuation?.vendorSessionID) {
      if (adapter === 'grok') flags.push(continuation.resume ? '--resume' : '--session-id', continuation.vendorSessionID)
      else if (continuation.resume && adapter !== 'pi') flags.push(adapter === 'agy' ? '--conversation' : '--resume', continuation.vendorSessionID)
    }
    if (adapter === 'cursor' && this.options.trustWorkspace) flags.push('--trust')
    if (this.options.providerModel !== 'default') flags.push('--model', this.options.providerModel)
    let promptDirectory: string | undefined, promptFile: string | undefined
    const cleanPrompt = () => { if (promptFile) { try { unlinkSync(promptFile) } catch {} }; if (promptDirectory) { try { rmdirSync(promptDirectory) } catch {} } }
    if (adapter === 'grok') {
      promptDirectory = mkdtempSync(join(tmpdir(), 'hiroshi-cli-prompt-')); promptFile = join(promptDirectory, 'prompt.txt')
      try { writeFileSync(promptFile, prompt, { flag: 'wx', mode: 0o600 }); flags.push('--prompt-file', promptFile) } catch (error) { cleanPrompt(); throw fail('cli_start', 'Could not prepare the private Grok prompt file') }
    }
    const version = continuation ? 2 : 1
    try { onPart?.({ kind: 'cli', version, adapter, phase: 'started', text: continuation?.resume ? 'Resuming the recorded response-only CLI conversation' : continuation ? 'Starting an isolated response-only CLI conversation from Hiroshi history' : 'Stateless response-only CLI submission' }) }
    catch (error) { cleanPrompt(); throw error }
    let proc: ReturnType<typeof spawnOwned>
    try { proc = spawnOwned({ cmd: [...this.options.command, ...flags], cwd: request.cwd, input, env, limits: this.options.limits }) }
    catch { cleanPrompt(); throw fail('cli_start', 'CLI could not start; check its configured executable and runtime') }
    const readers = new Set<ReadableStreamDefaultReader<Uint8Array>>()
    const abort = () => {
      proc.terminateTree()
      // A POSIX descendant can escape a process group and retain a pipe.
      // Cancellation still has to settle the provider and release its slot.
      for (const reader of readers) void reader.cancel().catch(() => {})
    }
    request.signal.addEventListener('abort', abort, { once: true })
    if (request.signal.aborted) abort()
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; abort() }, this.options.limits?.timeoutMs ?? DEFAULT_EXECUTION_LIMITS.timeoutMs)
    const events = new CliEvents(adapter, onText, onPart, request.cwd, { expectedID: continuation?.vendorSessionID ?? undefined, contractVersion: version,
      deferUntilIdentified: adapter === 'grok' && !!continuation })
    let bytes = 0, diagnostics = ''
    const read = async (stream: ReadableStream<Uint8Array>, stdout: boolean) => {
      const reader = stream.getReader(), decoder = new TextDecoder('utf-8', { fatal: true })
      readers.add(reader)
      let pending = ''
      try {
        if (request.signal.aborted || timedOut) { await reader.cancel(); return }
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if ((bytes += value.byteLength) > MAX_BYTES) throw fail('cli_output_limit', 'CLI output exceeded its bounded limit')
          const chunk = decoder.decode(value, { stream: true })
          if (!stdout) { diagnostics = (diagnostics + chunk).slice(-8192); continue }
          pending += chunk
          let newline: number
          while ((newline = pending.indexOf('\n')) >= 0) {
            if (Buffer.byteLength(pending.slice(0, newline)) > MAX_LINE) throw fail('cli_output_limit', 'CLI event exceeded its line limit')
            const line = pending.slice(0, newline).replace(/\r$/, ''); pending = pending.slice(newline + 1)
            if (line.trim()) events.accept(line)
          }
          if (Buffer.byteLength(pending) > MAX_LINE) throw fail('cli_output_limit', 'CLI event exceeded its line limit')
        }
        pending += decoder.decode()
        if (stdout && pending.trim()) throw fail('cli_protocol', 'CLI ended with an incomplete NDJSON line')
      } finally { readers.delete(reader); reader.releaseLock() }
    }
    try {
      await Promise.all([read(proc.stdout, true), read(proc.stderr, false)])
      const code = await proc.exited
      request.signal.throwIfAborted()
      if (timedOut) throw fail('cli_timeout', 'CLI response deadline exceeded; its process tree was stopped')
      if (code !== 0) {
        const missing = continuation?.resume && /(?:session|conversation|chat).{0,60}(?:not found|missing|expired|does not exist)|(?:unknown|invalid).{0,20}(?:session|conversation|chat)/i.test(diagnostics)
        if (missing) throw fail('cli_session_missing', 'The recorded vendor conversation is missing or expired. It was not recreated or retried; start a fresh CLI conversation deliberately.')
        const trust = /workspace trust required/i.test(diagnostics)
        const auth = /auth|sign.?in|log.?in|credential|unauthorized/i.test(diagnostics)
        throw fail(code === 127 ? 'cli_start' : trust ? 'cli_workspace_trust' : auth ? 'cli_authentication' : 'cli_exit',
          code === 127 ? 'CLI executable could not start; check its absolute path' : trust ? 'Cursor needs workspace trust; approve it in Cursor or explicitly set trustWorkspace in this provider configuration'
            : auth ? 'CLI authentication failed; sign in with its own CLI and retry deliberately' : 'CLI exited unsuccessfully; check model access and supported CLI version')
      }
      if (!events.completed) throw fail('cli_truncated', 'CLI exited without a successful terminal result; the submission was not retried')
      onPart?.({ kind: 'cli', version, adapter, phase: 'completed', text: 'CLI response completed' })
    } catch (error) {
      if (timedOut) throw fail('cli_timeout', 'CLI response deadline exceeded; its process tree was stopped')
      if (error instanceof ProviderError || request.signal.aborted) throw error
      throw fail('cli_transport', 'CLI process or stream failed; the submission was not retried')
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort', abort); abort(); await proc.exited.catch(() => {}); cleanPrompt()
    }
  }
}
