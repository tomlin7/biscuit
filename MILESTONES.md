# Milestones

Gradual rewrite of the Biscuit editor experience on Tauri 2 + React + Monaco.
Each row is a shippable `0.x` release. **1.0.0 is future-only.**

| Version | Focus | Status |
|---------|--------|--------|
| **0.1.0** | Application shell — menubar, activity bar, sidebar, editor area, panel, status bar | shipped |
| **0.2.0** | Monaco editor engine — open buffer, basic editing, language modes | shipped |
| **0.2.1** | Island chrome — Biscuit-like floating rounded panels, AI dock placeholder | shipping |
| **0.3.0** | Workspace FS — open folder, explorer tree, open/save files via Tauri | planned |
| **0.4.0** | Editor tabs — multi-file buffers, dirty state, close/reorder | planned |
| **0.5.0** | Theming polish — light mode, deeper token refinements | planned |
| **0.6.0** | Command palette + keybindings foundation | planned |
| **0.7.0** | Find in file / workspace search | planned |
| **0.8.0** | Integrated terminal (PTY) | planned |
| **0.9.0** | Git SCM view (status, diff entry points) | planned |
| **0.10.0+** | LSP, AI agents, extensions, debugger — further 0.x milestones | planned |
| **1.0.0** | Stable product — only after the above foundations are solid | later |

## Layout language

Match Biscuit’s **island** chrome: true-black canvas, rounded floating panels with
gutters, center editor, left explorer, right AI dock, slim title + status bars.
Screenshot reference lives with the design direction — not a pixel-perfect clone,
but the same composition.

## Architecture principles (vs legacy Biscuit)

- **No god-object app.** Compose features; keep layout, editor, and FS separate.
- **Monaco** owns text editing — not a custom canvas or Tk `Text`.
- **Tauri** owns OS: FS, dialogs, windowing, PTY, process.
- **React** owns chrome and state for UI surfaces.
- Prefer clear module boundaries over dumping everything in `App`.

## Current target

Ship **0.2.1**: island-panel chrome aligned with the Biscuit reference look.
