import { ensureEngine, stopEngine } from '../../../src/engine/supervisor'
import { engineClient } from '../../../src/engine/client'
import { daemonFetch } from '../../src/local-transport'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const home = process.argv[2]!
const proxySettings = JSON.stringify([process.env.HTTP_PROXY, process.env.HTTPS_PROXY, process.env.NO_PROXY, process.env.no_proxy])
try {
  const attached = await ensureEngine({ home, workspace: home, timeoutMs: 8000 })
  if (attached.status !== 'ready') throw new Error(`attach: ${JSON.stringify(attached)}`)
  const again = await ensureEngine({ home, workspace: home })
  if (again.status !== 'ready' || again.spawned || again.health.pid !== attached.health.pid) throw new Error('did not reuse the same daemon')
  const client = engineClient(attached)
  const { session } = await client.createSession({ cwd: home, title: 'proxy regression' })
  if (!(await client.listSessions()).sessions.some((item) => item.id === session.id)) throw new Error('RPC failed')
  const abort = new AbortController()
  let opened = false
  await client.feed({ after: 0, signal: abort.signal, onEvent: () => {}, onWatermark: () => { opened = true; abort.abort() } })
  if (!opened) throw new Error('feed did not open')
  const entry = path.resolve(import.meta.dir, '../../src/index.ts')
  for (const command of ['status', 'serve']) {
    const result = Bun.spawnSync([process.execPath, entry, command, '--data-dir', home], { timeout: 8000, windowsHide: true, env: { ...process.env, NO_PROXY: '', no_proxy: '' } })
    if (result.exitCode !== 0) throw new Error(`CLI ${command} failed: ${result.stderr.toString()}`)
  }
  // External destinations keep the runtime's ordinary proxy behavior.
  if ((await daemonFetch('http://provider.invalid/test')).status !== 502) throw new Error('external proxy behavior changed')
  if (JSON.stringify([process.env.HTTP_PROXY, process.env.HTTPS_PROXY, process.env.NO_PROXY, process.env.no_proxy]) !== proxySettings) throw new Error('proxy environment was mutated')
  if ((readFileSync(path.join(home, 'logs/engine.log'), 'utf8').match(/info listening /g) ?? []).length !== 1) throw new Error('started more than one daemon')
  const result = Bun.spawnSync([process.execPath, entry, 'stop', '--data-dir', home], { timeout: 10000, windowsHide: true, env: { ...process.env, NO_PROXY: '', no_proxy: '' } })
  if (result.exitCode !== 0) throw new Error('CLI shutdown failed')
  console.log('local discovery, RPC, feed, reuse and CLI shutdown bypassed the proxy')
} catch (error) { console.error('local transport failure:', error); throw error } finally {
  if (!await stopEngine({ home })) throw new Error('daemon cleanup failed')
}
