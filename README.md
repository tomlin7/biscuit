# T3D

Modern code editor built with **Tauri 2**, **React**, and **Monaco**.

Successor architecture to Biscuit — same product spirit, cleaner structure, better rendering.

## Status

Current version: **1.0.0** (stable).

See [VERSIONING.md](VERSIONING.md) and [MILESTONES.md](MILESTONES.md).

## Develop

```bash
bun install
bun run tauri dev
```

## Stack

| Layer | Choice |
|-------|--------|
| Shell | Tauri 2 |
| UI | React 19 + TypeScript |
| Editor engine | Monaco |
| Native | Rust |

## Features (1.0.0)

- Island chrome with explorer, search, git, extensions, and debug sidebars
- Monaco editing with tabs, themes, find, and diagnostics
- Integrated PTY terminal and Problems panel
- OpenAI-compatible AI agent island
- Extensions host (manifest + contributed commands)
- Run/debug foundations with breakpoints

## License

MIT — see [LICENSE](LICENSE).
