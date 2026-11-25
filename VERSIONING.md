# Versioning

T3D follows [Semantic Versioning 2.0.0](https://semver.org/).

## Pre-1.0 policy

Until **1.0.0**, T3D is unstable by design.

| Range | Meaning |
|-------|---------|
| `0.x.y` | Active development. Breaking changes are allowed between minor bumps. |
| `1.0.0` | First stable release. Reserved for later — not the current target. |

### How versions move before 1.0

- **0.MINOR.0** — a milestone lands (new capability area).
- **0.MINOR.PATCH** — fixes and small polish inside the current milestone.
- Do **not** jump to `1.0.0` until product readiness is explicitly decided.

### Source of truth

Version strings must stay aligned across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### Release tags

Git tags use the form `v0.1.0`, matching the milestone that shipped.
