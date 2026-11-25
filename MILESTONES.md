# Milestones

Gradual rewrite of the Biscuit editor experience on Tauri 2 + React + Monaco.
Each row is a shippable `0.x` release until **1.0.0**.

| Version | Focus | Status |
|---------|--------|--------|
| **0.1.0** | Application shell | shipped |
| **0.2.0** | Monaco editor engine | shipped |
| **0.2.1** | Island chrome (Biscuit-like floating panels) | shipped |
| **0.3.0** | Workspace FS — open folder, explorer tree, open/save files | shipped |
| **0.4.0** | Editor tabs — multi-file buffers, dirty state, close/reorder | shipped |
| **0.5.0** | Theming polish — light/dark tokens + Monaco themes | shipped |
| **0.6.0** | Command palette + keybindings foundation | shipped |
| **0.7.0** | Find in file / workspace search | shipping |
| **0.8.0** | Integrated terminal (PTY) | planned |
| **0.9.0** | Git SCM view (status, diff entry points) | planned |
| **0.10.0+** | LSP, AI agents, extensions, debugger | planned |
| **1.0.0** | Stable product — only after foundations are solid | later |

## Current target

Ship **0.7.0**: Ctrl+F find-in-file and Ctrl+Shift+F workspace search.
