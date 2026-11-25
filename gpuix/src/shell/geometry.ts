import { installWindowDrag, resolveWindowHandle } from '../window-drag'
import { packagedBuild } from './runtime'
import { clampBounds, readWindowState, saveWindowState, type WindowState } from './state'

let native: any
function windows() {
  if (native) return native
  const { dlopen, FFIType: t } = require('bun:ffi')
  native = dlopen('user32.dll', {
    GetWindowPlacement: { args: [t.ptr, t.ptr], returns: t.bool },
    MonitorFromRect: { args: [t.ptr, t.u32], returns: t.ptr },
    GetMonitorInfoW: { args: [t.ptr, t.ptr], returns: t.bool },
    SetWindowPos: { args: [t.ptr, t.ptr, t.i32, t.i32, t.i32, t.i32, t.u32], returns: t.bool },
    ShowWindow: { args: [t.ptr, t.i32], returns: t.bool },
    IsWindowVisible: { args: [t.ptr], returns: t.bool },
  }).symbols
  return native
}
function monitor(rect: Int32Array) {
  const api = windows(), info = Buffer.alloc(104)
  info.writeUInt32LE(104)
  if (!api.GetMonitorInfoW(api.MonitorFromRect(rect, 2), info)) return null
  return { x: info.readInt32LE(20), y: info.readInt32LE(24), width: info.readInt32LE(28) - info.readInt32LE(20), height: info.readInt32LE(32) - info.readInt32LE(24), id: info.subarray(40).toString('utf16le').replace(/\0.*$/, '') }
}
function mac() {
  if (native) return native
  const { dlopen, FFIType: t } = require('bun:ffi')
  const path = require('node:path') as typeof import('node:path')
  const file = packagedBuild ? path.join(path.dirname(process.execPath), 'libhiroshi-window.dylib') : path.resolve(import.meta.dir, '../../dist/libhiroshi-window.dylib')
  native = dlopen(file, { hiroshi_window_read: { args: [t.ptr], returns: t.bool }, hiroshi_window_restore: { args: [t.ptr], returns: t.bool }, hiroshi_links_install: { args: [], returns: t.void }, hiroshi_link_next: { args: [t.ptr, t.u32], returns: t.bool } }).symbols
  return native
}
export function installNativeLinks(): void {
  if (process.platform === 'darwin') { try { mac().hiroshi_links_install() } catch {} }
}
export function nextNativeLink(): string | null {
  if (process.platform !== 'darwin') return null
  try { const buffer = Buffer.alloc(8192); return mac().hiroshi_link_next(buffer, buffer.length) ? buffer.toString('utf8').replace(/\0.*$/s, '') : null } catch { return null }
}
export function readGeometry(): Partial<WindowState> | null {
  try {
    if (process.platform === 'win32') {
      const hwnd = resolveWindowHandle(), placement = Buffer.alloc(44)
      placement.writeUInt32LE(44)
      if (!hwnd || !windows().GetWindowPlacement(hwnd, placement) || placement.readUInt32LE(8) === 2) return null
      const x = placement.readInt32LE(28), y = placement.readInt32LE(32), width = placement.readInt32LE(36) - x, height = placement.readInt32LE(40) - y
      const display = monitor(new Int32Array([x, y, x + width, y + height]))
      return { x, y, width, height, display: display?.id, maximized: placement.readUInt32LE(8) === 3 }
    }
    if (process.platform === 'darwin') {
      const values = new Float64Array(6)
      if (!mac().hiroshi_window_read(values)) return null
      return { x: values[0], y: values[1], width: values[2], height: values[3], display: String(values[4]), maximized: !!values[5] }
    }
  } catch { /* Unsupported native backend: size persistence remains available. */ }
  return null
}
export function restoreGeometry(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return false
  try {
    if (process.platform === 'win32') {
      const hwnd = resolveWindowHandle()
      const area = monitor(new Int32Array([state.x, state.y, state.x + state.width, state.y + state.height]))
      if (!hwnd || !area) return false
      const next = clampBounds({ x: state.x, y: state.y, width: state.width, height: state.height }, area)
      if (!windows().SetWindowPos(hwnd, null, next.x, next.y, next.width, next.height, 0x214)) return false
      if (state.maximized) windows().ShowWindow(hwnd, 3)
      return true
    }
    if (process.platform === 'darwin') return mac().hiroshi_window_restore(new Float64Array([state.x, state.y, state.width, state.height, Number(state.display) || 0, state.maximized ? 1 : 0]))
  } catch {}
  return false
}
export function trackWindow(renderer: { getWindowSize: () => { width: number; height: number } }, workspace: string): () => void {
  installWindowDrag()
  let restored = false, last = ''
  let visibilityChecked = false, visibilityAttempts = 0
  const saved = readWindowState(workspace)
  const tick = () => {
    try {
      if (!restored) { restoreGeometry(saved); restored = true }
      // Bun's script runner and the packaged supervisor suppress console
      // windows with STARTUPINFO/SW_HIDE. Windows also applies that flag to
      // GPUI's first ShowWindow call, leaving an otherwise healthy GUI hidden.
      // Show our own HWND once; never undo a later user minimize/hide action.
      if (process.platform === 'win32' && !visibilityChecked && visibilityAttempts++ < 8) {
        const hwnd = resolveWindowHandle()
        if (hwnd) {
          if (!windows().IsWindowVisible(hwnd)) windows().ShowWindow(hwnd, saved.maximized ? 3 : process.env.GPUIX_BACKGROUND === '1' ? 4 : 5)
          visibilityChecked = true
        }
      }
      let geometry: Partial<WindowState> = readGeometry() ?? renderer.getWindowSize()
      if (process.platform === 'darwin' && geometry.maximized) {
        const normal = readWindowState(workspace)
        geometry = { ...geometry, x: normal.x, y: normal.y, width: normal.width, height: normal.height }
      }
      const value = JSON.stringify(geometry)
      if (value !== last) { saveWindowState(workspace, geometry); last = value }
    } catch { /* A closing window or read-only profile must not crash the app. */ }
  }
  tick()
  const timer = setInterval(tick, 750)
  timer.unref()
  return () => { tick(); clearInterval(timer) }
}
