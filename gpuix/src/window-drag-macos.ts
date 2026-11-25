import { packagedBuild } from './shell/runtime'

interface MacDragSymbols {
  hiroshi_drag_install(): void
  hiroshi_drag_start(x: number, y: number): boolean
  hiroshi_drag_active(): boolean
}

/** Keep validation shared between the native adapter and its contract tests. */
export function createMacDrag(load: () => MacDragSymbols | null) {
  return {
    install() { load()?.hiroshi_drag_install() },
    start(event?: { button?: number; x?: number; y?: number }) {
      if (event?.button !== 0 || !Number.isFinite(event.x) || !Number.isFinite(event.y)) return false
      return load()?.hiroshi_drag_start(event.x!, event.y!) ?? false
    },
    active() { return load()?.hiroshi_drag_active() ?? false },
  }
}

let symbols: MacDragSymbols | null = null, unavailable = false
export const macWindowDrag = createMacDrag(() => {
  if (symbols || unavailable) return symbols
  try {
    const { dlopen, FFIType: t } = require('bun:ffi')
    const path = require('node:path') as typeof import('node:path')
    const file = packagedBuild ? path.join(path.dirname(process.execPath), 'libhiroshi-window.dylib') : path.resolve(import.meta.dir, '../dist/libhiroshi-window.dylib')
    symbols = dlopen(file, {
      hiroshi_drag_install: { args: [], returns: t.void },
      hiroshi_drag_start: { args: [t.f64, t.f64], returns: t.bool },
      hiroshi_drag_active: { args: [], returns: t.bool },
    }).symbols
  } catch { unavailable = true }
  return symbols
})
