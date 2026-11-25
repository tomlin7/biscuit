import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { launch } from '@gpuix/react/automation'
import { stopEngine } from './src/engine/supervisor'

const outDir = path.resolve('screenshots')
mkdirSync(outDir, { recursive: true })
const home = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-screenshot-'))
const workspace = path.join(home, 'workspace')
mkdirSync(workspace)

try {
  const app = await launch({
    command: process.execPath,
    args: [path.resolve('app.tsx')],
    cwd: workspace,
    env: { GPUIX_BACKGROUND: '1', HIROSHI_HOME: home },
  })
  const capture = async (name: string) => {
    await Bun.sleep(400)
    await app.screenshot({ path: path.join(outDir, `${name}.png`) })
    console.log(`[screenshot] wrote ${name}.png`)
  }
  try {
    await app.getByTestId('composer').waitFor({ timeoutMs: 60_000 })
    await capture('new-task-empty')
    await app.getByTestId('environment-menu-toggle').click()
    await app.getByTestId('env-commit-push').waitFor({ timeoutMs: 10_000 })
    await capture('environment-menu')
    await app.getByTestId('env-commit-push').click()
    await app.getByTestId('commit-modal-close').waitFor({ timeoutMs: 10_000 })
    await capture('commit-push-modal')
    await app.getByTestId('commit-modal-close').click()
    await Bun.sleep(300)
    await app.getByTestId('environment-menu-toggle').click()
    await app.getByTestId('env-compare-branch').waitFor({ timeoutMs: 10_000 })
    await app.getByTestId('env-compare-branch').click()
    await capture('review-sidebar')
    await app.getByTestId('surface-panel-toggle').click()
    await Bun.sleep(300)
    if (process.platform !== 'darwin') {
      const bounds = await app.getByTestId('window-close').bounds()
      await app.mouse.move({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
      await capture('window-controls-hover')
    }
  } finally {
    await app.close()
  }
} finally {
  await stopEngine({ home })
  for (let i = 0; i < 20; i++) {
    try { rmSync(home, { recursive: true, force: true }); break }
    catch { await Bun.sleep(100) }
  }
}
