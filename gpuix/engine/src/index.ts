#!/usr/bin/env bun
/**
 * Hiroshi engine.
 *
 *   hiroshi-engine serve    run the daemon (the default)
 *   hiroshi-engine status   report the daemon the registry points at
 *   hiroshi-engine stop     ask the daemon to shut down
 *   hiroshi-engine version  print the version and the protocol
 *
 * The daemon outlives whatever started it. It writes its URL, pid and bearer
 * token to `<data>/engine.json` once it is listening, and every client finds
 * it there. Closing the cockpit never stops a run; only `stop` does.
 */

import { mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

import { ENGINE_NAME, ENGINE_VERSION, PROTOCOL_VERSION, type RegistryRecord } from './protocol'
import { enginePaths, type EnginePaths } from './paths'
import { createLogger, type Logger } from './log'
import { Store } from './store'
import { ExecutionBudget, ExecutionError, readExecutionLimits } from './execution'
import { containEngine, runProcessChild } from './process'
import { Inbox } from './inbox'
import { Sessions } from './sessions'
import { Checkpoints } from './checkpoints'
import { Runs } from './runs'
import { Steps } from './steps'
import { ToolRegistry } from './tools/registry'
import { registerBuiltins } from './tools/builtins'
import { Tools } from './tools/tools'
import { AccessControls } from './tools/access'
import { ProviderCatalog, readProvidersConfig } from './providers/catalog'
import { ProviderRegistry } from './providers/registry'
import { CliConversations } from './cli-conversations'
import { Skills } from './skills'
import { renderUnicodeCompact } from 'uqr'
import { engineClient } from '../../src/engine/client'
import { Configuration } from './configuration'
import { internetCommand, remoteInvitation } from './remote-commands'
import { LocalProvider } from './providers/local'
import { startServer } from './server'
import { daemonFetch } from './local-transport'
import {
  acquireStartLock,
  clearRegistry,
  discover,
  processAlive,
  releaseStartLock,
  removeRegistry,
  writeRegistry,
  type Discovery,
} from './registry'

type Flags = Record<string, string | boolean>

function parse(argv: string[]): { command: string; flags: Flags; positionals: string[] } {
  const flags: Flags = {}
  const positionals: string[] = []
  let command = ''

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2)
      if (inline !== undefined) flags[key!] = inline
      else if (argv[index + 1] && !argv[index + 1]!.startsWith('--')) flags[key!] = argv[++index]!
      else flags[key!] = true
      continue
    }
    if (!command) command = arg
    else positionals.push(arg)
  }

  return { command: command || 'serve', flags, positionals }
}

function stringFlag(flags: Flags, name: string): string | undefined {
  const value = flags[name]
  return typeof value === 'string' ? value : undefined
}

function numberFlag(flags: Flags, name: string): number | undefined {
  const value = stringFlag(flags, name)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function resolvePaths(flags: Flags): EnginePaths {
  const home = stringFlag(flags, 'data-dir')
  return enginePaths(home)
}

function humanDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function describe(discovery: Discovery, paths: EnginePaths): string {
  if (discovery.state === 'unreachable') return `${ENGINE_NAME} is unreachable\n  ${discovery.reason}`
  if (discovery.state === 'running') {
    const { record, health } = discovery
    return [
      `${ENGINE_NAME} ${record.version} (protocol ${record.protocol})`,
      `  state:    running`,
      `  url:      ${record.url}`,
      `  pid:      ${record.pid}`,
      `  uptime:   ${humanDuration(health.uptimeMs)}`,
      `  database: ${record.database}`,
      `  log:      ${record.log}`,
    ].join('\n')
  }
  if (discovery.state === 'stale') {
    return [
      `${ENGINE_NAME} is not running`,
      `  stale registry: ${paths.registry}`,
      `  reason: ${discovery.reason}`,
    ].join('\n')
  }
  return `${ENGINE_NAME} is not running\n  no registry at ${paths.registry}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function serve(flags: Flags): Promise<number> {
  const paths = resolvePaths(flags)
  mkdirSync(paths.home, { recursive: true })
  const log = createLogger(paths.log)

  const existing = await discover(paths.registry)
  if (existing.state === 'unreachable') {
    log.warn('live engine is unreachable; refusing a second daemon', { pid: existing.record.pid })
    process.stderr.write(`${ENGINE_NAME}: ${existing.reason}\n`)
    return 4
  }
  if (existing.state === 'running') {
    log.info('engine already running', { url: existing.record.url, pid: existing.record.pid })
    process.stdout.write(`${ENGINE_NAME} already running at ${existing.record.url} (pid ${existing.record.pid})\n`)
    return 0
  }
  if (existing.state === 'stale') {
    log.warn('discarding a stale registry', { reason: existing.reason })
    removeRegistry(paths.registry)
  }

  const lock = acquireStartLock(paths.lock)
  if (!lock.ok) {
    process.stdout.write(`${ENGINE_NAME} is already starting (pid ${lock.pid ?? 'unknown'})\n`)
    return 3
  }

  const store = Store.open(paths.database)
  store.migrate()
  const budget = new ExecutionBudget(store, readExecutionLimits(paths.home))
  containEngine(budget.limits)

  const workspace = stringFlag(flags, 'workspace') || process.cwd()
  const checkpoints = new Checkpoints(store, paths.home)
  const inbox = new Inbox(store, log)
  const sessions = new Sessions(store, log, { cwd: workspace, inbox, home: paths.home })
  // A run ending is the engine's safe boundary: the inbox reads the database
  // after `run.ended` is committed and delivers only when nothing is running.
  const runs = new Runs(store, log, { budget, onIdle: (sessionID) => void inbox.deliver(sessionID) })

  const configuredDelay = numberFlag(flags, 'provider-delay') ?? Number(process.env.HIROSHI_PROVIDER_DELAY_MS)
  const catalog = new ProviderRegistry(paths.home, store, budget, process.env,
    new LocalProvider({ delayMs: Number.isFinite(configuredDelay) ? Math.max(0, configuredDelay) : 0 }))
  const registry = new ToolRegistry()
  registerBuiltins(registry, paths.home, budget.limits)
  const access = new AccessControls(store, paths.home, budget, (model) => catalog.resolve(model))
  access.recover()
  const tools = new Tools(store, registry, paths.home, budget, access)
  const cliConversations = new CliConversations(store, paths.home, (model) => catalog.resolve(model))
  const skills = new Skills(paths.home)
  const steps = new Steps(store, log, {
    cliConversations,
    budget,
    tools,
    blocked: (id) => checkpoints.blocked(id) || cliConversations.blocked(id),
    selectProvider: (model) => catalog.resolve(model),
    context: { configuration: new Configuration(paths.home), enabled: flags['no-compaction'] !== true && process.env.HIROSHI_COMPACTION !== 'off',
      skillInstructions: (id) => skills.instructions(store.session(id)!.cwd, store.activeMessages(id).filter((message) => message.role === 'user').map((message) => message.text)) },
    provider: catalog.resolve(),
  })

  // A previous process may have died mid-command. Say so rather than pretend
  // the command is still running.
  runs.settleInterrupted('hiroshi-engine: the engine stopped while this command was running; it was not resumed')
  // A previous process may have died mid-step. The claim is still in the
  // database; resume the same step when it produced no output, and fail it
  // explicitly when it did.
  checkpoints.busy = (id) => steps.busy(id)
  const waitingCheckpoints = new Set<string>()
  budget.onAvailable = () => {
    if (!waitingCheckpoints.size) return
    queueMicrotask(() => {
      const sessions = [...waitingCheckpoints]
      waitingCheckpoints.clear()
      for (const id of sessions) inbox.deliver(id)
    })
  }
  inbox.beforeDeliver = (id, item) => {
    try { return budget.synchronous({ id: `checkpoint_${randomBytes(12).toString('hex')}`, sessionID: id, kind: 'maintenance' }, () => checkpoints.prepare(id, item)) }
    catch (error) {
      if (error instanceof ExecutionError && ['execution_capacity', 'execution_low_memory'].includes(error.code)) waitingCheckpoints.add(id)
      throw error
    }
  }
  tools.blocked = (id) => checkpoints.blocked(id)
  checkpoints.recover()
  tools.recover()
  budget.reconcile()
  cliConversations.reconcile()
  steps.resume()

  // Only now may delivery start work. A prompt delivered before this line
  // (during run settlement) is picked up by `kickAll` below. The busy guard
  // holds a prompt while a step is streaming; the step announces its own end,
  // which is the next boundary.
  inbox.onDelivered = (sessionID) => {
    steps.start(sessionID)
  }
  inbox.busy = (sessionID) => steps.busy(sessionID) || checkpoints.blocked(sessionID) || cliConversations.blocked(sessionID)
  tools.onIdle = (sessionID) => {
    steps.start(sessionID)
    void inbox.deliver(sessionID)
  }
  steps.onEnd = (sessionID) => {
    try { cliConversations.reconcile(sessionID) } catch { log.error('CLI conversation state could not be finalized; further native work remains blocked.') }
    void inbox.deliver(sessionID)
  }
  // Settlement is a boundary of its own: prompts admitted before the crash get
  // delivered instead of waiting for a run that will never end.
  inbox.deliverIdle()
  steps.kickAll()
  tools.kickAll()
  runs.resumeQueued()

  const hostname = stringFlag(flags, 'host') || '127.0.0.1'
  const port = numberFlag(flags, 'port') ?? 0
  const startedAt = Date.now()
  const token = randomBytes(32).toString('hex')

  let shuttingDown = false
  let server: { url: string; port: number; stop: () => void }

  const shutdown = async (reason: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    log.info('shutting down', { reason })
    try {
      await server.stop()
    } catch {
      // Already stopped.
    }
    // A step is left claimed, not cancelled: the next start resumes it. The
    // gate `stopAll` sets also stops new steps from starting while the runs
    // below deliver their last boundary.
    const stoppingProviders = catalog.stop()
    budget.stop(false)
    tools.stopAll()
    steps.stopAll()
    await runs.stopAll()
    await stoppingProviders
    // A backstop: a run nothing was holding any more is genuinely unaccounted
    // for, so it gets the crash wording rather than the shutdown one.
    runs.settleInterrupted('hiroshi-engine: the engine stopped while this command was running; it was not resumed')
    clearRegistry(paths.registry, process.pid)
    releaseStartLock(paths.lock)
    store.close()
    process.exit(0)
  }

  server = startServer(
    {
      access,
      cliConversations,
      onCliFresh: (id) => { void inbox.deliver(id) },
      store,
      budget,
      home: paths.home,
      runs,
      sessions,
      steps,
      tools,
      checkpoints,
      catalog,
      providers: catalog,
      log,
      token,
      version: ENGINE_VERSION,
      protocol: PROTOCOL_VERSION,
      database: paths.database,
      workspace,
      startedAt,
      onShutdown: () => void shutdown('api'),
    },
    { hostname, port },
  )

  const record: RegistryRecord = {
    name: ENGINE_NAME,
    version: ENGINE_VERSION,
    protocol: PROTOCOL_VERSION,
    url: server.url,
    host: hostname,
    port: server.port,
    pid: process.pid,
    token,
    startedAt,
    database: paths.database,
    log: paths.log,
  }
  writeRegistry(paths.registry, record)

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGHUP', () => void shutdown('SIGHUP'))

  // A daemon must not vanish because one request rejected. Log and keep serving.
  process.on('unhandledRejection', (reason) => log.error('unhandled rejection', { reason: String(reason) }))
  process.on('uncaughtException', (error) => log.error('uncaught exception', { error: error.message }))

  log.info('listening', { url: server.url, pid: process.pid, protocol: PROTOCOL_VERSION, workspace })
  process.stdout.write(
    `${ENGINE_NAME} ${ENGINE_VERSION} listening on ${server.url} (pid ${process.pid}, protocol ${PROTOCOL_VERSION})\n`,
  )

  // The HTTP server keeps the process alive; this promise never settles.
  return new Promise<number>(() => {})
}

async function status(flags: Flags): Promise<number> {
  const paths = resolvePaths(flags)
  const discovery = await discover(paths.registry)
  if (flags.json) {
    process.stdout.write(`${JSON.stringify({ ...discovery, registry: paths.registry }, null, 2)}\n`)
    return 0
  }
  process.stdout.write(`${describe(discovery, paths)}\n`)
  return discovery.state === 'running' ? 0 : 1
}

async function pair(flags: Flags): Promise<number> {
  const discovery = await discover(resolvePaths(flags).registry)
  if (discovery.state !== 'running') { process.stderr.write('Hiroshi daemon is not running. Start it before pairing.\n'); return 1 }
  if (discovery.health.protocol !== PROTOCOL_VERSION) { process.stderr.write('Restart the Hiroshi daemon to use this pairing protocol.\n'); return 1 }
  const client = engineClient(discovery.record)
  try {
    const remote = flags.remote === true
    if (flags.remote !== undefined && !remote) throw new Error('--remote is a boolean flag.')
    if (flags.timeout !== undefined && (!remote || typeof flags.timeout !== 'string')) throw new Error('--timeout requires a number of seconds and --remote.')
    if (remote && (flags.url !== undefined || flags.expose !== undefined || flags.port !== undefined)) throw new Error('--remote cannot be combined with --url, --expose or --port.')
    if (flags.expose === true) {
      const network = await client.networkSettings()
      await client.updateNetwork({ ...network, enabled: true, port: numberFlag(flags, 'port') ?? network.port })
    }
    let previous = ''
    const invitation = remote ? await remoteInvitation(client, { timeoutMs: flags.timeout === undefined ? undefined : Number(flags.timeout) * 1000, onStatus: (state) => {
      if (state.state !== previous) { previous = state.state; process.stderr.write(`Hiroshi internet access: ${state.state}\n`) }
    } }) : await client.createPairing(stringFlag(flags, 'url') ? { address: stringFlag(flags, 'url') } : {})
    if (flags.json === true) process.stdout.write(JSON.stringify(invitation) + '\n')
    else process.stdout.write(['Hiroshi device pairing', `Single use. Expires ${new Date(invitation.expiresAt).toISOString()}.`, '', ...invitation.links, '', renderUnicodeCompact(invitation.payload, { border: 4, ecc: 'M' }), '', remote ? 'Internet access stays enabled in the daemon. Run internet disable to close it. Only pair trusted devices.' : 'Only pair trusted devices. Network access must be reachable from the device; no internet tunnel is created.', ''].join('\n'))
    return 0
  } catch (e) { process.stderr.write(`Hiroshi pairing: ${e instanceof Error ? e.message : 'Could not create an invitation.'}\n`); return 1 }
}

async function internet(flags: Flags, command: string): Promise<number> {
  const discovery = await discover(resolvePaths(flags).registry)
  if (discovery.state !== 'running') { process.stderr.write('Start the Hiroshi daemon before managing internet access.\n'); return 1 }
  if (discovery.health.protocol !== PROTOCOL_VERSION) { process.stderr.write('Restart the Hiroshi daemon to use this internet protocol.\n'); return 1 }
  try {
    const state = await internetCommand(engineClient(discovery.record), command)
    process.stdout.write(flags.json === true ? JSON.stringify(state) + '\n' : [`Hiroshi internet access: ${state.state}`, ...(state.url ? [state.url] : []), ...(state.error ? [state.error] : []), ''].join('\n'))
    return 0
  } catch (e) { process.stderr.write(`Hiroshi internet access: ${e instanceof Error ? e.message : 'Request failed'}\n`); return 1 }
}

async function stop(flags: Flags): Promise<number> {
  const paths = resolvePaths(flags)
  const discovery = await discover(paths.registry)
  if (discovery.state === 'unreachable') {
    process.stderr.write(`${ENGINE_NAME}: ${discovery.reason}\n`)
    return 4
  }
  if (discovery.state !== 'running') {
    removeRegistry(paths.registry)
    process.stdout.write(`${ENGINE_NAME} is not running\n`)
    return 0
  }

  const { record } = discovery
  try {
    await daemonFetch(`${record.url}/v1/shutdown`, {
      method: 'POST',
      headers: { authorization: `Bearer ${record.token}` },
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // It may already be on its way out.
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (!processAlive(record.pid)) break
    await sleep(100)
  }

  if (processAlive(record.pid)) {
    try {
      if (process.platform === 'win32') {
        Bun.spawnSync({ cmd: ['taskkill', '/pid', String(record.pid), '/t', '/f'], stdio: ['ignore', 'ignore', 'ignore'] })
      } else {
        process.kill(record.pid, 'SIGKILL')
      }
    } catch {
      // Gone between the check and the signal.
    }
  }

  removeRegistry(paths.registry)
  process.stdout.write(`${ENGINE_NAME} stopped (pid ${record.pid})\n`)
  return 0
}

async function main(): Promise<number> {
  const { command, flags, positionals } = parse(process.argv.slice(2))

  if (flags.help || command === 'help') {
    process.stdout.write(
      [
        `${ENGINE_NAME} ${ENGINE_VERSION} (protocol ${PROTOCOL_VERSION})`,
        '',
        'usage: hiroshi-engine <command> [flags]',
        '',
        '  serve     run the daemon in the foreground (default)',
        '  status    report the daemon the registry points at',
        '  pair      print a single-use device pairing link and QR code',
        '  internet status|enable|disable|retry  manage the internet tunnel',
        '  stop      ask the running daemon to shut down',
        '  version   print the version and the protocol version',
        '',
        'flags:',
        '  --data-dir <path>  where the database, registry and log live',
        '  --workspace <path> the directory new sessions start in',
        '  --host <address>   bind address, loopback by default',
        '  --port <number>    bind port, an ephemeral one by default',
        '  --provider-delay <ms>  hold the local provider between stream chunks',
        '  --json             machine readable `status`',
        '  pair --expose      explicitly enable the LAN network listener',
        '  pair --remote      enable/wait for internet access, then print its QR/link',
        '  pair --remote --timeout <seconds>  wait at most 1–300 seconds',
        '  pair --url <https-origin>  use an existing HTTPS endpoint',
        '  pair --json        print the invitation payload and SVG QR code',
        '',
      ].join('\n'),
    )
    return 0
  }

  if (command === 'version') {
    process.stdout.write(`${ENGINE_NAME} ${ENGINE_VERSION} (protocol ${PROTOCOL_VERSION})\n`)
    return 0
  }

  if (command === 'serve') return serve(flags)
  if (command === 'status') return status(flags)
  if (command === 'pair') return pair(flags)
  if (command === 'internet') {
    if (positionals.length > 1) { process.stderr.write('Use internet status, enable, disable or retry.\n'); return 2 }
    return internet(flags, positionals[0] ?? 'status')
  }
  if (command === 'stop') return stop(flags)

  process.stderr.write(`hiroshi-engine: unknown command "${command}"\n`)
  return 2
}

if (process.argv[2] === '__execution-child') await runProcessChild()
const code = await main()
process.exit(code)
