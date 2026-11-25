/** Focused native project flow; windows run sequentially and await OS exit. */
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { openWindow, waitUntil, treeText, stopTheDaemon } from './integration'
import { readRegistry, localPaths } from './src/engine/discovery'
import { engineClient } from './src/engine/client'
import { createPromptStore } from './src/shell/prompt-store'

const root = mkdtempSync(path.join(tmpdir(), 'hiroshi-project-window-'))
const home = path.join(root, 'engine'), alpha = path.join(root, 'alpha'), beta = path.join(root, 'beta')
mkdirSync(home)
for (const cwd of [alpha, beta]) {
  mkdirSync(cwd)
  const result = Bun.spawnSync(['git', '-C', cwd, 'init', '-b', 'main'])
  if (result.exitCode) throw new Error('Could not initialize project fixture')
  writeFileSync(path.join(cwd, 'AGENTS.md'), `Instructions for ${path.basename(cwd)}`)
}
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const env = { HIROSHI_HOME: home, GPUIX_BACKGROUND: '1' }
async function savedDraft(cwd: string, id: string, text: string) {
  const store = createPromptStore({ cwd, id }, home)
  try { await waitUntil(async () => store.read().text === text, 'all native keystrokes to reach durable draft storage') }
  finally { store.close() }
}
try {
  const window = await openWindow(env, alpha)
  try {
    const app = window.app
    await waitUntil(async () => (await app.getByTestId('engine-workspace').textContent()) === alpha &&
      !(await app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'the initial project')
    const record = await waitUntil(async () => readRegistry(localPaths(home).registry), 'the engine discovery file')
    const client = engineClient(record)
    const first = (await client.listSessions()).sessions.find((item) => item.cwd === alpha)!
    const switchProject = async (cwd: string) => {
      await app.getByTestId('open-project').click()
      await app.getByTestId('open-project-new').waitFor(); await app.getByTestId('open-project-new').click()
      await app.getByTestId('project-path').waitFor()
      await app.getByTestId('project-path').fill(cwd)
      await app.getByTestId('project-open-path').click()
      await waitUntil(async () => (await app.getByTestId('engine-workspace').textContent()) === cwd &&
        !(await app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'the selected project folder')
      await waitUntil(async () => (await client.health()).execution?.active === 0, 'previous workspace reads to settle')
    }
    const send = async (text: string) => {
      await app.getByTestId('composer').fill(text); await app.getByTestId('composer').press('enter')
      await waitUntil(async () => (await treeText(app)).includes(`The local provider received: ${text}`), 'a response in the selected project')
    }
    await send('window-alpha-task')
    await app.getByTestId('open-project').click()
    await app.getByTestId('open-project-new').waitFor(); await app.getByTestId('open-project-new').click()
    await app.getByTestId('project-path').waitFor()
    await app.getByTestId('project-path').fill(path.join(root, 'missing'))
    await app.getByTestId('project-open-path').click()
    await app.getByTestId('project-error').waitFor()
    await app.getByTestId('project-dialog-cancel').click()
    check((await app.getByTestId('engine-workspace').textContent()) === alpha, 'invalid selection changed project')
    await app.getByTestId('composer').fill('unsent alpha draft')
    await savedDraft(alpha, first.id, 'unsent alpha draft')
    await switchProject(beta)
    const afterSwitch = await treeText(app)
    if (afterSwitch.includes('window-alpha-task')) {
      mkdirSync('screenshots', { recursive: true })
      writeFileSync('screenshots/project-switch-tree.json', JSON.stringify(await app.call('getTree', {}), null, 2))
      await app.screenshot({ path: path.resolve('screenshots/project-switch-failure.png') })
    }
    check(!afterSwitch.includes('window-alpha-task'), 'alpha history leaked into beta')
    await app.getByTestId('composer').press('enter')
    const second = (await client.listSessions()).sessions.find((item) => item.cwd === beta)!
    check((await client.session({ id: second.id })).messages.length === 0, 'alpha draft leaked into beta')
    await send('window-beta-task')
    await switchProject(alpha)
    await waitUntil(async () => (await treeText(app)).includes('The local provider received: window-alpha-task'), 'alpha history to return')
    check(!(await treeText(app)).includes('window-beta-task'), 'beta history leaked into alpha')
    await app.getByTestId('composer').press('enter')
    await waitUntil(async () => (await treeText(app)).includes('The local provider received: unsent alpha draft'), 'the alpha draft to return and send')
    await switchProject(beta)
    await waitUntil(async () => (await treeText(app)).includes('The local provider received: window-beta-task'), 'beta history to return')
    check(!(await treeText(app)).includes('window-alpha-task'), 'alpha history remained after reopening beta')
    await app.getByTestId('open-project').click()
    await app.getByTestId('open-project-new').waitFor(); await app.getByTestId('open-project-new').click()
    await app.getByTestId('project-path').waitFor()
    mkdirSync('screenshots', { recursive: true })
    await app.screenshot({ path: path.resolve('screenshots/windowed-projects.png') })
    await app.getByTestId('project-dialog-cancel').click()
    await app.getByTestId('composer').fill('beta draft across tasks')
    await savedDraft(beta, second.id, 'beta draft across tasks')
    await app.getByTestId('new-task').click()
    await waitUntil(async () => !(await treeText(app)).includes('The local provider received: window-beta-task') &&
      !(await app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'a separate beta task')
    await app.getByTestId('composer').press('enter')
    const freshTask = (await client.listSessions()).sessions.find((item) => item.cwd === beta && item.id !== second.id)!
    check((await client.session({ id: freshTask.id })).messages.length === 0, 'the original task draft leaked into a new task')
    await app.getByTestId('composer').fill('a different task draft')
    await savedDraft(beta, freshTask.id, 'a different task draft')
    await app.getByTestId(`thread-${second.id}`).click()
    await waitUntil(async () => (await treeText(app)).includes('The local provider received: window-beta-task'), 'the original beta task')
    await app.getByTestId('composer').press('enter')
    await waitUntil(async () => (await treeText(app)).includes('The local provider received: beta draft across tasks'), 'the task-scoped draft to return')
    await app.getByTestId('composer').fill('beta draft after window restart')
    await savedDraft(beta, second.id, 'beta draft after window restart')
  } finally { await window.close() }
  const restored = await openWindow(env, alpha)
  try {
    await waitUntil(async () => (await restored.app.getByTestId('engine-workspace').textContent()) === beta, 'the last project after window restart')
    await waitUntil(async () => (await treeText(restored.app)).includes('The local provider received: window-beta-task'), 'the saved beta task')
    await restored.app.getByTestId('composer').press('enter')
    await waitUntil(async () => (await treeText(restored.app)).includes('The local provider received: beta draft after window restart'), 'the draft after window restart')
    await restored.app.getByTestId('composer').fill('explicitly discarded draft')
    const currentClient = engineClient(readRegistry(localPaths(home).registry)!)
    const currentSession = (await currentClient.listSessions()).sessions.find((item) => item.cwd === beta && item.title === 'window-beta-task')!
    await savedDraft(beta, currentSession.id, 'explicitly discarded draft')
    await restored.app.getByTestId('draft-discard').click()
    await restored.app.getByTestId('composer').press('enter')
    check(!(await treeText(restored.app)).includes('explicitly discarded draft'), 'discarded input was submitted')
    await restored.app.getByTestId('composer').fill('saved while the engine is offline')
    await savedDraft(beta, currentSession.id, 'saved while the engine is offline')
  } finally { await restored.close() }
  await stopTheDaemon(home)
  await waitUntil(async () => !readRegistry(localPaths(home).registry), 'the owned daemon to stop')
  // Pointing the engine at the cockpit itself is rejected before any spawn.
  // This proves local input remains usable when engine startup fails.
  const offline = await openWindow({ ...env, HIROSHI_ENGINE: process.env.HIROSHI_TEST_PACKAGED ?? process.execPath }, alpha)
  try {
    await offline.app.getByTestId('composer').waitFor()
    await offline.app.getByTestId('composer').press('enter')
    await offline.app.getByTestId('draft-retry').waitFor()
    check((await offline.app.getByTestId('draft-pending-text').textContent()).includes('saved while the engine is offline'), 'the offline draft was lost')
  } finally { await offline.close() }
  const reconnected = await openWindow(env, alpha)
  try {
    await waitUntil(async () => (await reconnected.app.getByTestId('engine-workspace').textContent()) === beta &&
      !(await reconnected.app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'the recovered beta task')
    const client = engineClient(readRegistry(localPaths(home).registry)!)
    const session = (await client.listSessions()).sessions.find((item) => item.cwd === beta && item.title === 'window-beta-task')!
    check(!(await client.session({ id: session.id })).messages.some((item) => item.text.includes('saved while the engine is offline')), 'reconnect automatically replayed an uncertain send')
    await reconnected.app.getByTestId('draft-retry').click()
    await waitUntil(async () => (await treeText(reconnected.app)).includes('The local provider received: saved while the engine is offline'), 'the deliberate offline-send retry')
    check((await client.session({ id: session.id })).messages.filter((item) => item.role === 'user' && item.text === 'saved while the engine is offline').length === 1, 'retry duplicated the prompt')
    mkdirSync('screenshots', { recursive: true })
    await reconnected.app.screenshot({ path: path.resolve('screenshots/windowed-draft-recovery.png') })
  } finally { await reconnected.close() }
  renameSync(beta, path.join(root, 'moved-beta'))
  const missing = await openWindow(env, alpha)
  try {
    await missing.app.getByTestId('project-unavailable').waitFor()
    check((await treeText(missing.app)).includes('window-beta-task'), 'unavailable project history was lost')
    await missing.app.getByTestId('open-project').click()
    await missing.app.getByTestId('open-project-new').waitFor(); await missing.app.getByTestId('open-project-new').click()
    await missing.app.getByTestId('project-path').waitFor()
    await missing.app.getByTestId('project-path').fill(alpha)
    await missing.app.getByTestId('project-open-path').click()
    await waitUntil(async () => (await missing.app.getByTestId('engine-workspace').textContent()) === alpha, 'opening a readable project from unavailable history')
  } finally { await missing.close() }
  console.log('Project windows passed: isolation, task/draft restore, discard, offline send/retry, moved-folder history and recovery.')
} finally { await stopTheDaemon(home) }
