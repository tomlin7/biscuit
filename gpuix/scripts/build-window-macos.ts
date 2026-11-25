import { mkdirSync } from 'node:fs'
import path from 'node:path'

export function buildMacWindow(): void {
  if (process.platform !== 'darwin') return
  const root = path.resolve(import.meta.dir, '..'), out = path.join(root, 'dist')
  mkdirSync(out, { recursive: true })
  const result = Bun.spawnSync(['clang', '-dynamiclib', '-fobjc-arc', '-framework', 'Cocoa', path.join(root, 'scripts/window-macos.m'), '-o', path.join(out, 'libhiroshi-window.dylib')])
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
}
if (import.meta.main) buildMacWindow()
