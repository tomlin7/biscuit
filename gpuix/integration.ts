/**
 * The windowed integration test.
 *
 *   bun run test:integration
 *
 * `bun run test` drives the cockpit through GPUIX's in-process test renderer:
 * no window, no child process, no daemon. This script is the other half. It
 * starts the app the way a person starts it, drives the real window over the
 * automation protocol, and then asserts the part that only exists when every
 * piece is real: a command handed to the terminal keeps running after the
 * window is gone, and lands in the engine's durable log.
 *
 * Two things the automation client does not do for us, and `openWindow` does:
 *
 * - `launch()` waits for the app's `initialize` with no deadline. The
 *   automation server is installed *after* the native window exists
 *   (`@gpuix/native`'s `renderer.init` calls `enableAutomation`), so a machine
 *   that cannot open a window is a silent hang rather than a failure. This
 *   launcher races that wait against a deadline.
 * - `launch()` reads the child's stdout only. Whatever the app wrote to stderr
 *   on its way down is dropped, so a hang says nothing about why. Both streams
 *   are kept here and printed when a step fails.
 *
 * The daemon is the one the cockpit spawns for itself. `HIROSHI_HOME` points at
 * a scratch directory, so a run never touches the profile of the machine it
 * runs on, and the daemon is shut down on every path out of this file.
 *
 * The text assertions read the automation tree, not the painted canvas:
 * `getPaintedText` answers with nothing while the window is in the background,
 * and the tree answers either way.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { connectStdio, type App, type TreeNode } from '@gpuix/react/automation'

import { toolFixture } from './engine/test/tool-fixture'

import { engineClient, type EngineClient } from './src/engine/client'
import { localPaths, readRegistry, type LocalPaths } from './src/engine/discovery'

/** How long the window may take to appear before the wait is called a hang. */
const WINDOW_DEADLINE_MS = 90_000
/** How long a single assertion may wait. */
const STEP_DEADLINE_MS = 30_000
/** How long the daemon may take to answer. */
const DAEMON_DEADLINE_MS = 60_000

/** The first command: it prints a line and exits. */
const MARKER = 'hiroshi-from-the-window'
const FIRST_COMMAND = `echo ${MARKER}`
/** The second one outlives the window, which is the whole point. */
const SURVIVOR = 'survived-the-window'
const SECOND_COMMAND = `bun -e "setTimeout(() => console.log('${SURVIVOR}'), 30000)"`
/** A command the session's inbox can be steered past. */
const INBOX_COMMAND = process.platform === 'win32' ? 'Start-Sleep -Seconds 30' : 'sleep 30'
/** The prompt admitted while that command is going, delivered by the interrupt. */
const INBOX_PROMPT = 'also-update-the-changelog'

function note(line: string): void {
  console.log(`[integration] ${line}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

/** A capped buffer of what the app wrote, so a failure message stays readable. */
function createTail(limit = 16 * 1024): { push: (chunk: string) => void; text: () => string } {
  let buffer = ''
  return {
    push(chunk) {
      buffer += chunk
      if (buffer.length > limit) buffer = buffer.slice(buffer.length - limit)
    },
    text() {
      return buffer.trim()
    },
  }
}

/**
 * Split a stream into lines and hand over the ones the app wrote itself. The
 * automation protocol shares stdout with the app's logs, and a `data:` frame is
 * a reply, not a message: printing them buries the reason for a failure.
 */
function lineReader(sink: (line: string) => void): (chunk: string) => void {
  let pending = ''
  return (chunk) => {
    pending += chunk
    let boundary = pending.indexOf('\n')
    while (boundary >= 0) {
      const line = pending.slice(0, boundary)
      pending = pending.slice(boundary + 1)
      if (line && !line.startsWith('data:')) sink(line)
      boundary = pending.indexOf('\n')
    }
  }
}

async function withDeadline<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  // The loser of the race may reject after the race is over. That is a promise
  // nobody is waiting for any more, not an unhandled rejection.
  work.catch(() => {})
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} did not answer within ${Math.round(ms / 1000)}s`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function waitUntil<T>(
  probe: () => Promise<T | false | null | undefined>,
  what: string,
  timeoutMs = STEP_DEADLINE_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let last = 'nothing yet'
  for (;;) {
    let value: T | false | null | undefined
    try {
      value = await probe()
    } catch (error) {
      // A locator that matches nothing throws. That is "not yet", not a
      // failure: the caller's deadline decides when to give up.
      value = false
      last = error instanceof Error ? error.message : String(error)
    }
    if (value !== false && value !== null && value !== undefined) return value
    if (Date.now() >= deadline) throw new Error(`timed out after ${timeoutMs}ms waiting for ${what} (${last})`)
    await sleep(100)
  }
}

interface WindowSession {
  pid: number
  app: App
  /** Everything the app itself wrote, for a failure message. */
  output: () => string
  close: () => Promise<void>
}

export async function openWindow(env: NodeJS.ProcessEnv, workspace: string, args: string[] = []): Promise<WindowSession> {
  const packaged = process.env.HIROSHI_TEST_PACKAGED
  const child = spawn(packaged ?? process.execPath, packaged ? ['--window', ...args] : [path.resolve(import.meta.dir, 'app.tsx'), ...args], {
    cwd: workspace,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()))

  const tail = createTail()
  const listeners: ((chunk: string) => void)[] = []
  const readStdout = lineReader((line) => tail.push(`${line}\n`))
  child.stdout?.on('data', (buffer: Buffer) => {
    const chunk = buffer.toString('utf8')
    readStdout(chunk)
    for (const listener of listeners) listener(chunk)
  })
  const readStderr = lineReader((line) => tail.push(`${line}\n`))
  child.stderr?.on('data', (buffer: Buffer) => readStderr(buffer.toString('utf8')))

  const kill = () => {
    try {
      child.kill()
    } catch {
      // Already gone.
    }
  }

  try {
    const app = await withDeadline(
      connectStdio({
        write: (chunk) => {
          child.stdin?.write(chunk)
        },
        feed: (listener) => {
          listeners.push(listener)
        },
        close: async () => kill(),
      }),
      WINDOW_DEADLINE_MS,
      'the window',
    )
    return {
      pid: child.pid!,
      app,
      output: () => tail.text(),
      close: async () => {
        try { await app.close() }
        finally { kill(); await withDeadline(exited, 5000, 'the test window to exit') }
      },
    }
  } catch (error) {
    kill()
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `the window could not be driven: ${reason}\n--- what the app wrote ---\n${tail.text() || '(nothing)'}`,
    )
  }
}

/** Every text node in the automation tree, in document order. */
function flatten(node: TreeNode | null): string[] {
  if (!node) return []
  const lines: string[] = []
  if (node.text) lines.push(node.text)
  for (const child of node.children ?? []) lines.push(...flatten(child))
  return lines
}

export async function treeText(app: App): Promise<string> {
  const { tree } = await app.call('getTree', {})
  return flatten(tree).join('\n')
}

/** Wait until an element stops moving, so a click lands where it is drawn. */
async function settle(locator: { bounds: () => Promise<{ x: number; y: number }> }): Promise<void> {
  let previous: { x: number; y: number } | null = null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const bounds = await locator.bounds()
    if (previous && bounds.x === previous.x && bounds.y === previous.y) return
    previous = bounds
    await sleep(25)
  }
}

async function openTerminal(app: App): Promise<void> {
  // The panel slides in, and the automation clicks the last painted bounds.
  // Freeze the clock, open it, advance past the animation, then wait for the
  // card to stop moving.
  await app.clock.pause()
  await app.getByTestId('panel-right-open').click()
  await app.clock.fastForward(320)
  await app.clock.resume()

  const card = app.getByTestId('surface-card-terminal')
  await card.waitFor({ timeoutMs: STEP_DEADLINE_MS })
  await settle(card)
  await card.click()
  await app.getByTestId('terminal-input').waitFor({ timeoutMs: STEP_DEADLINE_MS })
}

async function submit(app: App, command: string): Promise<void> {
  const input = app.getByTestId('terminal-input')
  await input.fill(command)
  await input.press('enter')
}

/** The text of every run card the terminal has drawn. */
async function runsText(app: App): Promise<string> {
  const runs = await app.getByTestId('terminal-run').all()
  return runs.map((run) => flatten(run).join('\n')).join('\n---\n')
}

/** The window half: the cockpit, the terminal and two commands through it. */
async function driveTheWindow(home: string, browserURL: string): Promise<void> {
  const workspace = path.join(home, 'workspace')
  mkdirSync(workspace)
  writeFileSync(path.join(workspace, 'huge.txt'), 'window-full-output-marker\n' + 'z'.repeat(32 * 1024))
  const git = (args: string[]) => {
    const result = Bun.spawnSync({ cmd: ['git', '-C', workspace, ...args], stdout: 'pipe', stderr: 'pipe', windowsHide: true })
    check(result.exitCode === 0, result.stderr.toString())
    return result.stdout.toString().trim()
  }
  git(['init', '-b', 'main']); git(['config', 'user.name', 'Window test']); git(['config', 'user.email', 'window@local']); git(['config', 'commit.gpgsign', 'false'])
  git(['add', '.']); git(['commit', '-m', 'initial fixture'])
  const window = await openWindow({
    HIROSHI_HOME: home,
    HIROSHI_USAGE_HOME: path.join(home, 'external-history'),
    HIROSHI_TOOL_FIXTURE_KEY: 'local-window-fixture',
    // Do not take the keyboard away from whoever is sitting at the machine.
    GPUIX_BACKGROUND: '1',
  }, workspace)

  try {
    const { app } = window
    await app.getByTestId('composer').waitFor({ timeoutMs: WINDOW_DEADLINE_MS })
    note('the cockpit mounted')

    const mounted = await treeText(app)
    for (const line of ['New Task', 'Search']) {
      check(mounted.includes(line), `the cockpit did not draw "${line}"`)
    }

    await openTerminal(app)
    note('the Terminal surface is open')

    // The terminal draws `terminal-offline` until a daemon answers, and the
    // listening line once one does.
    await waitUntil(
      async () => {
        const text = await treeText(app)
        if (text.includes('The daemon is listening for')) return text
        const offline = await app.getByTestId('terminal-offline').textContent()
        if (offline.trim()) throw new Error(`the terminal is offline: ${offline.trim()}`)
        return false
      },
      'the daemon to answer the cockpit',
      DAEMON_DEADLINE_MS,
    )
    note('the daemon answered')
    await waitUntil(async () => (await app.getByTestId('engine-run-status').textContent()).includes('No run') || false, 'the session snapshot to hydrate before checking its empty run state')

    await submit(app, FIRST_COMMAND)
    const first = await waitUntil(
      async () => {
        const text = await runsText(app)
        return text.includes(MARKER) && text.includes('exit 0') ? text : false
      },
      'the first command to print its output and its exit code',
      STEP_DEADLINE_MS,
    )
    check(first.includes(`> ${FIRST_COMMAND}`), `the terminal did not show the command it ran:\n${first}`)
    note(`the first command came back with exit 0: ${FIRST_COMMAND}`)

    // The inbox, through the window: a prompt admitted while a command is going
    // waits, and the interrupt stops the command and delivers it.
    await submit(app, INBOX_COMMAND)
    await app.getByTestId('interrupt-session').waitFor({ timeoutMs: STEP_DEADLINE_MS })

    await waitUntil(async () => (await app.getByTestId('composer-delivery-mode').textContent()) === 'Queue' || false, 'the main composer to queue while busy')
    await app.getByTestId('composer-delivery-mode').click()
    check((await app.getByTestId('composer-delivery-mode').textContent()) === 'Steer', 'the composer cannot steer')
    const promptInput = app.getByTestId('composer')
    await promptInput.fill(INBOX_PROMPT)
    await promptInput.press('enter')

    await waitUntil(
      async () => {
        const text = await treeText(app)
        return text.includes('1 PENDING') && text.includes(INBOX_PROMPT) ? text : false
      },
      'the prompt to wait in the session inbox',
      STEP_DEADLINE_MS,
    )
    note('the prompt is waiting in the inbox, and the command is still running')

    await app.getByTestId('interrupt-session').click()
    const delivered = await waitUntil(
      async () => {
        const text = await treeText(app)
        return text.includes('0 PENDING') && text.includes('1 DELIVERED') ? text : false
      },
      'the interrupt to deliver the pending prompt',
      STEP_DEADLINE_MS,
    )
    check(
      delivered.includes('the operator stopped this command'),
      `the stopped run does not say why it stopped:\n${delivered}`,
    )
    note('the interrupt stopped the run and delivered the pending prompt')

    // The delivered prompt is a durable step: the local provider's answer is
    // in the transcript, and the strip shows which provider, attempt and
    // status produced it.
    const stepped = await waitUntil(
      async () => {
        const text = await treeText(app)
        return text.includes('STEP · LOCAL · SUCCEEDED') &&
          text.includes('The local provider received: also-update-the-changelog')
          ? text
          : false
      },
      'the step that answers the delivered prompt to finish',
      STEP_DEADLINE_MS,
    )
    check(stepped.includes('ATTEMPT 1'), `the step strip does not show its attempt:\n${stepped}`)
    note('the delivered prompt ran as a durable step and its answer is in the strip')

    // The main composer uses the engine catalog, and its transcript draws
    // provider failures and real streamed answers rather than demo replies.
    await app.getByTestId('model-picker').click()
    await app.getByTestId('model-restricted/chat').waitFor()
    await app.getByTestId('model-restricted/chat').click()
    const composer = app.getByTestId('composer')
    await composer.fill('window-provider-denial')
    await composer.press('enter')
    await waitUntil(async () => {
      const nodes = await app.getByTestId('engine-transcript').all()
      return nodes.some((node) => flatten(node).join('\n').includes('provider_denied')) || false
    }, 'a policy denial in the main transcript')
    note('the main transcript shows the denied provider')

    // An explicit Settings selection also clears a rejected composer choice,
    // including reselecting the existing saved default.
    await app.getByTestId('settings').click()
    await app.getByTestId('settings-section-providers').click()
    await app.getByTestId('provider-choose-default').click()
    await app.getByTestId('provider-default-local/echo').waitFor()
    await app.getByTestId('provider-default-local/echo').click()
    await sleep(100)
    await app.getByTestId('settings-back').click()
    await waitUntil(async () => (await app.getByTestId('model-picker').textContent()).includes('Local echo') || false, 'an explicit Settings selection to clear the rejected composer choice')
    await composer.fill('window-main-composer')
    await composer.press('enter')
    await waitUntil(async () => {
      const nodes = await app.getByTestId('engine-transcript').all()
      return nodes.some((node) => flatten(node).join('\n').includes('The local provider received: window-main-composer')) || false
    }, 'the selected engine model to answer in the main transcript')
    const selected = await app.getByTestId('model-picker').textContent()
    check(selected.includes('Local echo'), `the picker did not show the selected engine model: ${selected}`)
    note('the main composer used the catalog model and drew its real answer')

    await app.getByTestId('settings').click()
    await app.getByTestId('settings-section-providers').click()
    const providerClient = engineClient(readRegistry(localPaths(home).registry)!)
    const pathRevision = (await providerClient.providers()).revision
    await app.getByTestId('provider-setup-cursor').click()
    await app.getByTestId('provider-path-cursor').fill(process.execPath)
    await app.getByTestId('provider-entry-cursor').fill(path.join(import.meta.dir, 'engine/test/fixtures/provider-cli.ts'))
    await app.getByTestId('provider-save-cursor').click()
    await waitUntil(async () => (await providerClient.providers()).revision > pathRevision, 'the manual executable path to persist')
    await sleep(100)
    await app.getByTestId('provider-setup-cursor').click()
    await app.getByTestId('providers-refresh').click()
    await waitUntil(async () => (await app.getByTestId('provider-status-cursor').textContent()).includes('Ready') || false,
      'metadata discovery to reach the native Providers screen')
    try {
      mkdirSync(path.join(process.cwd(), 'screenshots'), { recursive: true })
      await app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-providers.png') })
    } catch (error) { note(`provider screenshot unavailable: ${String(error)}`) }
    const providerState = await providerClient.providers()
    const discoveredModel = providerState.agents.find((agent) => agent.id === 'cursor')!.models[0]!.catalogID
    await app.getByTestId('provider-choose-default').click()
    await app.getByTestId(`model-star-${discoveredModel}`).waitFor()
    await app.getByTestId(`model-star-${discoveredModel}`).click()
    check((await providerClient.providers()).defaultModel === providerState.defaultModel, 'starring a model changed the default')
    await app.getByTestId('model-favorites').click()
    try { await app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-model-picker.png') }) } catch {}
    await app.getByTestId(`provider-default-${discoveredModel}`).click()
    await waitUntil(async () => (await providerClient.providers()).defaultModel === discoveredModel, 'the default selection to persist')
    await app.getByTestId('settings-back').click()
    await waitUntil(async () => (await app.getByTestId('model-picker').textContent()).includes('Cursor Agent') || false,
      'the composer to share the discovered default')
    await composer.fill('window-cli-response')
    await composer.press('enter')
    await waitUntil(async () => {
      const nodes = await app.getByTestId('engine-transcript').all()
      return nodes.some((node) => flatten(node).join('\n').includes('Hello 漢🙂')) || false
    }, 'the installed CLI adapter fixture to stream into the main transcript')
    check((await app.getByTestId('cli-response-mode').textContent()).includes('response only'), 'CLI coding limits were not visible')
    check((await app.getByTestId('model-picker').textContent()).includes('response only'), 'CLI model capability was not labelled')
    note('the main composer drove a contained CLI process and drew its response-only answer')
    await waitUntil(async () => (await app.getByTestId('cli-conversation-status').textContent()).includes('native conversation ready'), 'the CLI conversation to settle before a model transition')

    // Real tool requests travel through the daemon and the cockpit's gate.
    await app.getByTestId('model-picker').click()
    await app.getByTestId('model-fixture/tools').waitFor()
    await app.getByTestId('model-fixture/tools').click()
    await app.getByTestId('cli-fresh').click()
    await waitUntil(async () => (await app.getByTestId('cli-conversation').all()).length === 0, 'the explicit transition out of native CLI history')
    const record = readRegistry(localPaths(home).registry)!
    const client = engineClient(record)
    const pending = async () => {
      for (const session of (await client.listSessions()).sessions) {
        const detail = await client.session({ id: session.id })
        const permission = detail.permissions.find((p) => p.state === 'pending')
        if (permission) return { detail, permission }
      }
      return false
    }
    for (const action of ['allow', 'deny'] as const) {
      await composer.fill(action === 'allow' ? 'approve' : 'deny')
      await composer.press('enter')
      const { permission } = await waitUntil(pending, 'the model tool permission question')
      await app.getByTestId(`permission-${permission.id}`).waitFor()
      check(!existsSync(path.join(workspace, action === 'allow' ? 'approved.txt' : 'denied.txt')), 'the tool ran before its answer')
      if (action === 'allow') await app.getByTestId(`permission-remember-${permission.id}`).click()
      await app.getByTestId(`permission-${action}-${permission.id}`).click()
      await waitUntil(async () => (await treeText(app)).includes(`Tool turn complete: ${action === 'allow' ? 'approve' : 'deny'}`) || false,
        'the model to continue after the cockpit answer')
      if (action === 'allow') check(readFileSync(path.join(workspace, 'approved.txt'), 'utf8') === 'approved from the model', 'the approved write did not run')
      else check(!existsSync(path.join(workspace, 'denied.txt')), 'the declined write ran')
      note(`the cockpit answered ${action} and the model continued`)
    }
    await composer.fill('huge')
    await composer.press('enter')
    const { permission: huge } = await waitUntil(pending, 'the large read permission')
    await app.getByTestId(`permission-allow-${huge.id}`).waitFor()
    await app.getByTestId(`permission-allow-${huge.id}`).click()
    await waitUntil(async () => (await treeText(app)).includes('Tool turn complete: huge') || false, 'the large read to finish')
    await app.getByTestId(`tool-output-${huge.toolCallID}`).click()
    await app.getByTestId('tool-output-viewer').waitFor()
    check((await treeText(app)).includes('window-full-output-marker'), 'the full output did not open')
    try {
      const shots = path.join(process.cwd(), 'screenshots')
      mkdirSync(shots, { recursive: true })
      await app.screenshot({ path: path.join(shots, 'windowed-tools.png') })
    } catch (error) { note(`tool screenshot unavailable: ${String(error)}`) }
    await app.getByTestId('tool-output-close').click()
    note('the cockpit opened the complete managed tool result')

    // A checkpoint precedes the prompt, so one click restores code and chat.
    writeFileSync(path.join(workspace, 'approved.txt'), 'window-before-checkpoint')
    await composer.fill('checkpoint-window-change')
    await composer.press('enter')
    await waitUntil(async () => (await treeText(app)).includes('Tool turn complete: checkpoint-window-change') || false, 'the checkpointed tool turn to finish')
    check(readFileSync(path.join(workspace, 'approved.txt'), 'utf8') === 'approved from the model', 'the checkpointed tool did not change the workspace')
    const target = await waitUntil(async () => {
      for (const session of (await client.listSessions()).sessions) {
        const detail = await client.session({ id: session.id })
        const checkpoint = detail.checkpoints.find((checkpoint) => checkpoint.label === 'checkpoint-window-change')
        if (checkpoint) return checkpoint
      }
      return false
    }, 'the pre-prompt checkpoint')
    await app.getByTestId('checkpoint-toggle').click()
    await app.getByTestId(`checkpoint-restore-${target.id}`).waitFor()
    await app.getByTestId(`checkpoint-restore-${target.id}`).click()
    await waitUntil(async () => {
      const nodes = await app.getByTestId('engine-transcript').all()
      const text = nodes.map((node) => flatten(node).join('\n')).join('\n')
      return text.includes('Rewound workspace and conversation to checkpoint') && !text.includes('Tool turn complete: checkpoint-window-change') || false
    }, 'the checkpoint rewind to update the main transcript')
    check(readFileSync(path.join(workspace, 'approved.txt'), 'utf8') === 'window-before-checkpoint', 'the checkpoint did not restore the workspace')
    await app.getByTestId('checkpoint-toggle').click()
    await app.getByTestId('rewind-history-toggle').click()
    await app.getByTestId('rewind-archived-history').waitFor()
    check((await treeText(app)).includes('Tool turn complete: checkpoint-window-change'), 'rewound history was lost')
    try {
      const shots = path.join(process.cwd(), 'screenshots')
      mkdirSync(shots, { recursive: true })
      await app.screenshot({ path: path.join(shots, 'windowed-checkpoints.png') })
    } catch (error) { note(`checkpoint screenshot unavailable: ${String(error)}`) }
    await app.getByTestId('rewind-history-toggle').click()
    note('the cockpit restored workspace and conversation together, retaining earlier history')

    await composer.fill('model-shell')
    await composer.press('enter')
    const { permission: shell } = await waitUntil(pending, 'the model shell permission')
    await app.getByTestId(`permission-allow-${shell.id}`).waitFor()
    await app.getByTestId(`permission-allow-${shell.id}`).click()
    await waitUntil(async () => {
      const nodes = await app.getByTestId('terminal-model-tool').all()
      return nodes.some((node) => flatten(node).join('\n').includes('model-shell-marker')) || false
    }, 'real model shell output in the Terminal surface')
    note('the terminal shows a command started by the model and its real result')
    const surface = async (name: string) => {
      await app.getByTestId('surface-plus-menu').click()
      await app.getByTestId(`surface-select-${name}`).waitFor()
      await app.getByTestId(`surface-select-${name}`).click()
      await sleep(250)
    }
    await surface('files')
    // Files loads a directory plus a real Git review through the shared
    // execution budget. Use the same bounded I/O deadline as other engine
    // operations, rather than the automation client's five-second default.
    await app.getByTestId('files-open-approved.txt').waitFor({ timeoutMs: STEP_DEADLINE_MS })
    await app.getByTestId('files-changed-approved.txt').waitFor({ timeoutMs: STEP_DEADLINE_MS })
    await app.getByTestId('files-open-approved.txt').click()
    await app.getByTestId('workspace-file-content').waitFor({ timeoutMs: STEP_DEADLINE_MS })
    const fileBounds = await app.getByTestId('workspace-file-content').bounds()
    check(fileBounds.width > 0 && fileBounds.height > 0, 'the native file viewer has no painted area')
    const currentSession = (await client.listSessions()).sessions[0]!
    check((await client.workspaceFile({ id: currentSession.id, path: 'approved.txt' })).text === 'window-before-checkpoint', 'the file viewer source is not the current workspace')
    try {
      mkdirSync(path.join(process.cwd(), 'screenshots'), { recursive: true })
      await app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-files.png') })
    } catch (error) { note(`file screenshot unavailable: ${String(error)}`) }
    note('Files opened the tool-changed file and marked its real Git status')
    await surface('review')
    await app.getByTestId('review-file-approved.txt').waitFor()
    await app.getByTestId('workspace-diff').waitFor()
    const diffBounds = await app.getByTestId('workspace-diff').bounds()
    check(diffBounds.width > 0 && diffBounds.height > 0, 'the native diff has no painted area')
    check((await client.workspaceReview({ id: currentSession.id })).patch.includes('window-before-checkpoint'), 'the diff source does not match the workspace')
    try { await app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-review.png') }) } catch {}
    note('Review displays the same changed file and its actual diff')
    await app.getByTestId('environment-menu-toggle').click()
    await app.getByTestId('env-commit-push').waitFor()
    await app.getByTestId('env-commit-push').click()
    await app.getByTestId('commit-message').waitFor()
    await app.getByTestId('commit-message').fill('window-surface-commit')
    await waitUntil(async () => (await app.getByTestId('commit-file-list').textContent()).includes('approved.txt') || false, 'the same file in the commit list')
    await app.getByTestId('commit-submit').click()
    await waitUntil(async () => (await app.getByTestId('commit-run-status').textContent()).includes('succeeded') || false, 'the real commit to succeed')
    check(git(['log', '-1', '--format=%B']) === 'window-surface-commit', 'the commit button did not create a real commit')
    await app.getByTestId('commit-open-terminal').click()
    note('the commit flow listed real changes and created the commit through the daemon')
    await surface('browser')
    await app.getByTestId('browser-address').fill(browserURL)
    await app.getByTestId('browser-go').click()
    await app.getByTestId('browser-link-0').waitFor()
    check((await treeText(app)).includes('First local page'), 'the browser did not load the real page')
    await app.getByTestId('browser-link-0').click()
    await waitUntil(async () => (await treeText(app)).includes('Second local page') || false, 'linked browser page')
    await app.getByTestId('browser-back').click()
    check((await treeText(app)).includes('First local page'), 'browser back did not restore history')
    await app.getByTestId('browser-forward').click()
    check((await treeText(app)).includes('Second local page'), 'browser forward did not restore history')
    await surface('review')
    await surface('browser')
    check((await treeText(app)).includes('Second local page'), 'changing surfaces lost browser history')
    try {
      const shots = path.join(process.cwd(), 'screenshots'); mkdirSync(shots, { recursive: true })
      await app.screenshot({ path: path.join(shots, 'windowed-surfaces.png') })
    } catch (error) { note(`surface screenshot unavailable: ${String(error)}`) }
    note('the browser loaded local pages, followed a link and preserved navigation history')
    await surface('terminal')

    // A command that outlives the window. It is still running when the window
    // goes away, and the daemon has to finish it without one.
    await submit(app, SECOND_COMMAND)
    await waitUntil(
      async () => {
        const text = await runsText(app)
        return text.includes(SURVIVOR) && text.includes('running') ? text : false
      },
      'the long command to start',
      STEP_DEADLINE_MS,
    )
    note('the long command is running, and the window is about to close')
    await waitUntil(async () => (await app.getByTestId('engine-run-status').textContent()).includes('Running') || false, 'the real command phase in the header')
    const twin = await openWindow({ HIROSHI_HOME: home, HIROSHI_TOOL_FIXTURE_KEY: 'local-window-fixture', GPUIX_BACKGROUND: '1' }, workspace)
    try {
      await twin.app.getByTestId('composer').waitFor({ timeoutMs: WINDOW_DEADLINE_MS })
      await waitUntil(async () => (await twin.app.getByTestId('engine-run-status').textContent()).includes('Running') || false, 'the second window to show the same running command')
      check((await twin.app.getByTestId('engine-run-status').textContent()) === (await app.getByTestId('engine-run-status').textContent()), 'two windows disagree about the run state')
      check((await twin.app.getByTestId('composer-delivery-mode').textContent()) === 'Queue', 'the second composer cannot see that the engine is busy')
      const beforeDefault = await providerClient.providers()
      await providerClient.updateProviders({ revision: beforeDefault.revision, defaultModel: 'local/echo' })
      await waitUntil(async () => (await app.getByTestId('model-picker').textContent()).includes('Local echo') &&
        (await twin.app.getByTestId('model-picker').textContent()).includes('Local echo'), 'both open composers to receive the shared default change')
      await twin.app.getByTestId('run-usage-open').click()
      await twin.app.getByTestId('usage-settings').waitFor()
      await waitUntil(async () => (await twin.app.getByTestId('usage-coverage').textContent()).includes('Updated'), 'durable usage analytics to load')
      const usage = await twin.app.getByTestId('usage-settings').textContent()
      check(usage.includes('Processed tokens') &&
        (await twin.app.getByTestId('usage-total-cost').textContent()) === '—', 'Usage did not draw durable unpriced provider counts')
      await twin.app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-usage.png') })
      await app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-cockpit.png') })
      note('two real windows agree on engine state; Usage shows provider counts')
    } finally { await twin.close() }

    // Evidence, not an assertion: a live renderer may not implement
    // screenshots, and that is not what this test is about.
    try {
      const shots = path.join(process.cwd(), 'screenshots')
      mkdirSync(shots, { recursive: true })
      await app.screenshot({ path: path.join(shots, 'windowed-terminal.png') })
      note('wrote screenshots/windowed-terminal.png')
    } catch (error) {
      note(`the window did not give a screenshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  } finally {
    try { await window.app.screenshot({ path: path.join(process.cwd(), 'screenshots', 'windowed-final-state.png') }) } catch {}
    await window.close()
    const said = window.output()
    if (said) note(`the app wrote:\n${said}`)
  }
}

/** The daemon half: the run that started before the window closed. */
async function readTheSurvivor(client: EngineClient): Promise<{ exitCode: number | null; status: string; output: string }> {
  return waitUntil(
    async () => {
      const { sessions } = await client.listSessions()
      for (const session of sessions) {
        const detail = await client.session({ id: session.id })
        const run = detail.runs.find((candidate) => candidate.command.includes(SURVIVOR))
        if (!run) continue
        if (run.status === 'running') return false
        const output = detail.chunks
          .filter((chunk) => chunk.runID === run.id)
          .map((chunk) => chunk.data)
          .join('')
        return { exitCode: run.exitCode, status: run.status, output }
      }
      return false
    },
    'the run that started before the window closed to finish',
    DAEMON_DEADLINE_MS,
  )
}

/**
 * Stop the daemon the cockpit started.
 *
 * The cockpit spawns it during mount and leaves it running on purpose, so the
 * test is the only thing that will ever stop it. An assertion that fails early
 * can get here before the daemon has written its discovery file, so this waits
 * for the file rather than reading it once: a failed run must not leave a
 * daemon behind either.
 */
export async function stopTheDaemon(home: string): Promise<void> {
  const registry = localPaths(home).registry
  const giveUpAt = Date.now() + DAEMON_DEADLINE_MS
  for (;;) {
    const record = readRegistry(registry)
    if (record) {
      try {
        await engineClient({ url: record.url, token: record.token }).shutdown()
        note(`the daemon is shut down (pid ${record.pid})`)
      } catch (error) {
        note(`the daemon did not answer the shutdown: ${error instanceof Error ? error.message : String(error)}`)
      }
      return
    }
    if (Date.now() >= giveUpAt) {
      note('no daemon was left behind')
      return
    }
    await sleep(200)
  }
}

async function main(): Promise<void> {
  const home = mkdtempSync(path.join(tmpdir(), 'hiroshi-windowed-'))
  const fixture = toolFixture()
  const pages = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(request) {
    const next = new URL(request.url).pathname === '/next'
    return new Response(`<title>${next ? 'Second local page' : 'First local page'}</title><h1>${next ? 'Second local page' : 'First local page'}</h1><p>Real browser surface content.</p><a href="/next">Follow local link</a>`, { headers: { 'content-type': 'text/html' } })
  } })
  writeFileSync(path.join(home, 'providers.json'), JSON.stringify({
    providers: [{ id: 'restricted', adapter: 'openai', models: [{
      id: 'chat', model: 'fixture-never-called', label: 'Restricted model', contextWindow: 32768, reservedOutput: 1024,
    }] }, fixture.provider, { id: 'cli', adapter: 'cursor-cli', command: [process.execPath, path.join(import.meta.dir, 'engine/test/fixtures/cli-response.ts')],
      models: [{ id: 'chat', model: 'default', label: 'CLI fixture', contextWindow: 32768, reservedOutput: 1024 }] }],
    policy: [{ provider: 'restricted', action: 'deny' }],
  }))
  writeFileSync(path.join(home, 'agents.json'), JSON.stringify({ version: 1, revision: 0, agents: [], preferences: {
    agy: { enabled: false }, pi: { enabled: false }, grok: { enabled: false },
    cursor: { enabled: true, command: [process.execPath, path.join(import.meta.dir, 'engine/test/fixtures/provider-cli.ts')] },
  } }))
  const paths: LocalPaths = localPaths(home)
  note(`HIROSHI_HOME is ${home}`)

  let failure: unknown = null
  try {
    await driveTheWindow(home, pages.url.href)
    note('the window is closed; the daemon is on its own')

    const record = await waitUntil(
      async () => readRegistry(paths.registry),
      'the discovery file the cockpit left behind',
      STEP_DEADLINE_MS,
    )
    const client = engineClient({ url: record.url, token: record.token })
    const survivor = await readTheSurvivor(client)

    check(survivor.status === 'succeeded', `the run ended as ${survivor.status}, not succeeded`)
    check(survivor.exitCode === 0, `the run exited with ${survivor.exitCode}, not 0`)
    check(
      survivor.output.includes(SURVIVOR),
      `the durable log does not hold the run's output: ${JSON.stringify(survivor.output)}`,
    )
    note(`the run outlived the window: exit ${survivor.exitCode}, "${SURVIVOR}" is in the log`)
    const reopened = await openWindow({ HIROSHI_HOME: home, GPUIX_BACKGROUND: '1', HIROSHI_TOOL_FIXTURE_KEY: 'local-window-fixture' }, path.join(home, 'workspace'))
    try {
      await waitUntil(async () => (await treeText(reopened.app)).includes('Rewound workspace and conversation to checkpoint') || false,
        'the reopened cockpit to show the restored conversation')
      const nodes = await reopened.app.getByTestId('engine-transcript').all()
      check(!nodes.map((node) => flatten(node).join('\n')).join('\n').includes('Tool turn complete: checkpoint-window-change'), 'reopening restored the archived turn into the active conversation')
      note('reopening the cockpit preserved the rewind and its active transcript')
      const original = (await client.listSessions()).sessions[0]!
      await reopened.app.getByTestId('new-task').click()
      await waitUntil(async () => (await reopened.app.getByTestId('engine-run-status').textContent()).includes('No run') || false, 'a newly created engine session to have no run')
      await waitUntil(async () => !(await treeText(reopened.app)).includes('Rewound workspace and conversation to checkpoint'), 'the new session to clear the old transcript')
      await reopened.app.getByTestId(`thread-${original.id}`).click()
      await waitUntil(async () => (await treeText(reopened.app)).includes('Rewound workspace and conversation to checkpoint') || false, 'selecting the original durable session')
      note('New Task and sidebar selection switch actual engine sessions without leaking transcript state')
    } finally { await reopened.close() }
    const targetSession = (await client.listSessions()).sessions.find((session) => session.title === 'also-update-the-changelog')!
    const link = `hiroshi://session/${targetSession.id}?file=approved.txt&line=1`
    const linked = await openWindow({ HIROSHI_HOME: home, GPUIX_BACKGROUND: '1', HIROSHI_TOOL_FIXTURE_KEY: 'local-window-fixture' }, path.join(home, 'workspace'), [link])
    try {
      await waitUntil(async () => (await linked.app.getByTestId('file-line-target').textContent()).includes('1: window-before-checkpoint') || false, 'the deep link to select the real session, file and line')
      note('the deep link opened the specified durable session and actual file line')
      if (process.platform === 'win32') {
        const { dlopen, FFIType: t } = require('bun:ffi')
        const api = dlopen('user32.dll', { FindWindowW: { args: [t.ptr, t.ptr], returns: t.ptr }, GetWindowThreadProcessId: { args: [t.ptr, t.ptr], returns: t.u32 }, SetWindowPos: { args: [t.ptr, t.ptr, t.i32, t.i32, t.i32, t.i32, t.u32], returns: t.bool } }).symbols
        const hwnd = api.FindWindowW(null, Buffer.from('Hiroshi · Multi-Agent Orchestrator\0', 'utf16le')), pid = new Uint32Array(1)
        api.GetWindowThreadProcessId(hwnd, pid)
        check(pid[0] === linked.pid, 'the geometry test did not find its own window')
        check(api.SetWindowPos(hwnd, null, 100, 120, 1030, 720, 0x214), 'could not move the test window')
        await waitUntil(async () => {
          const saved = JSON.parse(readFileSync(path.join(home, 'shell.json'), 'utf8')).workspaces[path.join(home, 'workspace')].current
          return saved.x === 100 && saved.y === 120 && saved.width === 1030 && saved.height === 720
        }, 'window placement to be stored locally')
      }
    } finally { await linked.close() }
    const restored = await openWindow({ HIROSHI_HOME: home, GPUIX_BACKGROUND: '1', HIROSHI_TOOL_FIXTURE_KEY: 'local-window-fixture' }, path.join(home, 'workspace'))
    try {
      await restored.app.getByTestId('workspace-files').waitFor({ timeoutMs: WINDOW_DEADLINE_MS })
      note('the open Files tab and window preferences survived another launch')
      const savedFavorites = JSON.parse(readFileSync(path.join(home, 'model-favorites.json'), 'utf8')).ids as string[]
      check(savedFavorites.length === 1, 'the favorite was not stored in the test profile')
      await restored.app.clock.pause()
      await restored.app.clock.fastForward(320)
      await restored.app.clock.resume()
      await settle(restored.app.getByTestId('model-picker'))
      await restored.app.getByTestId('model-picker').click()
      await restored.app.getByTestId('model-favorites').waitFor()
      await restored.app.getByTestId('model-favorites').click()
      await restored.app.getByTestId(`model-${savedFavorites[0]}`).waitFor()
      await restored.app.getByTestId('model-search').press('escape')
      note('model favorites survived a complete window restart')
    } finally { await restored.close() }


  } catch (error) {
    failure = error
  }

  await stopTheDaemon(home)
  fixture.server.stop(true)
  pages.stop(true)
  if (failure) throw failure
  note('all assertions passed')
}

if (import.meta.main) await main()
