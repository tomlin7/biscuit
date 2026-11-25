/** Explicit hosted-service probe. Never runs as part of ordinary CI. */
import { join } from 'node:path'
import { create, OpenTunnelStorage } from '@opentunnel/client'
import { startDaemon, until } from '../engine/test/harness'
import { probeHome } from './probe-home'
import type { PairingConnection } from '../engine/src/protocol'
import { engineClient } from '../src/engine/client'

if (!process.argv.includes('--live')) throw new Error('Pass --live to create a temporary public tunnel for verification.')
const homeAt = process.argv.indexOf('--home')
if (homeAt >= 0 && (!process.argv[homeAt + 1] || process.argv[homeAt + 1]!.startsWith('--'))) throw new Error('Provide an isolated probe directory after --home.')
const home = await probeHome(homeAt >= 0 ? process.argv[homeAt + 1] : undefined)
const engineAt = process.argv.indexOf('--engine')
const daemon = await startDaemon({ home, executable: engineAt >= 0 ? process.argv[engineAt + 1] : undefined })
console.log(`Live tunnel probe uses isolated data: ${home}`)
let phase = 'starting'
const request = (url: string, init?: RequestInit) => fetch(url, { ...init, signal: AbortSignal.timeout(15000), redirect: 'error' })
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
try {
  await daemon.client.updateInternet({ revision: (await daemon.client.internetSettings()).revision, enabled: true })
  await until(async () => {
    const status = await daemon.client.internetSettings()
    if (status.state !== phase) { phase = status.state; console.log(`Tunnel: ${phase}`) }
    if (status.state === 'failed') throw new Error(status.error ?? 'Tunnel failed')
    return status.state === 'connected'
  }, 300000, 2000)
  const origin = (await daemon.client.internetSettings()).url!
  check(!(await daemon.client.networkSettings()).enabled, 'The tunnel unexpectedly enabled LAN exposure')
  check((await request(origin + '/v1/health')).status === 401, 'The public endpoint accepted an unauthenticated request')
  const invitation = await daemon.client.createPairing({ remote: true }), code = JSON.parse(invitation.payload).code
  check(invitation.links.every((link) => link.startsWith(origin + '/pair/')), 'The remote QR advertised a different endpoint')
  const exchange = await request(origin + '/v1/pairing/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, name: 'Hosted probe' }) })
  check(exchange.status === 200, `Public pairing returned ${exchange.status}`)
  const device = await exchange.json() as PairingConnection, headers = { authorization: `Bearer ${device.token}` }
  check((await request(origin + '/v1/internet', { headers })).status === 403, 'The public endpoint exposed owner controls')
  const remote = engineClient({ url: origin, token: device.token })
  check((await remote.health()).pid === daemon.health.pid, 'The public endpoint reached a different daemon')
  const session = await remote.createSession({}); await remote.prompt({ id: session.session.id, text: 'Hello through the hosted tunnel', model: 'local/echo' })
  await until(async () => (await daemon.client.session({ id: session.session.id })).steps[0]?.status === 'succeeded')
  await daemon.client.revokePairedDevice({ deviceID: device.device.id, revision: (await daemon.client.pairingState()).revision })
  check((await request(origin + '/v1/health', { headers })).status === 401, 'The public endpoint accepted a revoked credential')
  console.log('Hosted internet probe passed: HTTPS, authentication, QR/link exchange, session execution, owner-route denial and revocation.')
} finally {
  try { await daemon.client.updateInternet({ revision: (await daemon.client.internetSettings()).revision, enabled: false }) } catch {}
  try { await daemon.client.shutdown() } catch {}
  await daemon.crash()
  const cleanup = create({ store: OpenTunnelStorage.xdg({ env: { XDG_DATA_HOME: join(home, 'remote') }, home }) })
  try {
    if (await cleanup.tunnel.get()) { await cleanup.tunnel.remove(); console.log('The hosted probe tunnel was deleted.') }
    else if (await cleanup.tunnel.pending()) console.log(`Certificate setup is pending. Its resumable identity is preserved in ${home}.`)
  } finally { await cleanup.dispose() }
}
