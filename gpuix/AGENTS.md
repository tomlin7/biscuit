# Hiroshi Development Guidelines & GPUIX Invariants

## 1. App Identity & Branding
- **Name**: The application is strictly **Hiroshi**. Never name it Waku or use upstream placeholder branding.
- **Branding**: Window title is `Hiroshi · Multi-Agent Orchestrator`, daemons are `Hiroshi daemon`, etc.
- **Context**: Hiroshi is a multi-agent orchestration desktop app built with GPUIX.

## 2. GPUIX Desktop Framework Rules

### No Native Titlebar, Draggable Custom Titlebar
- The native OS titlebar is never shown. In the `render()` entry point set:
  ```tsx
  titlebarTransparent: true,
  ```
  Never condition it on `process.platform`. A conditional value gives Windows a
  duplicate native titlebar, which is exactly what the custom chrome avoids.
- The custom titlebar is draggable. `src/window-drag.ts` owns the whole
  mechanism: the press records the window and cursor position, every move
  pushes the window by the cursor delta with `SetWindowPos`, and the release
  lets go.
- Do not hand the drag to the OS modal move loop. `WM_SYSCOMMAND` with
  `SC_MOVE|HTCAPTION` and `WM_NCLBUTTONDOWN` with `HTCAPTION` are both
  ignored by the GPUI Windows backend, so the window never moves. This is a
  GPUIX gap (no window move API is exposed by the native renderer).
- A drag region must set `pointerEvents: 'auto'`. An unfilled in-flow `div`
  gets no GPUI hitbox at all (`should_occlude` in GPUIX), so without it the
  press never reaches the handler and the titlebar is dead.
- A drag region needs `onMouseDown`, `onMouseMove` and `onMouseUp` on the same
  element. GPUIX arms the pointer capture on the press only when the element
  also listens for moves, which is what keeps the drag alive outside the
  titlebar.
- Double click on the titlebar zooms the window. The detection lives in
  `handleTitlebarMouseDown` and compares the timestamps and the positions of
  two presses.
- The maximize button and the titlebar double click share `toggleWindowZoom`.
  The native zoom only maximizes on Windows, it never restores, so the
  restore goes through `ShowWindow(SW_RESTORE)`. A window move cannot stand
  in for it: `IsZoomed` stays true and the next click would restore again
  instead of maximizing.

### Centered Modals & DialogPortals
- When using `DialogPortal` in GPUIX, explicitly pass `position: { x: 0, y: 0 }` and window dimensions to bypass trigger anchoring and ensure full-viewport centering and backdrop dimming:
  ```tsx
  <DialogPortal
    {...({ position: { x: 0, y: 0 } } as any)}
    onMouseDown={onClose}
    style={{
      width: 1180,
      height: 820,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#00000088',
    }}
  >
  ```

### Single-String `<text>` Elements
- In GPUIX, multi-child `<text>Prefix {dynamic} Suffix</text>` can trigger unwanted word-wrapping into multiple lines.
- Always use a single template literal string and `whiteSpace: 'nowrap'` when text should stay on one line:
  ```tsx
  <text style={{ whiteSpace: 'nowrap' }}>{`Prefix ${dynamic} Suffix`}</text>
  ```

### Vector SVGs for UI Symbols
- Never use Unicode symbols that may resolve to Windows system emojis (e.g., `✳`, `❇`). Always render SVG icons with explicit strokes and colors.

## 3. PowerShell Commands
- In Windows PowerShell, use `;` rather than `&&` for chaining commands (e.g. `bun run typecheck ; git status`).
