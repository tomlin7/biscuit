import { expect, test } from 'bun:test'
import { ENTRY, startDaemon } from './harness'
import { daemonFetch } from '../src/local-transport'

test('pair CLI requires explicit exposure and produces a redeemable invitation without spawning a desktop', async () => {
  const daemon = await startDaemon()
  const run = async (...flags: string[]) => {
    const child = Bun.spawn([process.execPath, ENTRY, 'pair', '--data-dir', daemon.home, ...flags], { stdout: 'pipe', stderr: 'pipe', windowsHide: true })
    const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    return { out, error, code }
  }
  try {
    expect((await run('--json')).code).toBe(1)
    expect((await daemon.client.networkSettings()).enabled).toBe(false)
    const reservation = Bun.serve({ hostname: '0.0.0.0', port: 0, fetch: () => new Response() }), port = reservation.port!; reservation.stop(true)
    const result = await run('--expose', '--port', String(port), '--json')
    expect(result.code).toBe(0)
    const invitation = JSON.parse(result.out), payload = JSON.parse(invitation.payload)
    expect(payload.type).toBe('hiroshi.pairing'); expect(invitation.qr).toContain('<svg')
    expect(payload.serverID).toBeString()
    const response = await daemonFetch(`http://127.0.0.1:${port}/v1/pairing/redeem`, { method: 'POST', body: JSON.stringify({ code: payload.code, name: 'CLI phone' }) })
    expect(response.status).toBe(200)
    const human = await run()
    expect(human.code).toBe(0); expect(human.out).toContain('Hiroshi device pairing'); expect(human.out).toContain('/pair/')
    expect((await daemon.client.health()).pid).toBe(daemon.health.pid)
  } finally { await daemon.stop() }
}, 30000)
