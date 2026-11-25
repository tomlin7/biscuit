/** Opt-in hosted test: one real desktop, one daemon, one temporary tunnel. */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { create, OpenTunnelStorage } from '@opentunnel/client'
import { PNG } from 'pngjs'
import jsQR from 'jsqr'
import { openWindow, waitUntil, stopTheDaemon } from './integration'
import { engineClient } from './src/engine/client'
import { localPaths, readRegistry } from './src/engine/discovery'
import type { PairingConnection } from './engine/src/protocol'

if (!process.argv.includes('--live')) throw new Error('Pass --live to test the desktop against the hosted tunnel service.')
const root = mkdtempSync(path.join(tmpdir(), 'hiroshi-internet-window-')), home = path.join(root, 'engine'), cwd = path.join(root, 'project')
mkdirSync(home); mkdirSync(cwd); mkdirSync('screenshots', { recursive: true })
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const suffix = process.env.HIROSHI_TEST_PACKAGED ? 'packaged' : 'source'
let window: Awaited<ReturnType<typeof openWindow>> | undefined, stage = 'startup'
try {
  window = await openWindow({ HIROSHI_HOME: home, GPUIX_BACKGROUND: '1' }, cwd)
  const app = window.app, record = await waitUntil(async () => readRegistry(localPaths(home).registry), 'internet daemon discovery'), client = engineClient(record)
  await waitUntil(async () => !(await app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'engine readiness')
  await app.getByTestId('settings').click(); await app.getByTestId('settings-section-daemon').waitFor(); await app.getByTestId('settings-section-daemon').click()
  const show = async (id: string) => {
    stage = id; await app.getByTestId(id).waitFor()
    const viewport = await app.getByTestId('settings-content').element(), frame = await app.getByTestId('settings-content').bounds(), target = await app.getByTestId(id).bounds()
    const offset = (await app.call('getScrollOffset', { elementId: viewport.id })).offset ?? [0, 0]
    await app.call('scrollTo', { elementId: viewport.id, x: 0, y: offset[1] + frame.y + frame.height / 2 - target.y - target.height / 2 })
    await app.clock.pause(); await app.clock.fastForward(320); await app.clock.resume()
    await waitUntil(async () => { const b = await app.getByTestId(id).bounds(); return b.y >= frame.y && b.y + b.height <= frame.y + frame.height }, `${id} inside the viewport`, 3000)
  }
  const click = async (id: string) => { await show(id); await app.getByTestId(id).click() }
  await waitUntil(async () => (await app.getByTestId('internet-status').textContent()).includes('Off'), 'internet status')
  check(!(await client.networkSettings()).enabled, 'LAN exposure should default off')
  await click('internet-toggle')
  console.log(`Internet ${suffix} window: waiting for hosted HTTPS setup`)
  await waitUntil(async () => {
    const status = await client.internetSettings()
    if (status.state === 'failed') throw new Error(status.error ?? 'Internet access failed')
    return status.state === 'connected'
  }, 'hosted tunnel connection', 300000)
  await waitUntil(async () => (await app.getByTestId('internet-status').textContent()).includes('Connected'), 'connected status in the desktop', 10000)
  const origin = (await client.internetSettings()).url!
  await show('internet-url'); await app.screenshot({ path: path.resolve(`screenshots/windowed-internet-status-${suffix}.png`) })
  await click('pairing-create'); await app.getByTestId('pairing-qr').waitFor()
  const link = await app.getByTestId('pairing-link-0').textContent()
  check(link.startsWith(origin + '/pair/'), 'The desktop invitation did not use the internet address')
  await show('pairing-qr'); await app.screenshot({ path: path.resolve(`screenshots/windowed-internet-qr-${suffix}.png`) })
  const image = PNG.sync.read(readFileSync(`screenshots/windowed-internet-qr-${suffix}.png`)), decoded = jsQR(new Uint8ClampedArray(image.data), image.width, image.height)
  check(decoded, 'The actual desktop internet QR cannot be scanned')
  const payload = JSON.parse(decoded!.data)
  check(payload.urls.length === 1 && payload.urls[0] === origin && new URL(link).pathname === `/pair/${payload.code}`, 'QR payload and internet link disagree')
  const exchange = await fetch(origin + '/v1/pairing/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: payload.code, name: 'Internet window phone' }), signal: AbortSignal.timeout(15000), redirect: 'error' })
  check(exchange.status === 200, 'The internet invitation could not be redeemed')
  const device = await exchange.json() as PairingConnection, remote = engineClient({ url: origin, token: device.token })
  const session = await remote.createSession({}); await remote.prompt({ id: session.session.id, text: 'Internet window session', model: 'local/echo' })
  await waitUntil(async () => (await client.session({ id: session.session.id })).steps[0]?.status === 'succeeded', 'public session completion')
  await waitUntil(async () => (await app.getByTestId('pairing-device-count').textContent()) === 'Paired devices · 1', 'paired phone in the desktop', 10000)
  await click(`pairing-revoke-${device.device.id}`)
  await waitUntil(async () => !(await client.pairingState()).devices.length, 'desktop revocation')
  const revoked = await fetch(origin + '/v1/health', { headers: { authorization: `Bearer ${device.token}` }, signal: AbortSignal.timeout(15000), redirect: 'error' })
  check(revoked.status === 401, 'A revoked device could still use the public endpoint')
  stage = 'remote CLI pairing'
  const binary = process.env.HIROSHI_TEST_PACKAGED ? [path.join(path.dirname(process.env.HIROSHI_TEST_PACKAGED), 'hiroshi-engine.exe')] : [process.execPath, path.resolve('engine/src/index.ts')]
  const cli = Bun.spawn([...binary, 'pair', '--remote', '--json', '--data-dir', home], { stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const [output, errors, code] = await Promise.all([new Response(cli.stdout).text(), new Response(cli.stderr).text(), cli.exited])
  check(code === 0, `Remote CLI pairing failed: ${errors}`)
  check(JSON.parse(JSON.parse(output).payload).urls[0] === origin, 'Remote CLI pairing changed the public endpoint')
  await click('internet-toggle')
  await waitUntil(async () => !(await client.internetSettings()).enabled, 'desktop internet disable')
  await waitUntil(async () => (await app.getByTestId('internet-status').textContent()).includes('Off'), 'disabled status')
  check(!(await client.networkSettings()).enabled, 'Internet controls changed LAN exposure')
  check((await client.health()).pid === record.pid, 'Internet controls restarted the daemon')
  console.log(`Internet ${suffix} window passed: explicit enable, HTTPS status, scanned QR, public pairing/session, revocation, remote CLI and disable with LAN off.`)
} catch (error) {
  console.error(`Internet window failed at ${stage}`)
  if (window) { try {
    const record = readRegistry(localPaths(home).registry)
    if (record) { const client = engineClient(record); console.error('Connection state:', await client.internetSettings()); console.error('Invitation status:', (await client.pairingState()).grants) }
    writeFileSync(`screenshots/internet-failure-${suffix}.json`, JSON.stringify(await window.app.call('getTree', {}), null, 2))
    await window.app.screenshot({ path: path.resolve(`screenshots/internet-failure-${suffix}.png`) })
  } catch {} }
  throw error
} finally {
  if (window) await window.close()
  await stopTheDaemon(home)
  const cleanup = create({ store: OpenTunnelStorage.xdg({ env: { XDG_DATA_HOME: path.join(home, 'remote') }, home }) })
  try { if (await cleanup.tunnel.get()) { await cleanup.tunnel.remove(); console.log('The temporary hosted window-test tunnel was deleted.') } } finally { await cleanup.dispose() }
}
