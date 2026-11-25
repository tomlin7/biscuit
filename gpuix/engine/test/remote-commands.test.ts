import { expect, test } from 'bun:test'
import { internetCommand, remoteInvitation } from '../src/remote-commands'
import { ENTRY, startDaemon } from './harness'
import type { EngineClient } from '../../src/engine/client'
import type { InternetSettings } from '../src/protocol'

test('remote pairing explicitly enables once, waits for HTTPS and requests only a remote invitation', async () => {
  let state: InternetSettings = { revision: 0, enabled: false, state: 'disabled', url: null, error: null }, updates = 0, reads = 0, invited = 0
  const client = { internetSettings: async () => { if (++reads > 1) state = { ...state, state: 'connected', url: 'https://remote.invalid' }; return state },
    updateInternet: async () => { updates++; return state = { ...state, revision: 1, enabled: true, state: 'starting' } },
    createPairing: async (input: unknown) => { expect(input).toEqual({ remote: true }); invited++; return { links: ['https://remote.invalid/pair/test'] } },
  } as unknown as EngineClient
  expect((await remoteInvitation(client)).links).toEqual(['https://remote.invalid/pair/test'])
  expect(updates).toBe(1); expect(invited).toBe(1)
  await internetCommand(client, 'enable'); expect(updates).toBe(1)
  await internetCommand(client, 'retry'); expect(updates).toBe(2)
})
test('remote pairing fails on timeout, fatal error or external disable without producing an invitation', async () => {
  let state: InternetSettings = { revision: 0, enabled: true, state: 'starting', url: null, error: null }, created = 0
  const client = { internetSettings: async () => state, createPairing: async () => { created++; return {} } } as unknown as EngineClient
  await expect(remoteInvitation(client, { timeoutMs: 10 })).rejects.toThrow('Timed out')
  state = { ...state, state: 'failed', error: 'Certificate failed' }
  await expect(remoteInvitation(client)).rejects.toThrow('internet retry')
  await expect(remoteInvitation(client, { timeoutMs: NaN })).rejects.toThrow('timeout')
  const slow = { ...client, internetSettings: async () => { await Bun.sleep(50); return { ...state, state: 'connected' as const, url: 'https://remote.invalid' } } }
  await expect(remoteInvitation(slow, { timeoutMs: 10 })).rejects.toThrow('Timed out')
  await Bun.sleep(60)
  let reads = 0
  const stopped = { ...client, internetSettings: async () => ({ ...state, state: 'starting' as const, enabled: ++reads === 1 }) }
  await expect(remoteInvitation(stopped, { timeoutMs: 1000 })).rejects.toThrow('disabled while waiting')
  expect(created).toBe(0)
})
test('real CLI manages status/disable and rejects conflicting remote flags before exposing anything', async () => {
  const daemon = await startDaemon()
  const run = async (...args: string[]) => {
    const child = Bun.spawn([process.execPath, ENTRY, ...args, '--data-dir', daemon.home], { stdout: 'pipe', stderr: 'pipe', windowsHide: true })
    const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]); return { out, error, code }
  }
  try {
    const status = await run('internet', 'status', '--json')
    expect(status.code).toBe(0); expect(JSON.parse(status.out)).toMatchObject({ enabled: false, state: 'disabled' })
    expect((await run('internet', 'disable')).code).toBe(0)
    expect((await run('internet', 'unknown')).code).toBe(1)
    expect((await run('pair', '--remote', '--expose')).error).toContain('cannot be combined')
    expect((await run('pair', '--remote', '--url', 'https://bad.invalid')).code).toBe(1)
    expect((await run('pair', '--remote', '--timeout')).code).toBe(1)
    expect((await daemon.client.internetSettings()).enabled).toBe(false)
    expect((await daemon.client.networkSettings()).enabled).toBe(false)
  } finally { await daemon.stop() }
}, 30000)
