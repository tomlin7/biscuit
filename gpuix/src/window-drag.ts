/**
 * Window dragging for Hiroshi's custom titlebar.
 *
 * Hiroshi draws its own chrome across the whole window and never shows the
 * native OS titlebar (`titlebarTransparent: true`), so the OS has no caption
 * region to grab. The window is moved here instead: the press records where
 * the window and the cursor are, every move pushes the window by the cursor
 * delta, and the release lets go.
 *
 * The move is done with `SetWindowPos`, so it works with whatever the platform
 * layer does with `WM_SYSCOMMAND`/`WM_NCLBUTTONDOWN`. Those are ignored by the
 * GPUI Windows backend, which is why the drag cannot be handed to the OS
 * modal move loop.
 *
 * The window handle is resolved from the foreground window and verified
 * against this process id, so a drag can never move somebody else's window.
 * macOS delegates a retained native press to AppKit through window-drag-macos.
 * Linux leaves movement to the compositor's Move Window action.
 */

import { macWindowDrag } from './window-drag-macos'

/** Must match the title passed to `render()`. */
const WINDOW_TITLE = 'Morsel · GPUIX Code Editor'
const LEGACY_WINDOW_TITLE = 'Hiroshi · Multi-Agent Orchestrator'

/** SetWindowPos flags: keep the size, the z order and the activation. */
const SWP_NOSIZE = 0x0001
const SWP_NOZORDER = 0x0004
const SWP_NOACTIVATE = 0x0010
const SWP_NOOWNERZORDER = 0x0200

/** Virtual key code of the left mouse button. */
const VK_LBUTTON = 0x01

/** Two presses closer together than this are a double click. */
const DOUBLE_CLICK_MS = 300

/** A double click stays within a few pixels of the first press. */
const DOUBLE_CLICK_SLOP_PX = 5

type User32Symbols = {
  FindWindowW: (className: any, windowName: any) => any
  FindWindowExW: (parent: any, after: any, className: any, windowName: any) => any
  GetForegroundWindow: () => any
  GetWindowThreadProcessId: (hwnd: any, pidOut: any) => number
  GetWindowRect: (hwnd: any, rectOut: any) => boolean
  ClientToScreen: (hwnd: any, pointOut: any) => boolean
  GetCursorPos: (pointOut: any) => boolean
  SetWindowPos: (
    hwnd: any,
    insertAfter: any,
    x: number,
    y: number,
    width: number,
    height: number,
    flags: number,
  ) => boolean
  SetCapture: (hwnd: any) => any
  ReleaseCapture: () => boolean
  IsZoomed: (hwnd: any) => boolean
  ShowWindow: (hwnd: any, command: number) => boolean
  GetDpiForWindow: (hwnd: any) => number
  GetThreadDpiAwarenessContext: () => any
  GetAwarenessFromDpiAwarenessContext: (context: any) => number
  GetAsyncKeyState: (virtualKey: number) => number
}

let user32: { symbols: User32Symbols } | null = null
let ffiUnavailable = false

function isWindows(): boolean {
  return typeof process !== 'undefined' && process.platform === 'win32'
}

function loadUser32(): { symbols: User32Symbols } | null {
  if (user32) return user32
  if (ffiUnavailable || !isWindows()) return null
  try {
    // `bun:ffi` only exists in the Bun desktop runtime. The browser build has
    // no `require`, so the failure has to stay inside this try block.
    const { dlopen, FFIType } = require('bun:ffi')
    user32 = dlopen('user32.dll', {
      FindWindowW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
      FindWindowExW: { args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
      GetForegroundWindow: { args: [], returns: FFIType.ptr },
      GetWindowThreadProcessId: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.u32 },
      GetWindowRect: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.bool },
      ClientToScreen: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.bool },
      GetCursorPos: { args: [FFIType.ptr], returns: FFIType.bool },
      SetWindowPos: {
        args: [
          FFIType.ptr,
          FFIType.ptr,
          FFIType.i32,
          FFIType.i32,
          FFIType.i32,
          FFIType.i32,
          FFIType.u32,
        ],
        returns: FFIType.bool,
      },
      SetCapture: { args: [FFIType.ptr], returns: FFIType.ptr },
      ReleaseCapture: { args: [], returns: FFIType.bool },
      IsZoomed: { args: [FFIType.ptr], returns: FFIType.bool },
      ShowWindow: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.bool },
      GetDpiForWindow: { args: [FFIType.ptr], returns: FFIType.u32 },
      GetThreadDpiAwarenessContext: { args: [], returns: FFIType.ptr },
      GetAwarenessFromDpiAwarenessContext: { args: [FFIType.ptr], returns: FFIType.i32 },
      GetAsyncKeyState: { args: [FFIType.i32], returns: FFIType.i16 },
    })
  } catch {
    ffiUnavailable = true
    user32 = null
  }
  return user32
}

/** True when the handle belongs to a window owned by this process. */
function isOwnWindow(hwnd: any): boolean {
  const lib = loadUser32()
  if (!lib || !hwnd) return false
  try {
    const pid = new Uint32Array(1)
    lib.symbols.GetWindowThreadProcessId(hwnd, pid)
    return pid[0] === process.pid
  } catch {
    return false
  }
}

/**
 * True when the client point of `hwnd` lands inside its own window rect.
 *
 * Only used to pick the right instance when more than one Hiroshi window
 * shares the same title.
 */
function containsClientPoint(hwnd: any, x: number, y: number): boolean {
  const lib = loadUser32()
  if (!lib) return false
  try {
    const point = new Int32Array(2)
    point[0] = x
    point[1] = y
    if (!lib.symbols.ClientToScreen(hwnd, point)) return false
    const rect = new Int32Array(4)
    if (!lib.symbols.GetWindowRect(hwnd, rect)) return false
    const [left, top, right, bottom] = rect
    return point[0] >= left && point[0] < right && point[1] >= top && point[1] < bottom
  } catch {
    return false
  }
}

/**
 * The window handle of the Hiroshi window.
 *
 * The foreground window is the one that just received the press, so it is the
 * right handle in every normal case. The title lookup is the fallback for the
 * case where the window has not been activated yet.
 */
export function resolveWindowHandle(event?: any): any {
  const lib = loadUser32()
  if (!lib) return null
  try {
    const foreground = lib.symbols.GetForegroundWindow()
    if (foreground && isOwnWindow(foreground)) return foreground

    const titles = [
      Buffer.from(`${WINDOW_TITLE}\0`, 'utf16le'),
      Buffer.from(`${LEGACY_WINDOW_TITLE}\0`, 'utf16le'),
    ]
    const x = typeof event?.x === 'number' ? event.x : null
    const y = typeof event?.y === 'number' ? event.y : null
    for (const title of titles) {
      let found = lib.symbols.FindWindowW(null, title)
      while (found) {
        if (isOwnWindow(found) && (x === null || y === null || containsClientPoint(found, x, y))) return found
        found = lib.symbols.FindWindowExW(null, found, null, title)
      }
    }
    return null
  } catch {
    return null
  }
}

/** The cursor position in physical screen pixels. */
function getCursorPosition(): { x: number; y: number } | null {
  const lib = loadUser32()
  if (!lib) return null
  try {
    const point = new Int32Array(2)
    if (!lib.symbols.GetCursorPos(point)) return null
    return { x: point[0], y: point[1] }
  } catch {
    return null
  }
}

/**
 * Window space units per physical pixel.
 *
 * A per-monitor aware process works in physical pixels, so the cursor delta
 * is used as is. A scaled or unaware process works in its own logical space,
 * where one unit is smaller than a physical pixel.
 */
function getUnitScale(hwnd: any): number {
  const lib = loadUser32()
  if (!lib) return 1
  try {
    const awareness = lib.symbols.GetAwarenessFromDpiAwarenessContext(
      lib.symbols.GetThreadDpiAwarenessContext(),
    )
    if (awareness === 2) return 1
    const dpi = lib.symbols.GetDpiForWindow(hwnd)
    if (!dpi || dpi <= 0) return 1
    return 96 / dpi
  } catch {
    return 1
  }
}

/** True while the left mouse button is held down. */
function isLeftButtonDown(): boolean {
  const lib = loadUser32()
  if (!lib) return false
  try {
    return (lib.symbols.GetAsyncKeyState(VK_LBUTTON) & 0x8000) !== 0
  } catch {
    return false
  }
}

type DragSession = {
  hwnd: any
  /** Window position when the drag started. */
  originX: number
  originY: number
  /** Cursor position when the drag started. */
  cursorX: number
  cursorY: number
  /** Window space units per physical pixel. */
  unitScale: number
}

let session: DragSession | null = null

/**
 * Begin a drag.
 *
 * The window does not move yet: the first move decides by how much, so a
 * plain click on the titlebar never shifts the window.
 */
function beginDrag(event?: any): boolean {
  if (typeof process !== 'undefined' && process.platform === 'darwin') return macWindowDrag.start(event)
  const lib = loadUser32()
  if (!lib) return false
  try {
    const hwnd = resolveWindowHandle(event)
    if (!hwnd) return false
    const cursor = getCursorPosition()
    if (!cursor) return false
    const rect = new Int32Array(4)
    if (!lib.symbols.GetWindowRect(hwnd, rect)) return false
    session = {
      hwnd,
      originX: rect[0],
      originY: rect[1],
      cursorX: cursor.x,
      cursorY: cursor.y,
      unitScale: getUnitScale(hwnd),
    }
    // Keep the mouse events coming even when the pointer leaves the window.
    lib.symbols.SetCapture(hwnd)
    return true
  } catch {
    session = null
    return false
  }
}

/** Move the window by the cursor delta. */
export function updateWindowDrag(): void {
  if (!session) return
  const lib = loadUser32()
  if (!lib) return
  // A release that landed outside the window never reaches the titlebar.
  if (!isLeftButtonDown()) {
    endWindowDrag()
    return
  }
  const cursor = getCursorPosition()
  if (!cursor) return
  const dx = (cursor.x - session.cursorX) * session.unitScale
  const dy = (cursor.y - session.cursorY) * session.unitScale
  if (dx === 0 && dy === 0) return
  try {
    lib.symbols.SetWindowPos(
      session.hwnd,
      null,
      Math.round(session.originX + dx),
      Math.round(session.originY + dy),
      0,
      0,
      SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_NOOWNERZORDER,
    )
  } catch {
    // ignore
  }
}

/** End the drag and give the mouse back. */
export function endWindowDrag(): void {
  if (!session) return
  const lib = loadUser32()
  session = null
  try {
    lib?.symbols.ReleaseCapture()
  } catch {
    // ignore
  }
}

/** True while a drag is running. */
export function isDragging(): boolean {
  if (typeof process !== 'undefined' && process.platform === 'darwin') return macWindowDrag.active()
  return session !== null
}

/** Capture native mouse-down events before asynchronous JS receives the press. */
export function installWindowDrag(): void {
  if (typeof process !== 'undefined' && process.platform === 'darwin') macWindowDrag.install()
}

/** The window rectangle from before the window was maximized. */
let normalRect: number[] | null = null

/** ShowWindow command: put the window back to its normal size. */
const SW_RESTORE = 9

/** True when the window is maximized right now. */
export function isWindowMaximized(): boolean {
  const lib = loadUser32()
  if (!lib) return false
  try {
    const hwnd = resolveWindowHandle()
    if (!hwnd) return false
    return lib.symbols.IsZoomed(hwnd)
  } catch {
    return false
  }
}

/**
 * Maximize the window, or restore it when it is maximized already.
 *
 * The native zoom only maximizes on Windows, it never restores, so the
 * restore goes through `ShowWindow(SW_RESTORE)`. That also clears the zoomed
 * state, which a plain window move would leave behind.
 */
export function toggleWindowZoom(renderer?: any): boolean {
  const lib = loadUser32()
  if (!lib) {
    renderer?.zoomWindow?.()
    return false
  }
  try {
    const hwnd = resolveWindowHandle()
    if (!hwnd) {
      renderer?.zoomWindow?.()
      return false
    }
    if (lib.symbols.IsZoomed(hwnd)) {
      lib.symbols.ShowWindow(hwnd, SW_RESTORE)
      normalRect = null
      return true
    }
    const rect = new Int32Array(4)
    if (lib.symbols.GetWindowRect(hwnd, rect)) {
      normalRect = [rect[0], rect[1], rect[2], rect[3]]
    }
    renderer?.zoomWindow?.()
    return true
  } catch {
    return false
  }
}

type DragStarter = (event?: any) => boolean

let dragStarter: DragStarter = beginDrag

/**
 * Replace the drag implementation.
 *
 * The desktop build always uses the native window move. Tests install a stub
 * so a press on the titlebar can be asserted without moving a real window.
 */
export function setWindowDragStarter(starter: DragStarter | null): void {
  dragStarter = starter ?? beginDrag
}

/** Start dragging the window. Returns false when no drag was started. */
export function startWindowDrag(event?: any): boolean {
  try {
    return dragStarter(event)
  } catch {
    return false
  }
}

let lastPressAt = 0
let lastPressX = 0
let lastPressY = 0

/** Forget the last press, so the next one starts a fresh drag. */
export function resetTitlebarPress(): void {
  lastPressAt = 0
  lastPressX = 0
  lastPressY = 0
}

/**
 * Titlebar press handler: drag the window, and zoom it on a double click.
 */
export function handleTitlebarMouseDown(renderer?: any, event?: any): void {
  if (event && typeof event.button === 'number' && event.button !== 0) return
  const now = Date.now()
  const x = typeof event?.x === 'number' ? event.x : null
  const y = typeof event?.y === 'number' ? event.y : null
  const nearFirstPress =
    x === null ||
    y === null ||
    (Math.abs(x - lastPressX) <= DOUBLE_CLICK_SLOP_PX &&
      Math.abs(y - lastPressY) <= DOUBLE_CLICK_SLOP_PX)
  if (lastPressAt !== 0 && now - lastPressAt < DOUBLE_CLICK_MS && nearFirstPress) {
    resetTitlebarPress()
    toggleWindowZoom(renderer)
    return
  }
  lastPressAt = now
  if (x !== null) lastPressX = x
  if (y !== null) lastPressY = y
  startWindowDrag(event)
}
