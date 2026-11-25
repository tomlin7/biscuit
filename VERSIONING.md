# Versioning

T3D follows [Semantic Versioning 2.0.0](https://semver.org/).

## Pre-1.0 policy

Until **1.0.0** is explicitly approved by the project owner, T3D stays on `0.x`.

| Range | Meaning |
|-------|---------|
| `0.x.y` | Active development. Breaking changes are allowed between minor bumps. |
| `1.0.0` | First stable release. **Not shipped until the owner decides.** |

### How versions move before 1.0

- **0.MINOR.0** — a milestone lands (new capability area).
- **0.MINOR.PATCH** — fixes and small polish inside the current milestone.
- Do **not** bump to `1.0.0` without an explicit owner decision.

### Source of truth

Version strings must stay aligned across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### Release tags

Git tags use the form `v0.10.0`, matching the milestone that shipped. Do not cut `v1.0.0` until approved.
