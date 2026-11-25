/** One real desktop and daemon; temporary invitations are canceled in cleanup. */
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { openWindow, waitUntil, stopTheDaemon } from './integration'
import { engineClient } from './src/engine/client'
import { localPaths, readRegistry } from './src/engine/discovery'
import { daemonFetch } from './engine/src/local-transport'
import type { PairingConnection } from './engine/src/protocol'
import { PNG } from 'pngjs'
import jsQR from 'jsqr'

const root = mkdtempSync(path.join(tmpdir(), 'hiroshi-pairing-window-')), home = path.join(root, 'engine'), cwd = path.join(root, 'project')
mkdirSync(home); mkdirSync(cwd); mkdirSync('screenshots', { recursive: true })
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const suffix = process.env.HIROSHI_TEST_PACKAGED ? 'packaged' : 'source'
let stage = 'startup'
try {
  const window = await openWindow({ HIROSHI_HOME: home, GPUIX_BACKGROUND: '1' }, cwd)
  const app = window.app
  try {
    const record = await waitUntil(async () => readRegistry(localPaths(home).registry), 'pairing daemon discovery'), client = engineClient(record)
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
    await waitUntil(async () => (await app.getByTestId('internet-status').textContent()).includes('Off'), 'default internet status')
    await click('pairing-route-internet')
    await waitUntil(async () => (await app.getByTestId('pairing-unavailable').textContent()).includes('Enable internet access'), 'unavailable internet pairing hint')
    await click('pairing-create')
    check(!(await client.internetSettings()).enabled && !(await client.pairingState()).grants.length, 'Pairing implicitly enabled internet access')
    await click('pairing-route-lan')
    const reservation = Bun.serve({ hostname: '0.0.0.0', port: 0, fetch: () => new Response() }), port = reservation.port!; reservation.stop(true)
    await show('network-port'); await app.getByTestId('network-port').fill(String(port)); await click('network-toggle')
    await waitUntil(async () => (await client.networkSettings()).active, 'network listener')
    await click('pairing-create'); await app.getByTestId('pairing-qr').waitFor()
    const link = await app.getByTestId('pairing-link-0').textContent()
    check(link.includes('/pair/'), 'The invitation link is missing')
    await show('pairing-qr'); await app.screenshot({ path: path.resolve(`screenshots/windowed-pairing-qr-${suffix}.png`) })
    const image = PNG.sync.read(readFileSync(`screenshots/windowed-pairing-qr-${suffix}.png`))
    const decoded = jsQR(new Uint8ClampedArray(image.data), image.width, image.height)
    check(decoded, 'The QR code painted by the native window cannot be scanned')
    const payload = JSON.parse(decoded!.data)
    check(payload.type === 'hiroshi.pairing' && new URL(link).pathname === `/pair/${payload.code}`, 'The displayed QR code does not match its link')
    // Use loopback only in the test so the machine's firewall is irrelevant.
    const response = await daemonFetch(`http://127.0.0.1:${port}${new URL(link).pathname}`, { method: 'POST', body: new URLSearchParams({ name: 'Window test phone' }) })
    check(response.status === 200, 'The desktop invitation could not be redeemed')
    const connection = await response.json() as PairingConnection
    await waitUntil(async () => (await app.getByTestId('pairing-device-count').textContent()) === 'Paired devices · 1', 'automatic pairing status', 10000)
    const remote = engineClient({ url: `http://127.0.0.1:${port}`, token: connection.token })
    check((await remote.health()).pid === (await client.health()).pid, 'The paired device reached a different engine')
    const session = await remote.createSession({}); await remote.prompt({ id: session.session.id, text: 'Hello from a paired device', model: 'local/echo' })
    await waitUntil(async () => (await client.session({ id: session.session.id })).steps[0]?.status === 'succeeded', 'paired session completion')
    await show(`pairing-revoke-${connection.device.id}`); await app.screenshot({ path: path.resolve(`screenshots/windowed-pairing-device-${suffix}.png`) })
    await click(`pairing-revoke-${connection.device.id}`)
    await waitUntil(async () => !(await client.pairingState()).devices.length, 'device revocation')
    check((await daemonFetch(`http://127.0.0.1:${port}/v1/health`, { headers: { authorization: `Bearer ${connection.token}` } })).status === 401, 'The revoked credential remained usable')
    await click('pairing-create'); await app.getByTestId('pairing-qr').waitFor()
    const canceledLink = await app.getByTestId('pairing-link-0').textContent()
    await click('pairing-cancel')
    await waitUntil(async () => (await app.getByTestId('pairing-notice').textContent()) === 'Invitation canceled.', 'invitation cancellation')
    check((await daemonFetch(`http://127.0.0.1:${port}${new URL(canceledLink).pathname}`, { method: 'POST', body: new URLSearchParams({ name: 'Canceled' }) })).status === 400, 'A canceled invitation was accepted')
    console.log('Pairing window passed: QR/link, real exchange, automatic device status, remote session, revocation and cancellation.')
  } catch (error) {
    console.error(`Pairing window failed at ${stage}`)
    try { writeFileSync(`screenshots/pairing-failure-${suffix}.json`, JSON.stringify(await app.call('getTree', {}), null, 2)); await app.screenshot({ path: path.resolve(`screenshots/pairing-failure-${suffix}.png`) }) } catch {}
    throw error
  } finally { await window.close() }
} finally { await stopTheDaemon(home) }
