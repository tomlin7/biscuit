# Versioning

T3D follows [Semantic Versioning 2.0.0](https://semver.org/).

## Policy

| Range | Meaning |
|-------|---------|
| `0.x.y` | Active development before first stable. Breaking changes allowed between minor bumps. |
| `1.x.y` | Stable product line starting at **1.0.0**. |

### How versions move after 1.0

- **MAJOR** — incompatible API or product breaking changes.
- **MINOR** — new capabilities in a backward-compatible way.
- **PATCH** — fixes and polish.

### Source of truth

Version strings must stay aligned across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### Release tags

Git tags use the form `v1.0.0`, matching the release that shipped.
