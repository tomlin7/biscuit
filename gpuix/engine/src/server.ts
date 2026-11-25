/**
 * The HTTP surface.
 *
 * Commands go in over `POST`, state goes out over one event feed. The feed
 * encodes each event once and gives every connection its own bounded queue: a
 * client that stops reading is closed with an `overflow` frame instead of
 * being allowed to grow the daemon's memory, and the other clients never
 * notice. Replay and live delivery share the same encoder and the same order.
 */

import { WorkspaceFiles, reviewWorkspace } from './workspace'
import path from 'node:path'
import { assertWorkspace } from './projects'
import { browsePage } from './browser'
import { timingSafeEqual } from 'node:crypto'

import { EngineError, invalid, notFound, conflict } from './errors'
import { Feed } from './feed'
import type { ProviderRegistry } from './providers/registry'
import type { ProviderCatalog } from './providers/catalog'
import { ProviderError } from './provider'
import type { Logger } from './log'
import type { CreateSessionRequest, Health, InterruptRequest, PromptRequest, StartRunRequest, OperationRequest } from './protocol'
import { ENGINE_NAME, FEED_PATH, matchOperation } from './protocol'
import type { Runs } from './runs'
import type { Sessions } from './sessions'
import type { Steps } from './steps'
import type { Checkpoints } from './checkpoints'
import type { Tools } from './tools/tools'
import type { Store } from './store'
import { ExecutionError, type ExecutionBudget } from './execution'
import { randomUUID } from 'node:crypto'
import { NetworkAccess } from './network-access'
import { InternetAccess } from './internet-access'
import { UsageService } from './usage'
import type { CliConversations } from './cli-conversations'
import type { AccessControls } from './tools/access'
import { homedir } from 'node:os'
import { Skills } from './skills'
import { Configuration } from './configuration'

export interface ServerOptions {
  access?: AccessControls
  cliConversations?: CliConversations
  onCliFresh?: (sessionID: string) => void
  home?: string
  budget?: ExecutionBudget
  store: Store
  runs: Runs
  sessions: Sessions
  steps: Steps
  checkpoints?: Checkpoints
  tools?: Tools
  catalog?: Pick<ProviderCatalog, 'models' | 'defaultModel' | 'has' | 'resolve'>
  providers?: ProviderRegistry
  log: Logger
  token: string
  version: string
  protocol: number
  database: string
  workspace: string
  startedAt: number
  onShutdown: () => void
}

export interface StartedServer {
  url: string
  port: number
  stop: () => void
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function failure(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status)
}

/** The handler the switch would reach only if a row had no case of its own. */
function unhandled(name: never): Response {
  return failure('internal', `the engine has no handler for ${String(name)}`, 500)
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function authorized(request: Request, token: string): boolean {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  return safeEqual(header.slice('Bearer '.length), token)
}

async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw invalid('bad_body', 'the request body is not JSON')
  }
}

/** The reason an interrupt carries into the step transcript. */
function operatorReason(input: InterruptRequest): string {
  const why = (input.reason ?? '').trim()
  return why ? `the operator stopped this step: ${why}` : 'the operator stopped this step'
}

const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
}

export function startServer(
  options: ServerOptions,
  listen: { hostname: string; port: number },
): StartedServer {
  const { store, runs, sessions, steps, log } = options
  // One subscription to the store, one encoding per event, one queue per client.
  const hub = new Feed(store)
  let network: NetworkAccess | undefined
  let internet: InternetAccess | undefined
  const usage = options.home ? new UsageService(options.home, store, process.env.HIROSHI_USAGE_HOME || homedir()) : undefined
  const skills = options.home ? new Skills(options.home) : undefined

  const maintenance = <T>(sessionID: string, signal: AbortSignal, effect: () => Promise<T>): Promise<T> => options.budget
    ? options.budget.execute({ id: `maintenance_${randomUUID()}`, sessionID, kind: 'maintenance' }, signal, effect) : effect()

  function health(): Health {
    return {
      ...(options.budget ? { execution: options.budget.status() } : {}),
      name: ENGINE_NAME,
      version: options.version,
      protocol: options.protocol,
      pid: process.pid,
      startedAt: options.startedAt,
      uptimeMs: Date.now() - options.startedAt,
      database: options.database,
      workspace: options.workspace,
      lastSeq: store.lastSeq(),
    }
  }

  function feed(url: URL, signal?: AbortSignal): Response {
    const requested = Number(url.searchParams.get('after') ?? '0')
    const after = Number.isFinite(requested) && requested > 0 ? requested : 0

    const connection = hub.open(after)
    // `request.signal` is the client hanging up. The queue goes with it.
    signal?.addEventListener('abort', () => connection.close(), { once: true })
    return new Response(connection.stream, { headers: SSE_HEADERS })
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    if (!authorized(request, options.token)) {
      return failure('unauthorized', 'a bearer token is required', 401)
    }

    if (url.pathname === FEED_PATH && method === 'GET') return feed(url, request.signal)

    const matched = matchOperation(method, url.pathname)
    if (!matched) return failure('not_found', `${method} ${url.pathname} is not a route`, 404)

    const { operation, params } = matched
    // The row says what a success looks like; the switch says what it means.
    const status = operation.status ?? 200

    switch (operation.name) {
      case 'pairingState':
        if (!network) throw notFound('network pairing')
        return json(network.pairing.state(), status)
      case 'internetSettings':
        if (!internet) throw notFound('internet access')
        return json(internet.snapshot(), status)
      case 'updateInternet':
        if (!internet) throw notFound('internet access')
        return json(await internet.update(await body<OperationRequest<'updateInternet'>>(request)), status)
      case 'createPairing': {
        if (!network) throw notFound('network pairing')
        const input = await body<OperationRequest<'createPairing'>>(request)
        if (input?.remote) {
          if (input.address !== undefined) throw invalid('pairing_address', 'Choose either internet pairing or an explicit address.')
          if (!internet) throw notFound('internet access')
          return json(internet.invite(), status)
        }
        return json(network.invite(input?.address), status)
      }
      case 'cancelPairing': {
        if (!network) throw notFound('network pairing')
        const input = await body<OperationRequest<'cancelPairing'>>(request)
        if (typeof input?.grantID !== 'string' || input.grantID.length > 64) throw invalid('pairing_grant', 'Choose the pairing invitation to cancel.')
        network.pairing.cancel(input.grantID)
        return json(network.pairing.state(), status)
      }
      case 'revokePairedDevice': {
        if (!network) throw notFound('network pairing')
        const input = await body<OperationRequest<'revokePairedDevice'>>(request)
        return json(network.revokeDevice(input?.deviceID, input?.revision), status)
      }
      case 'skills':
      case 'skillDocument':
      case 'updateSkill':
      case 'removeSkill': {
        if (!skills) throw notFound('installed skills')
        const session = assertWorkspace(store, params.id!)
        const input = await body<any>(request)
        return json(await maintenance(session.id, request.signal, async () => {
          assertWorkspace(store, session.id)
          if (operation.name === 'skills') return skills.scan(session.cwd)
          if (operation.name === 'skillDocument') return skills.read(session.cwd, input)
          if (operation.name === 'updateSkill') return skills.update(session.cwd, input)
          return skills.remove(session.cwd, input)
        }), status)
      }
      case 'usageReport': {
        if (!usage) throw notFound('usage reporting')
        if (!store.session(params.id!)) throw notFound('session')
        const input = await body<OperationRequest<'usageReport'>>(request)
        return json(await maintenance(params.id!, request.signal, () => usage.report(input, request.signal)), status)
      }
      case 'updateUsagePricing':
        if (!usage) throw notFound('usage reporting')
        return json(usage.updatePricing(await body<OperationRequest<'updateUsagePricing'>>(request)), status)
      case 'networkSettings':
        if (!network) throw notFound('network settings')
        return json(network.snapshot(), status)
      case 'networkToken':
        if (!network) throw notFound('network settings')
        return json({ token: network.token() }, status)
      case 'rotateNetworkToken':
        if (!network) throw notFound('network settings')
        return json(network.rotate((await body<{ revision: number }>(request)).revision), status)
      case 'updateNetwork':
        if (!network) throw notFound('network settings')
        return json(network.update(await body<OperationRequest<'updateNetwork'>>(request)), status)
      case 'projects': return json({ projects: sessions.projects() }, status)
      case 'openProject': {
        const input = await body<OperationRequest<'openProject'>>(request)
        if (typeof input.cwd !== 'string' || !path.isAbsolute(input.cwd)) throw invalid('workspace_path', 'Choose an absolute project folder path.')
        return json({ session: sessions.create({ cwd: input.cwd, reuseWorkspace: true }) }, status)
      }
      case 'providers':
        if (!options.providers) throw notFound('provider setup')
        return json(options.providers.snapshot(), status)
      case 'refreshProviders':
        if (!options.providers) throw notFound('provider setup')
        if (!store.session(params.id!)) throw notFound('session')
        return json(options.providers.refresh(params.id!), status)
      case 'cancelProviderRefresh':
        if (!options.providers) throw notFound('provider setup')
        return json(options.providers.cancel(), status)
      case 'updateProviders':
        if (!options.providers) throw notFound('provider setup')
        return json(options.providers.update(await body<OperationRequest<'updateProviders'>>(request)), status)
      case 'workspaceList':
      case 'workspaceFile':
      case 'workspaceReview':
      case 'workspaceCommit':
      case 'browse': {
        const input = await body<any>(request)
        const session = assertWorkspace(store, params.id!)
        const files = new WorkspaceFiles(session.cwd, options.checkpoints?.home)
        if (operation.name === 'workspaceList') return json(await files.list(input.path ?? ''), status)
        if (operation.name === 'workspaceFile') return json(await files.file(input.path), status)
        if (operation.name === 'workspaceReview') return json(await maintenance(session.id, request.signal, () => { assertWorkspace(store, session.id); return reviewWorkspace(session.cwd, input.base) }), status)
        if (operation.name === 'browse') return json(await browsePage(input.url), status)
        const command = input as OperationRequest<'workspaceCommit'>
        options.checkpoints?.assertReady(session.id)
        if (store.runningRuns().length || store.sessions().some((candidate) => steps.busy(candidate.id))) throw conflict('workspace_busy', 'finish active work before committing')
        if (typeof command.message !== 'string' || (!command.pushOnly && !command.message.trim()) || command.message.length > 4000 ||
          typeof command.includeUnstaged !== 'boolean' || typeof command.push !== 'boolean' || (command.pushOnly !== undefined && typeof command.pushOnly !== 'boolean')) throw invalid('workspace_commit', 'provide a commit message and explicit commit options')
        const review = await maintenance(session.id, request.signal, () => reviewWorkspace(session.cwd, command.base))
        if (!review.available || review.truncated || review.files.some((file) => file.status === 'U')) throw invalid('workspace_commit', review.reason ?? 'resolve conflicts or a truncated review before committing')
        if (review.revision !== command.revision) throw conflict('workspace_changed', 'the workspace changed; refresh the review before committing')
        // Recheck after asynchronous Git reads: a run or rewind may have begun.
        options.checkpoints?.assertReady(session.id)
        if (store.runningRuns().length || store.sessions().some((candidate) => steps.busy(candidate.id))) throw conflict('workspace_busy', 'finish active work before committing')
        const commands: string[][] = []
        if (!command.pushOnly) {
          if (!review.files.some((file) => command.includeUnstaged ? file.staged || file.unstaged : file.staged)) throw invalid('workspace_commit', 'there are no selected changes to commit')
          if (command.includeUnstaged) commands.push(['git', 'add', '-A', '--', '.'])
          commands.push(['git', 'commit', '--message', command.message])
        }
        if (command.push || command.pushOnly) commands.push(['git', 'push'])
        return json({ run: runs.startProgram(session.id, command.pushOnly ? 'git push' : command.push ? 'git commit and push' : 'git commit', commands) }, status)
      }

      case 'rewind': {
        if (!options.checkpoints) throw notFound('checkpoint service')
        const input = await body<{ checkpointID: string; key: string }>(request)
        const restore = () => options.checkpoints!.restore(params.id!, input.checkpointID, input.key)
        return json({ rewind: options.budget ? options.budget.synchronous({ id: `rewind_${randomUUID()}`, sessionID: params.id!, kind: 'maintenance' }, restore) : restore() }, status)
      }

      case 'answerPermission': {
        if (!options.tools) throw notFound('permission service')
        const input = await body<{ decision: 'allow' | 'deny'; remember?: boolean }>(request)
        return json({ permission: options.tools.answer(params.id!, input.decision, input.remember ?? false) }, status)
      }

      case 'toolOutput':
        if (!options.tools) throw notFound('tool output service')
        return json(options.tools.output(params.id!), status)

      case 'models':
        return json({ models: options.catalog?.models() ?? [], defaultModel: options.catalog?.defaultModel ?? 'local/echo' }, status)

      case 'health':
        return json(health(), status)

      case 'listSessions':
        return json({ sessions: sessions.list() }, status)

      case 'createSession': {
        const input = await body<CreateSessionRequest>(request)
        return json({ session: sessions.create(input) }, status)
      }

      case 'session': {
        const detail = sessions.detail(params.id)
        try { detail.configuration = new Configuration(options.home).resolve(detail.session.cwd).report }
        catch (error) { detail.configuration = { settings: {}, provenance: [], sources: [], warnings: [], error: error instanceof ProviderError ? error.message : 'Workspace configuration is unavailable. Existing history remains readable.' } }
        return json(detail, status)
      }

      case 'updateAccess': {
        if (!options.access) throw notFound('permission mode service')
        return json(options.access.update(params.id!, await body<OperationRequest<'updateAccess'>>(request)), status)
      }
      case 'freshCliConversation': {
        if (!options.cliConversations) throw notFound('CLI conversation service')
        if (steps.busy(params.id!)) throw conflict('cli_busy', 'Wait for the current task to settle before replacing its CLI conversation.')
        const input = await body<OperationRequest<'freshCliConversation'>>(request)
        const conversation = options.cliConversations.fresh(params.id!, input)
        // Explicit recovery can release previously admitted follow-ups, but it
        // never starts the interrupted step or resubmits its original prompt.
        queueMicrotask(() => options.onCliFresh?.(params.id!))
        return json({ conversation }, status)
      }

      case 'prompt': {
        const input = await body<PromptRequest>(request)
        const existing = typeof input.key === 'string' ? store.inboxByKey(params.id, input.key.trim()) : null
        if (!existing && input.model === undefined) { const session = assertWorkspace(store, params.id!); input.model = new Configuration(options.home).resolve(session.cwd).report.settings.defaultModel ?? options.catalog?.defaultModel }
        if (!existing && input.model !== undefined && (typeof input.model !== 'string' || !options.catalog?.has(input.model))) {
          throw invalid('unknown_model', 'model must name a model in the engine catalog')
        }
        input.model ??= options.catalog?.defaultModel
        if (!existing && options.catalog) options.cliConversations?.validate(params.id!, options.catalog.resolve(input.model), input.model ?? options.catalog.defaultModel)
        return json(sessions.prompt(params.id, input), status)
      }

      case 'interrupt': {
        const input = await body<InterruptRequest>(request)
        // The step goes first: it is the work in flight. Stopping the runs then
        // creates the boundary that delivers anything the operator had queued,
        // which may legitimately start the next step.
        const stoppedSteps = steps.interrupt(params.id, operatorReason(input))
        return json({ runs: runs.interrupt(params.id, input.reason), steps: stoppedSteps }, status)
      }

      case 'startRun': {
        const input = await body<StartRunRequest>(request)
        options.checkpoints?.assertReady(params.id!, input.cwd)
        return json({ run: runs.start(params.id, input.command ?? '', input.cwd) }, status)
      }

      case 'run': {
        const run = store.run(params.id)
        if (!run) throw notFound('run')
        return json({ run, chunks: store.chunks(params.id) }, status)
      }

      case 'cancelRun':
        return json({ run: runs.cancel(params.id) }, status)

      case 'shutdown':
        setTimeout(options.onShutdown, 25)
        return json({ ok: true }, status)
    }

    // Unreachable while the table and the switch agree; a new row lands here
    // as a compile error rather than a route with no handler.
    return unhandled(operation.name)
  }

  const dispatch = async (request: Request) => {
      try {
        return await handle(request)
      } catch (error) {
        if (error instanceof ExecutionError) return failure(error.code, error.message, error.code.includes('timeout') ? 408 : 429)
        if (error instanceof ProviderError) return failure(error.code, error.message, 400)
        if (error instanceof EngineError) return failure(error.code, error.message, error.status)
        log.error('request failed', {
          method: request.method,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        })
        return failure('internal', 'the engine failed to handle the request', 500)
      }
  }
  const server = Bun.serve({ hostname: listen.hostname, port: listen.port, development: false, fetch: dispatch })
  if (options.home) { network = new NetworkAccess(options.home, dispatch, options.token); internet = new InternetAccess(options.home, network) }

  const host = listen.hostname === '0.0.0.0' || listen.hostname === '::' ? '127.0.0.1' : listen.hostname
  const port = server.port ?? listen.port

  return {
    url: `http://${host}:${port}`,
    port,
    stop: () => {
      const closing = internet?.close().catch(() => {})
      network?.close()
      hub.close()
      server.stop(true)
      return closing
    },
  }
}
