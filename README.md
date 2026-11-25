<div align="center">

# Morsel

**`/ℳℴ𝓇𝓈ℯ𝓁/`**

*A code editor that respects your palate (AKA Biscuit-v2).*

<br />

[![Morsel Editor](www/public/hero.png)](https://github.com/tomlin7/Morsel)

<br />

[Downloads](#downloads) &ensp;·&ensp; [Quickstart](#quickstart) &ensp;·&ensp; [Workspaces](#packages) &ensp;·&ensp; [Milestones](MILESTONES.md) &ensp;·&ensp; [Website](https://t3d.sh)

</div>

---

### Highlights

- **Sub-100ms startup**: Native Rust core powered by Tauri 2 and `portable-pty`.
- **Focused editing**: Monaco engine with multi-pane drag-to-split grids, breadcrumbs, and call/type hierarchies.
- **Specialized inspection**: Built-in PDF viewer, interactive Hex editor, and tabular CSV/TSV mode.
- **Extensible & isolated**: Web Worker extension host, theme contributions, and installable icon themes.
- **Dual runtimes**: Desktop Tauri application alongside the experimental GPU-accelerated cockpit in `gpuix/`.

---

## Quickstart

Requires [Bun](https://bun.sh/) and the [Rust](https://rustup.rs/) stable toolchain.

```bash
# Clone and install dependencies
git clone https://github.com/tomlin7/Morsel.git
cd Morsel
bun install

# Run Desktop Editor (Tauri 2 + React 19)
bun run tauri:dev

# Run GPU-Accelerated Cockpit (GPUIX)
bun run gpuix:dev
```

---

## Packages

Morsel is structured as a minimalist monorepo:

| Directory | Target | Tech Stack |
|---|---|---|
| [`tauri/`](tauri/) | Primary desktop code editor | Tauri 2 (Rust) + React 19 + Monaco |
| [`gpuix/`](gpuix/) | GPU-accelerated editor cockpit | GPUIX + React 19 native bindings |
| [`www/`](www/) | Project website and documentation | Next.js 16 (App Router) + Tailwind CSS |

---

## Downloads

Official multi-platform binaries are generated on every tagged release:

| Platform | Format | Description |
|---|---|---|
| **Windows** | `.exe` / `.msi` | 64-bit standalone installer and MSI package |
| **macOS** | `.dmg` | Universal binary (Apple Silicon and Intel) |
| **Linux** | `.AppImage` / `.deb` | Standalone AppImage and Debian package |

Latest stable builds: **[GitHub Releases](https://github.com/tomlin7/Morsel/releases)**

---

## Verification

```bash
# Typecheck all packages
bun run typecheck

# Run test suites (Tauri unit tests + GPUIX suites)
bun run test

# Rust backend tests
cargo test --manifest-path tauri/src-tauri/Cargo.toml --lib
```

---

## License

[MIT](LICENSE) © [Tomlin7](https://github.com/tomlin7)
