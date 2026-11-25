import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ensureEngine, stopEngine } from '../src/engine/supervisor'
import { engineClient } from '../src/engine/client'
import { ENGINE_VERSION } from '../engine/src/protocol'

export async function smokePackaged(directory: string): Promise<void> {
  const suffix = process.platform === 'win32' ? '.exe' : ''
  const binary = path.resolve(directory, `hiroshi${suffix}`), engine = path.resolve(directory, `hiroshi-engine${suffix}`)
  const home = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-packaged-'))
  const previous = process.env.HIROSHI_ENGINE
  process.env.HIROSHI_ENGINE = engine
  try {
    console.log(`[archive smoke] checking cockpit version: ${binary}`)
    const version = Bun.spawn([binary, '--version'], { cwd: home, stdout: 'pipe', stderr: 'pipe', windowsHide: true })
    const timer = setTimeout(() => version.kill('SIGKILL'), 15000)
    try {
      const [code, output, errors] = await Promise.all([version.exited, new Response(version.stdout).text(), new Response(version.stderr).text()])
      if (code !== 0 || output.trim() !== ENGINE_VERSION) throw new Error(`Packaged version failed (exit ${code}): ${errors}`)
    } finally { clearTimeout(timer) }
    console.log('[archive smoke] attaching the extracted sidecar')
    const attached = await ensureEngine({ home, workspace: home })
    if (attached.status !== 'ready') throw new Error(JSON.stringify(attached))
    const client = engineClient(attached), { session } = await client.createSession({ cwd: home })
    console.log('[archive smoke] running a local-provider step')
    await client.prompt({ id: session.id, text: 'packaged sidecar smoke test', model: 'local/echo' })
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      const detail = await client.session({ id: session.id })
      if (detail.steps.at(-1)?.status === 'succeeded') {
        if (!detail.messages.some((m) => m.role === 'assistant' && m.text.includes('packaged sidecar smoke test'))) throw new Error('The packaged engine lost its answer')
        console.log(`Packaged Hiroshi ${ENGINE_VERSION} and sidecar passed in an isolated working directory`)
        process.exitCode = 0
        break
      }
      await Bun.sleep(100)
    }
    if (Date.now() >= deadline) throw new Error('Packaged engine did not complete its step')
  } finally {
    await stopEngine({ home })
    if (previous === undefined) delete process.env.HIROSHI_ENGINE; else process.env.HIROSHI_ENGINE = previous
    for (let attempt = 0; attempt < 20; attempt++) {
      try { rmSync(home, { recursive: true, force: true }); break }
      catch { await Bun.sleep(100) }
    }
  }
}

if (import.meta.main) await smokePackaged(path.resolve('dist'))
