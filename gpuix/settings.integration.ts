/** Real settings flows in an isolated profile; one window and daemon at a time. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { openWindow, waitUntil, stopTheDaemon } from './integration'
import { engineClient } from './src/engine/client'
import { localPaths, readRegistry } from './src/engine/discovery'
import { daemonFetch } from './engine/src/local-transport'

const root = mkdtempSync(path.join(tmpdir(), 'hiroshi-settings-window-'))
const home = path.join(root, 'engine'), workspace = path.join(root, 'project'), history = path.join(root, 'history')
for (const directory of [home, workspace, path.join(history, '.codex', 'sessions')]) mkdirSync(directory, { recursive: true })
const init = Bun.spawnSync(['git', '-C', workspace, 'init', '-b', 'main'])
if (init.exitCode) throw new Error('Could not initialize settings fixture')
const at = new Date(Date.now() - 10000).toISOString()
const counters = { input_tokens: 1000000, cached_input_tokens: 900000, cache_write_input_tokens: 0, output_tokens: 20000, total_tokens: 1020000 }
writeFileSync(path.join(history, '.codex', 'sessions', 'fixture.jsonl'), [
  { type: 'session_meta', payload: { id: 'external-fixture', cwd: workspace } },
  { type: 'turn_context', payload: { model: 'test-model', turn_id: 'external-turn' } },
  { type: 'event_msg', timestamp: at, payload: { type: 'token_count', info: { total_token_usage: counters, last_token_usage: counters } } },
].map((event) => JSON.stringify(event)).join('\n') + '\n')
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const env = { HIROSHI_HOME: home, HIROSHI_USAGE_HOME: history, GPUIX_BACKGROUND: '1' }
mkdirSync('screenshots', { recursive: true })
const suffix = process.env.HIROSHI_TEST_PACKAGED ? 'packaged' : 'source'
let window: Awaited<ReturnType<typeof openWindow>> | undefined
let stage = 'window startup', credentialVisible = false
try {
  window = await openWindow(env, workspace)
  const app = window.app
  const scroll = async (y: number) => { const node = await app.getByTestId('settings-content').element(); await app.call('scrollTo', { elementId: node.id, x: 0, y }) }
  const show = async (id: string) => {
    stage = id
    await app.getByTestId(id).waitFor()
    const viewport = await app.getByTestId('settings-content').element(), frame = await app.getByTestId('settings-content').bounds(), target = await app.getByTestId(id).bounds()
    const offset = (await app.call('getScrollOffset', { elementId: viewport.id })).offset ?? [0, 0]
    await scroll(offset[1] + frame.y + frame.height / 2 - target.y - target.height / 2)
    await waitUntil(async () => { const bounds = await app.getByTestId(id).bounds(); return bounds.y >= frame.y && bounds.y + bounds.height <= frame.y + frame.height }, `${id} inside the settings viewport`, 3000)
  }
  const click = async (id: string) => { await show(id); await app.getByTestId(id).click() }
  const record = await waitUntil(async () => readRegistry(localPaths(home).registry), 'settings daemon discovery')
  const client = engineClient(record)
  const health = await client.health()
  await waitUntil(async () => (await app.getByTestId('engine-workspace').textContent()) === workspace &&
    !(await app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'the initial project')
  const original = (await client.listSessions()).sessions.find((item) => item.cwd === workspace)!

  await app.getByTestId('greeting-project').click()
  await app.getByTestId('greeting-project-search').waitFor()
  await app.screenshot({ path: path.resolve(`screenshots/settings-project-menu-${suffix}.png`) })
  await app.getByTestId('greeting-project-none').click()
  const scratch = await waitUntil(async () => (await client.listSessions()).sessions.find((item) => item.projectless), 'an owned scratch task')
  await waitUntil(async () => (await app.getByTestId('engine-workspace').textContent()) === scratch.cwd, 'the scratch workspace in the footer')
  check(scratch.cwd.startsWith(path.join(home, 'workspaces', 'scratch')), 'Scratch task is outside the managed root')
  check(!(await client.projects()).projects.some((item) => item.cwd === scratch.cwd), 'Scratch directory leaked into project history')
  await app.getByTestId('open-project').click()
  const projectID = (await client.projects()).projects.find((item) => item.cwd === workspace)!.id
  await app.getByTestId(`open-project-choose-${projectID}`).waitFor()
  await app.getByTestId(`open-project-choose-${projectID}`).click()
  await waitUntil(async () => (await app.getByTestId('engine-workspace').textContent()) === workspace, 'the original project')

  await app.getByTestId('settings').click()
  await app.getByTestId('settings-section-usage').waitFor(); await app.getByTestId('settings-section-usage').click()
  await waitUntil(async () => (await app.getByTestId('usage-coverage').textContent()).includes('Updated'), 'history coverage')
  check((await app.getByTestId('usage-total-cost').textContent()) === '—', 'Unknown costs were fabricated')
  await click('usage-row-Codex::test-model')
  await app.getByTestId('usage-pricing').waitFor()
  for (const [key, value] of [['input', '1'], ['cachedInput', '.1'], ['cacheWrite', '0'], ['output', '2']]) {
    await show(`usage-rate-${key}`)
    await app.getByTestId(`usage-rate-${key}`).fill(value!)
  }
  await app.screenshot({ path: path.resolve(`screenshots/settings-rates-${suffix}.png`) })
  await click('usage-rates-save')
  await waitUntil(async () => (await client.usageReport({ id: original.id, from: Date.now() - 86400000, to: Date.now() + 1000, includeHistory: true })).totals.costUSD === .23, 'the persisted explicit rate estimate')
  await scroll(0)
  await waitUntil(async () => (await app.getByTestId('usage-total-cost').textContent()) === '$0.23', 'the rendered usage total')
  await click('usage-period-months'); await click('usage-period-projects'); await click('usage-period-days')
  await click('usage-metric-cost')
  await show('usage-chart'); await app.getByTestId('usage-chart').hover(); await app.getByTestId('usage-chart-tooltip').waitFor()
  await app.screenshot({ path: path.resolve(`screenshots/settings-usage-${suffix}.png`) })
  await click('usage-range'); await app.getByTestId('usage-range-7').waitFor(); await app.getByTestId('usage-range-7').click()
  await waitUntil(async () => (await app.getByTestId('usage-refresh').textContent()) === 'Refresh' &&
    (await app.getByTestId('usage-range').textContent()) === 'Last 7 days', 'the date window refresh')

  await app.getByTestId('settings-section-daemon').click()
  await waitUntil(async () => (await app.getByTestId('network-status').textContent()).includes('Local only'), 'local-only listener state')
  const reservation = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('fixture') })
  const port = reservation.port!; reservation.stop(true)
  await show('network-port'); await app.getByTestId('network-port').fill(String(port)); await show('network-origins'); await app.getByTestId('network-origins').fill('http://localhost:3001')
  await click('network-toggle')
  await waitUntil(async () => (await app.getByTestId('network-status').textContent()).includes('Exposed'), 'the exposed listener')
  const settings = await client.networkSettings()
  check(settings.active && settings.port === port && settings.origins[0] === 'http://localhost:3001', 'Listener fields did not persist')
  const previous = (await client.networkToken()).token
  const endpoint = `http://127.0.0.1:${port}/v1/health`
  check((await daemonFetch(endpoint, { headers: { authorization: `Bearer ${previous}` } })).status === 200, 'Network credential could not access engine')
  credentialVisible = true
  await click('network-show-token')
  await waitUntil(async () => (await app.getByTestId('network-show-token').textContent()) === 'Hide', 'deliberate token reveal')
  await waitUntil(async () => (await app.getByTestId('network-apply').textContent()) === 'Apply', 'reveal controls to settle')
  // Never capture a revealed credential in screenshots or error output.
  await click('network-rotate')
  await waitUntil(async () => (await client.networkSettings()).revision > settings.revision, 'network token rotation')
  await waitUntil(async () => (await app.getByTestId('network-show-token').textContent()) === 'Show', 'the regenerated token to be masked')
  credentialVisible = false
  await waitUntil(async () => (await app.getByTestId('network-apply').textContent()) === 'Apply', 'rotation controls to settle')
  check((await daemonFetch(endpoint, { headers: { authorization: `Bearer ${previous}` } })).status === 401, 'Rotated credential still works')
  await app.screenshot({ path: path.resolve(`screenshots/settings-daemon-${suffix}.png`) })
  await click('network-toggle')
  try { await waitUntil(async () => !(await client.networkSettings()).active, 'network exposure to be disabled', 5000) }
  catch (error) {
    console.error('Listener state after disable:', await client.networkSettings())
    console.error('Listener UI:', await app.getByTestId('network-status').textContent(), await app.getByTestId('network-error').all())
    await app.screenshot({ path: path.resolve(`screenshots/settings-disable-failure-${suffix}.png`) })
    throw error
  }
  check((await client.health()).pid === health.pid, 'Changing network settings restarted the engine')
  console.log('Settings window passed: project/scratch isolation, history-backed analytics, explicit rates, filters, listener lifecycle and token rotation.')
} catch (error) {
  console.error(`Settings flow failed at ${stage}`)
  if (window) {
    console.error(window.output())
    if (!credentialVisible) {
      await window.app.screenshot({ path: path.resolve(`screenshots/settings-failure-${suffix}.png`) })
      writeFileSync(`screenshots/settings-failure-${suffix}.json`, JSON.stringify({ stage, tree: await window.app.call('getTree', {}) }, null, 2))
    }
  }
  throw error
} finally {
  if (window) await window.close()
  await stopTheDaemon(home)
}
