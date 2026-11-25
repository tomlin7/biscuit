# Versioning

T3D follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version rollover & MSI constraint

Windows MSI installer format caps ProductVersion minor numbers at 255 (`app version minor number cannot be greater than 255`).
Milestones 0–255 remain in historical `0.x` (`0.0.0` through `0.255.0`).
Subsequent milestones transition to `1.x`, where the minor number is calculated as `milestone - 255`:
- Milestone 467 corresponds to `1.212.0` (467 - 255 = 212).

Stable `2.0.0` will ship when the roadmap is declared complete.

### Source of truth

Version strings must stay aligned across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

### Release tags

Git tags use the form `v1.212.0`, matching the active release version.

