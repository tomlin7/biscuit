import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { connectStdio } from '@gpuix/react/automation'
import { discover } from '../src/engine/discovery'
import { engineClient } from '../src/engine/client'
import { stopEngine } from '../src/engine/supervisor'

const home = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-launcher-'))
const dev = process.argv.includes('--dev')
const binary = path.resolve('dist', process.platform === 'win32' ? 'hiroshi.exe' : 'hiroshi')
// Exercise normal foreground startup. Background/automation startup follows a
// different native show path and can mask STARTUPINFO/SW_HIDE regressions.
const child = spawn(dev ? process.execPath : binary, dev ? ['run', 'dev'] : [], { cwd: dev ? process.cwd() : home, env: { ...process.env, HIROSHI_HOME: home, GPUIX_BACKGROUND: '0' }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
let listener: ((value: string) => void) | undefined, output = ''
child.stdout!.on('data', (data) => listener?.(data.toString()))
child.stderr!.on('data', (data) => { output = (output + data.toString()).slice(-4096) })
const exited = new Promise<number | null>((resolve) => child.once('exit', resolve))
const deadline = <T>(promise: Promise<T>) => Promise.race([promise, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Launcher smoke timed out: ' + output)), 25000); timer.unref() })])
try {
  const app = await deadline(connectStdio({ write: (data) => { child.stdin!.write(data) }, feed: (receive) => { listener = receive }, close: async () => { child.kill() } }))
  if (process.platform === 'win32') {
    const { dlopen, FFIType: t } = require('bun:ffi')
    const api = dlopen('user32.dll', {
      FindWindowExW: { args: [t.ptr, t.ptr, t.ptr, t.ptr], returns: t.ptr },
      GetWindowThreadProcessId: { args: [t.ptr, t.ptr], returns: t.u32 },
      IsWindowVisible: { args: [t.ptr], returns: t.bool },
      IsIconic: { args: [t.ptr], returns: t.bool },
      ShowWindow: { args: [t.ptr, t.i32], returns: t.bool },
    }).symbols
    const { pid } = await app.call('initialize', { protocolVersion: 1, client: 'hiroshi-launch-visibility' })
    const title = Buffer.from('Hiroshi · Multi-Agent Orchestrator\0', 'utf16le')
    let hwnd: any = null
    for (let attempt = 0; attempt < 30; attempt++) {
      let candidate: any = null
      while ((candidate = api.FindWindowExW(null, candidate, null, title))) {
        const owner = new Uint32Array(1)
        api.GetWindowThreadProcessId(candidate, owner)
        if (owner[0] === pid) { hwnd = candidate; break }
      }
      if (hwnd && api.IsWindowVisible(hwnd)) break
      await Bun.sleep(100)
    }
    if (!hwnd || !api.IsWindowVisible(hwnd)) throw new Error('The mounted app window is hidden')
    api.ShowWindow(hwnd, 6)
    await Bun.sleep(1100)
    if (!api.IsIconic(hwnd)) throw new Error('Startup visibility handling undid a user minimize')
    api.ShowWindow(hwnd, 9)
  }
  await app.getByTestId('composer').waitFor({ timeoutMs: 20000 })
  let attached = await discover(path.join(home, 'engine.json'))
  for (let i = 0; i < 100 && attached.state !== 'running'; i++) { await Bun.sleep(100); attached = await discover(path.join(home, 'engine.json')) }
  if (attached.state !== 'running') throw new Error('The supervised window did not attach its sidecar')
  await app.getByTestId('window-close').click().catch(() => {})
  if (await deadline(exited) !== 0) throw new Error('Intentional window close did not end supervision cleanly')
  await engineClient(attached.record).health()
  if (output.includes('Hiroshi: recovering')) throw new Error('A normal launch restarted its window: ' + output)
  console.log(`${dev ? 'Development script' : 'Packaged launcher'} opened a visible window, preserved minimize, closed without restarting, and left its sidecar alive`)
} finally {
  child.kill()
  await stopEngine({ home })
  for (let i = 0; i < 20; i++) { try { rmSync(home, { recursive: true, force: true }); break } catch { await Bun.sleep(100) } }
}
