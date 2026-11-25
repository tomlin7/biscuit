---
name: gpuix-taste
description: >-
  Procedures, runbooks, and recipes for building, animating, and testing GPUIX desktop components in a GPUIX desktop app. Use when modifying or adding UI components, windows, sidebars, motion animations, Win32 borderless window dragging, titlebar maximize/restore, or automation tests in a GPUIX desktop app.
---

# GPUIX Desktop Development Skill

The app is a GPU-rendered multi-agent orchestration desktop cockpit built with GPUIX (the React reconciler over Zed's native GPUI engine). This skill provides exact recipes, structural patterns, styling invariants, and testing workflows for building desktop surfaces in a GPUIX desktop app.

---

## 1. Window Architecture & Native Dragging

### Invariant: Transparent Titlebar
The app renders custom dark chrome across the full window. The native OS titlebar must never be visible.
In the application entry point (`render()`):
```tsx
render(<App />, {
  title: 'App Name',
  titlebarTransparent: true,
  // ...
})
```
Never condition `titlebarTransparent` on platform (`process.platform !== 'win32'`), as that causes Windows to force an unwanted duplicate titlebar.

### The OS move loop does not work here
The obvious way to drag a custom titlebar is to hand the drag to the OS modal
move loop. **It does not work with the GPUI Windows backend.** Both of these
are silently dropped by the platform layer:

- `SendMessageW(hwnd, WM_SYSCOMMAND, SC_MOVE | HTCAPTION, 0)`
- `SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0)`

Measured against a live app window: the press arrives, the HWND resolves,
`SendMessageW` returns, and the window moves `0,0` pixels. Do not spend time
on this route again.

**Move the window from the app instead.** The whole mechanism lives in
`src/window-drag.ts`:

| Step | Call |
| :--- | :--- |
| press | record the window rect (`GetWindowRect`) and the cursor (`GetCursorPos`), `SetCapture(hwnd)` |
| move | `SetWindowPos(hwnd, null, originX + dx, originY + dy, 0, 0, SWP_NOSIZE \| SWP_NOZORDER \| SWP_NOACTIVATE)` |
| release | `ReleaseCapture()` |

`dx`/`dy` are the cursor delta in physical pixels, multiplied by the unit
scale (see DPI below). The window follows the cursor 1:1.

### A drag region needs three things
1. **`pointerEvents: 'auto'`** — an unfilled in-flow `div` gets no GPUI hitbox
   at all (GPUIX `should_occlude`), so without it the press never reaches the
   handler and the region is dead.
2. **`onMouseDown` + `onMouseMove` + `onMouseUp` on the same element** —
   GPUIX arms `capture_pointer()` only when the element listens for *both*
   `mouseDown` and `mouseMove`. That capture is what keeps the drag alive
   when the pointer leaves the titlebar.
3. **A hitbox that does not cover the buttons** — the drag region wraps the
   title text and the empty space, the controls sit outside it.

```tsx
<div
  testId="titlebar-drag-header"
  style={{ flexGrow: 1, height: '100%', pointerEvents: 'auto' }}
  onMouseDown={(e: any) => handleTitlebarMouseDown(renderer, e)}
  onMouseMove={() => updateWindowDrag()}
  onMouseUp={() => endWindowDrag()}
/>
```

### Resolving the window handle safely
Never move a window you have not checked. Resolve the HWND from the
foreground window (the one that just received the press) and verify the
process id, then fall back to a title lookup:

```ts
const foreground = user32.symbols.GetForegroundWindow()
if (foreground && isOwnProcess(foreground)) return foreground
const title = Buffer.from('App Name\0', 'utf16le')
const found = user32.symbols.FindWindowW(null, title)
if (found && isOwnProcess(found)) return found
```

`isOwnProcess` compares `GetWindowThreadProcessId` with `process.pid`. Without
that check a drag can move an unrelated window that happens to share the
title. When several instances exist, also check that the press point is
inside the candidate window (`ClientToScreen` + `GetWindowRect`).

### DPI
The process is DPI **unaware** (`GetAwarenessFromDpiAwarenessContext` = 0),
so `GetWindowRect` and `SetWindowPos` work in virtualized units while
`GetCursorPos` returns physical pixels. The cursor delta has to be scaled:

```ts
const awareness = GetAwarenessFromDpiAwarenessContext(GetThreadDpiAwarenessContext())
const unitScale = awareness === 2 ? 1 : 96 / GetDpiForWindow(hwnd)
```

A per-monitor aware process (awareness 2) works in physical pixels, so the
scale is 1.

### A release can be lost
A mouse release that lands outside the window never reaches the titlebar, and
the drag would stay armed. The move handler checks the button state and ends
the drag itself:

```ts
if ((GetAsyncKeyState(VK_LBUTTON) & 0x8000) === 0) {
  endWindowDrag()
  return
}
```

### Maximize and restore
`renderer.zoomWindow()` **only maximizes on Windows, it never restores**. The
second click on the maximize button did nothing until this was handled.

- Restore with `ShowWindow(hwnd, SW_RESTORE)`.
- Do **not** restore with a window move. `IsZoomed` stays `true` after
  `SetWindowPos`, so the next click takes the restore branch again instead of
  maximizing. `SW_RESTORE` clears the zoomed state.
- The maximize button and the titlebar double click share one `toggleWindowZoom`
  helper, and the button reads `IsZoomed` on hover so the glyph and the
  tooltip match the real state.

### Titlebar Drag Spacers & Double-Click Maximize
GPUIX `<div />` elements do not support `onDoubleClick`. Use a timestamp
interval check inside `onMouseDown`, with a position slop so a second press
elsewhere on the titlebar is not read as a double click:

```ts
let lastPressAt = 0
let lastPressX = 0
let lastPressY = 0
const DOUBLE_CLICK_MS = 300
const DOUBLE_CLICK_SLOP_PX = 5

export function handleTitlebarMouseDown(renderer?: any, event?: any) {
  if (event && typeof event.button === 'number' && event.button !== 0) return
  const now = Date.now()
  const x = typeof event?.x === 'number' ? event.x : null
  const y = typeof event?.y === 'number' ? event.y : null
  const nearFirstPress =
    x === null || y === null ||
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
```

### The GPUIX gap to report upstream
The native renderer exposes no window move API (`minimizeWindow`,
`zoomWindow`, `toggleFullscreen`, `activateWindow`, `setWindowTitle`,
`getWindowSize` — that is all). On Windows `titlebarTransparent: true` still
leaves the window at style `0x14CF0000` (WS_CAPTION | WS_OVERLAPPEDWINDOW)
while nothing is painted there, and the caption messages are dropped, so an
app has to move the window itself. A `startWindowDrag()` / `setWindowPosition()`
in `packages/native` would remove the need for `bun:ffi` in every app.

---

## 2. Sliding Drawers & Resizable Sidebars Pattern

To achieve smooth drawer animations alongside interactive width resizing without latency or hit-test clipping:

### 1. Absolute Handle Placement
Place `ResizeHandle` as the **last child** inside the sliding `motion.div` drawer container with `position: 'absolute', top: 0, bottom: 0`:
- **Left Drawer**: `right: 0`
- **Right Drawer**: `left: 0`

This guarantees:
1. The handle is rendered on top in GPUI hit-testing (DOM order defines stacking; GPUI does not support `zIndex`).
2. Flexbox flow of inner contents is never shifted or distorted.
3. The handle slides cleanly with the drawer without getting clipped by `overflow: 'hidden'`.

### 2. Zero-Latency Drag Duration
When actively dragging, set motion duration to `0` so width updates track the mouse instantaneously without motion lag, while retaining `0.2s easeOut` for toggle and collapse buttons:
```tsx
<motion.div
  initial={false}
  animate={{ width: collapsed ? 0 : sidebarWidth }}
  transition={{ duration: resizing === 'left' ? 0 : 0.2, ease: 'easeOut' }}
  style={{
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
  }}
>
  <Sidebar width={sidebarWidth} ... />
  <ResizeHandle
    testId="resize-handle-left"
    side="left"
    isResizing={resizing === 'left'}
    onMouseDown={(e: any) => {
      if (e.button === 0) {
        resizeOrigin.current = { startX: e.x ?? 0, startWidth: sidebarWidth }
        setResizing('left')
      }
    }}
  />
</motion.div>
```

### 3. Full-Screen Resizing Overlay
Mount a transparent full-screen overlay when `resizing !== null` to track mouse movements anywhere across the window and release cleanly:
```tsx
{resizing !== null && (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      cursor: 'col-resize',
      backgroundColor: '#00000001',
    }}
    onMouseMove={(e: any) => {
      const currentX = e.x ?? 0
      if (resizing === 'left') {
        const newWidth = Math.max(180, Math.min(500, currentX))
        setSidebarWidth(newWidth)
      } else if (resizing === 'right') {
        const delta = resizeOrigin.current.startX - currentX
        const newWidth = Math.max(260, Math.min(700, resizeOrigin.current.startWidth + delta))
        setRightPanelWidth(newWidth)
      } else if (resizing === 'inspector') {
        const delta = resizeOrigin.current.startX - currentX
        const newWidth = Math.max(200, Math.min(450, resizeOrigin.current.startWidth + delta))
        setInspectorWidth(newWidth)
      }
    }}
    onMouseUp={() => setResizing(null)}
  />
)}
```

---

## 3. GPUIX Styling Invariants & Pitfalls

| Invariant | Problem | Solution |
| :--- | :--- | :--- |
| **No `zIndex`** | `zIndex` does not exist in `StyleDesc` (TS2353 error). | Stacking is strictly determined by DOM render tree order. Later children render on top of earlier siblings. |
| **Single-String `<text>`** | Multi-child `<text>Prefix {dynamic} Suffix</text>` causes unwanted word-wrapping into multiple lines. | Always format text as a single template literal: `<text style={{ whiteSpace: 'nowrap' }}>{\`Prefix ${dynamic} Suffix\`}</text>`. |
| **No Unicode Emojis** | Characters like `✳` or `❇` resolve to colorful native OS emojis on Windows. | Always use vector SVG icons (`<Icon name="..." />` or inline `<svg>`) with explicit strokes and colors. |
| **Dialog Portals** | `DialogPortal` anchors to trigger buttons by default, causing misaligned modals. | Pass `{ position: { x: 0, y: 0 } } as any` and explicit window dimensions (`width: 1180, height: 820`) for full-viewport centering and backdrop dimming. |
| **Initial Animation** | `motion.div` and `AnimatePresence` animate components on initial mount if not disabled. | Always set `initial={false}` on `motion.div` and `<AnimatePresence initial={false}>`. |
| **Empty div has no hitbox** | An unfilled in-flow `div` never receives a mouse event, so a drag region is dead. | Set `pointerEvents: 'auto'`. GPUIX `should_occlude` only gives a hitbox to a filled, positioned, or explicitly interactive element. |
| **Pointer capture needs a move listener** | A drag stops following the cursor as soon as the pointer leaves the element. | Put `onMouseDown`, `onMouseMove` and `onMouseUp` on the same element. GPUIX arms `capture_pointer()` on the press only when the element also listens for moves. |

---

## 4. UI Automation & Testing Runbook

Tests and screenshot scripts run through `@gpuix/react/automation` on the GPU.

### Mouse Action Requirements
`app.mouse.down()`, `app.mouse.up()`, and `app.mouse.move()` require coordinates:
```ts
// Move
await app.mouse.move({ x: targetX, y: targetY })

// Drag sequence
await app.mouse.move({ x: startX, y: startY })
await app.mouse.down({ x: startX, y: startY })
for (let dx = 10; dx <= 100; dx += 20) {
  await app.mouse.move({ x: startX + dx, y: startY })
  await new Promise((r) => setTimeout(r, 20))
}
await app.mouse.up({ x: startX + 100, y: startY })
```

### Inspecting Bounds & Taking Screenshots
```ts
const handle = app.getByTestId('resize-handle-left')
await handle.waitFor({ timeoutMs: 10_000 })
const bounds = await handle.bounds() // { x, y, width, height }

await app.screenshot({ path: path.join('screenshots', 'verification.png') })
```

### Verifying window level behaviour
The app cannot see its own OS window state, and the automation client only
drives GPUI events. To assert what the **window** did, read it from outside
the process: launch the app with `launch()` and query the window with
`bun:ffi` in the same script.

```ts
const { dlopen, FFIType } = require('bun:ffi')
const user32 = dlopen('user32.dll', {
  FindWindowW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  GetWindowRect: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.bool },
  IsZoomed: { args: [FFIType.ptr], returns: FFIType.bool },
})

function windowState() {
  const title = Buffer.from('App Name\0', 'utf16le')
  const hwnd = user32.symbols.FindWindowW(null, title)
  const rect = new Int32Array(4)
  user32.symbols.GetWindowRect(hwnd, rect)
  return { zoomed: user32.symbols.IsZoomed(hwnd), rect: [rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]] }
}

const app = await launch({ command: 'bun', args: ['app.tsx'], env: { GPUIX_BACKGROUND: '1' } })
await app.getByTestId('window-maximize').waitFor({ timeoutMs: 60_000 })
await app.getByTestId('window-maximize').click()
console.log(windowState())
await app.close()
```

This is how the maximize/restore bug was pinned down: the rectangle came back
to the normal size but `IsZoomed` stayed `true`, which is what pointed at
`ShowWindow(SW_RESTORE)` instead of a window move.

### Two traps when driving the real mouse
Synthetic input with `SendInput` is a last resort:
- The absolute coordinates are normalized against the **virtual desktop**. With
  more than one monitor the mapping was off by a wide margin, so the press
  landed on another window and the app never saw it.
- The first click on an inactive window is consumed by the activation.

Ask the user to drag the window instead. A temporary `console.log` of the
target position inside `updateWindowDrag` shows the drag tracking the cursor
(the position changes with every mouse move and stops when the button is
released).

### Test the press path in vitest
The press path is testable through the real GPUI hit test. Install a stub so
no window is moved:

```ts
import { setWindowDragStarter, resetTitlebarPress } from './src/window-drag'

let drags = 0
setWindowDragStarter(() => { drags += 1; return true })

const target = app.getByTestId('titlebar-drag-header')
const bounds = await target.bounds()
await app.mouse.down({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
await app.mouse.up({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
expect(drags).toBe(1)
```

This is the test that catches a missing `pointerEvents: 'auto'`: without the
hitbox the press lands on the parent and `drags` stays 0.

---

## 5. Development CLI Commands

> [!IMPORTANT]
> In Windows PowerShell, always use `;` rather than `&&` for chaining commands.

- **Start Dev Server**: `cd <app> ; bun run dev`
- **Compile Standalone Binary**: `cd <app> ; bun run build`
- **Typecheck**: `cd <app> ; bun run typecheck`
- **Run Screenshots**: `cd <app> ; bun run screenshot`
- **Run the titlebar tests**: `cd <app> ; bunx vitest run titlebar-drag.test.tsx`

> [!NOTE]
> `app.test.tsx` asserts a swarm UI that `app.tsx` does not implement. Its five
> failures are pre-existing and unrelated to any window work. Do not spend time
> on them when a change is about dragging, chrome or zoom.

---

## 6. Calm chrome and a settings page

Direction, fit, and the shortcut list live on a settings view that **replaces** the main surface. While a book is open, layout (single, spread, webtoon) and zoom sit in that same titlebar, and they are absent from the library. Do not stack a second titlebar on top of the one already on screen. Keyboard shortcuts still change those settings while the view is closed. The empty home does not list them.

### Settings layout
- Sidebar width `240`, the sidebar canvas color, and a hairline border.
- Back row: height `32`, radius `7`.
- Section rows: height `36`, radius `7`, gap `2`. The active row is `#26262D`.
- On Darwin, sidebar `paddingTop` is about `36` so Back clears the traffic lights. Elsewhere it is `12`.
- Content header height is the titlebar height (`48`). It is a flex-grow drag spacer, then the window controls. The spacer is the drag region from section 1: `pointerEvents: 'auto'` plus `onMouseDown`, `onMouseMove`, and `onMouseUp` on that same element.
- Section title: size `22`, weight `600`, `marginBottom: 10`.
- One card per family: background `#202024`, radius `12`, border `1`, border color `#E6EAF20A`, `overflow: 'hidden'`.
- Row padding `16` / `18`. Title size `14`, weight `600`, `whiteSpace: 'nowrap'`. The description is one string, size `13`, secondary color, `maxWidth` about `460`. The control is `flexShrink: 0`.
- Divider: height `1`, the same border color, full bleed inside the card.
- A cycle control is a button, not a native `<select>`: height `28`, `paddingLeft: 10`, `paddingRight: 8`, radius `6`, the highlight surface, label size `13`, chevron size `10`. A click advances the value.
- Two sections do not need a search box. A row that does not change behavior does not belong on the page.

### Empty states and accent
An empty state is one line of tertiary text. Not a hero, a badge, or a wall of shortcuts.

A `maxWidth` column centered in the window leaves a trailing action floating in the empty margin. The row should span the padded window, or hug its own content.

In a narrow drawer, the selected row uses `alignSelf: 'flex-start'` so the highlight wraps the content instead of becoming an empty slab.

Accent is a thin progress mark, and the resize line while a divider is dragging. It is not a filled badge.

### Screenshot harness
`launch({ env })` opens a fixture file. Do not ship a control whose only job is to load a demo.

Isolate saved history with a home directory env var so a screenshot run does not write into the user's real library.

Assert that a control is absent by calling `waitFor` with a short timeout, and treat that timeout as success.

Run the screenshot job on `macos-latest`. Unit tests that never open a window can run on Ubuntu, Windows, and macOS.

### A titlebar that does not move
A drag region that only listens for `mouseDown`, or a handler that calls `SendMessageW`, does not move the window. Both were measured. Follow section 1. Do not turn the native titlebar back on.
