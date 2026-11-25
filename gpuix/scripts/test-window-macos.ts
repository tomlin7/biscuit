import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { buildMacWindow } from './build-window-macos'
if (process.platform !== 'darwin') throw new Error('This native bridge test requires macOS')
buildMacWindow()
// Exercise the actual shipped dylib and Bun ABI, not only the compiled fixture.
const { dlopen, FFIType: t } = require('bun:ffi')
const library = dlopen(path.resolve('dist/libhiroshi-window.dylib'), {
  hiroshi_drag_install: { args: [], returns: t.void },
  hiroshi_drag_start: { args: [t.f64, t.f64], returns: t.bool },
  hiroshi_drag_active: { args: [], returns: t.bool },
})
if (library.symbols.hiroshi_drag_active() || library.symbols.hiroshi_drag_start(10, 10)) throw new Error('A drag without a native mouse-down must be rejected')
console.log('macOS shipped dylib: Bun FFI symbols and idle/no-event behavior passed')
mkdirSync('dist', { recursive: true })
const binary = path.resolve('dist/test-window-macos')
const build = Bun.spawnSync(['clang', '-fobjc-arc', '-framework', 'Cocoa', path.resolve('scripts/test-window-macos.m'), '-o', binary])
if (build.exitCode !== 0) throw new Error(build.stderr.toString())
const child = Bun.spawn([binary], { stdout: 'inherit', stderr: 'inherit' })
const timer = setTimeout(() => child.kill('SIGKILL'), 15000)
try { if (await child.exited !== 0) throw new Error('Native macOS drag contract failed') }
finally { clearTimeout(timer) }
