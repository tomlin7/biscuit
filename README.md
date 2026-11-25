# T3D

A focused desktop code editor built on Tauri&nbsp;2, React&nbsp;19, and Monaco.

T3D pairs a native Rust application core with a modern web frontend. It provides sub-second startup, an integrated terminal with real PTY support, split-pane editing, source control, an extensible theme and plugin system, and optional local or cloud AI assistance.

[Releases](https://github.com/tomlin7/t3d/releases) · [Milestones](MILESTONES.md) · [Versioning](VERSIONING.md) · [Website](https://t3d.sh)

---

## Downloads

Official multi-platform binaries are built on every release tag using GitHub Actions.

| Platform | Format | Description |
|---|---|---|
| **Windows** | `.exe` / `.msi` | 64-bit installer and WiX package |
| **macOS** | `.dmg` | Universal binary (Apple Silicon and Intel) |
| **Linux** | `.AppImage` / `.deb` | Standalone AppImage and Debian package |

Download the latest version (`v0.467.0`) from the [GitHub Releases](https://github.com/tomlin7/t3d/releases) page.

> Pre-1.0 release policy: Version `1.0.0` will be published when the feature milestone roadmap is declared complete. Current builds track stable pre-1.0 releases.

---

## Architecture

| Layer | Technology | Role |
|---|---|---|
| **Desktop Shell** | Tauri 2 (Rust) | Native window management, file system access, process lifecycle |
| **Terminal Core** | `portable-pty` | Direct pseudoterminal spawning for PowerShell, Bash, and Zsh |
| **Editor Engine** | Monaco Editor | Syntax highlighting, multi-cursor editing, minimap, diff viewer |
| **Frontend UI** | React 19 + TypeScript | Split layouts, tabs, command palette, settings, file tree |
| **Extensions** | Sandboxed Webviews | Isolated iframe execution with a scoped JSON-RPC bridge |
| **Landing Page** | Next.js 16 (App Router) | Static site in `www/` with tailwind styling |

---

## Core Capabilities

- **Editor**: Monaco core with split editor panes, file tabs, minimap, find & replace with regex support, and markdown live preview.
- **Terminal**: Embedded xterm.js powered by native `portable-pty` sessions with split terminals and shell selection.
- **Source Control**: Git status, visual diff viewer, stage/unstage, commits, branch switcher, and git ignore management.
- **Extension Registry**: Installable first-party extensions packaged with manifest validation, checksum verification, and sandboxed runtimes.
- **AI Composer**: Optional assistant panel with support for local Ollama instances or cloud API keys.
- **Themes & Layout**: Dark/Light modes, customizable UI presets, and responsive panel resizing.

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.1 or later)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Platform build dependencies:
  - **Windows**: Microsoft C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Running the Editor

```bash
# Clone the repository
git clone https://github.com/tomlin7/t3d.git
cd t3d

# Install dependencies
bun install

# Start development mode (Vite + Tauri)
bun run tauri dev
```

### Packaging Extensions

```bash
bun run extensions:build
```

Builds zip archives and regenerates `extensions-dist/index.json` with SHA-256 integrity hashes.

### Running Tests

```bash
# Frontend type check
bunx tsc --noEmit

# Rust unit tests
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

### Landing Page (`www/`)

```bash
cd www
bun install
bun run dev
```

---

## License

[MIT](LICENSE)
