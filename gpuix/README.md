# Hiroshi

A GPU-native desktop cockpit for multi-agent development, built with React and
GPUIX. The desktop interface renders directly through GPUI, without Electron or
a web view.

![Hiroshi desktop cockpit](.github/image.png)

## Current state

Hiroshi is in active development. The local engine runs independently of the
window and persists its work in SQLite. It supports:

- Shell commands with streamed output, exit status and cancellation.
- Durable session inboxes with steering, queued prompts and interrupts.
- Streaming steps with bounded retries and explicit crash recovery.
- Context budgeting and compaction that preserve the full transcript.
- Model-requested tools with cockpit approvals, policy and durable results.
- Pre-prompt checkpoints that rewind workspace files and conversation together.
- Workspace file browsing, real Git review and commit/push, and a page-reader pane.
- Engine-ordered transcript, real session state and provider-reported usage.
- One typed HTTP protocol and a replayable event feed for multiple clients.

The [workspace surfaces](docs/surfaces.mdx) connect to the engine: Terminal shows
commands and model shell calls; Files reads the workspace; Review and commit/push
use Git; Browser reads HTTP/HTTPS pages with link navigation (without JavaScript). The main composer streams answers from the selected
engine model, and shows Send, Queue or Steer from engine state. Run phase and
turn count live in the header; Usage shows durable token counts, cache details,
date-filtered charts and reported or explicitly estimated costs. Available local
agent history can be included read-only; unsupported or partial histories remain
visible in coverage. Project menus switch folders or create isolated scratch tasks.
Daemon settings offer opt-in network access with separate credentials and exact
browser origins. See [settings and usage](docs/settings-delivery.md).
The daemon supports [single-use QR/link pairing](docs/device-pairing.md) with
separate, revocable device credentials over a reachable LAN/VPN or configured HTTPS endpoint.
[Internet access](docs/internet-access.md) in Daemon settings or `hiroshi-engine pair --remote`
creates an opt-in OpenTunnel HTTPS endpoint for pairing across networks, independently of LAN exposure.
OpenAI Responses and Anthropic Messages adapters use local
configuration and credentials; the built-in local echo needs neither. The full
multi-agent workflow is still being built, and parts of the cockpit remain
demonstrations. Providers settings discover Agy, Cursor Agent, Pi and Grok CLIs
with bounded metadata checks and manual path fallback. These CLIs can provide streamed,
response-only answers using their own sign-in, with task-owned native history
and deliberate recovery after an interruption. Coding approvals remain separate
work. See [provider configuration](docs/providers.mdx) and
[tools and permissions](docs/tools.mdx), and [checkpoints](docs/checkpoints.mdx).
The composer provides task-scoped [permission modes](docs/permission-modes.md),
including bounded AI review for routine Hiroshi-owned file actions.

Follow progress in [Usable agents and bounded orchestration](https://github.com/hiroshi-os/Hiroshi/milestone/2).
See [the engine documentation](docs/engine.mdx) for its architecture and guarantees.

## Releases

Download [Hiroshi releases](https://github.com/hiroshi-os/Hiroshi/releases/latest)
for Windows x64, macOS arm64 or Linux x64. Each archive includes the compiled
cockpit and its engine sidecar. Release archives and delta manifests have
GitHub/Sigstore provenance signatures; OS publisher certificates are not included.
Every archive is extracted and tested before publication. Its adjacent `.sha256`
file checks download integrity; provenance verification is covered in the guide.
See [the desktop shell guide](docs/shell.mdx) for verification, window restoration,
deep links and delta updates.

## Run locally

Install Git for workspace checkpoints. Use the Bun version pinned in [`.bun-version`](.bun-version). From the repository
root:

```sh
bun install --frozen-lockfile
bun run dev
```

The desktop app starts or attaches to the local engine. Closing the window leaves
its shell commands running; another window can attach to the same engine.
Custom titlebar dragging works on Windows and macOS. Linux uses your desktop's
Move Window action; the limitation is shown in General settings. See
[window behavior and verification](docs/window.mdx).

To run or inspect the engine directly:

```sh
bun run engine
bun run engine:status
```

## Development

| Command | Purpose |
| :--- | :--- |
| `bun run typecheck` | Check TypeScript |
| `bun run test:engine` | Test the engine with SQLite and real daemon processes |
| `bun run test` | Test the UI through the native GPUIX test renderer |
| `bun run test:integration` | Drive a real desktop window and its engine |
| `bun run test:projects` | Verify project, draft and task recovery in real windows |
| `bun run test:settings` | Verify analytics, scratch tasks and daemon access in a real window |
| `bun run screenshot` | Capture desktop UI screenshots |
| `bun run build` | Compile the cockpit and engine sidecar into `dist/` |
| `bun run test:archive` | Verify and test an extracted archive after building and packaging |
| `bun run web:dev` | Bundle and serve the browser preview |
| `bun run web:build` | Check the browser bundle without starting a server |
| `bun run test:web` | Render the Wasm preview and send a demo prompt in headless Chrome |

The engine suite needs no GPU. Native UI tests run on macOS and Windows;
windowed integration tests and screenshots need a desktop session. The browser
preview works with the published GPUIX Wasm renderer and uses demo conversations;
it does not start the daemon or run models, shell commands or workspace operations.
Native dragging and window controls are disabled. Open `http://127.0.0.1:4173`
after starting `web:dev`. The server supplies the cross-origin isolation headers
required by Wasm shared memory. The browser test uses an isolated Chrome profile;
set `HIROSHI_CHROME` to override the executable path.

On Windows, run automated commands through the resource guard, which monitors
system RAM and caps the entire child process tree. For example:

```powershell
& ./scripts/run-guarded.ps1 -Executable (Get-Command bun.exe).Source -Arguments @('run','test:web') -MaxProcesses 12 -MemoryMB 3072 -TimeoutSeconds 75
```

See [development](docs/development.mdx) for integration coverage and resource limits.

## Local data

| Platform | Default directory |
| :--- | :--- |
| Windows | `%LOCALAPPDATA%\Hiroshi` |
| macOS | `~/Library/Application Support/Hiroshi` |
| Linux | `$XDG_STATE_HOME/hiroshi`, or `~/.local/state/hiroshi` |

Set `HIROSHI_HOME` to use another directory. It contains `engine.db`, the discovery
file `engine.json`, the startup lock `engine.lock` and `logs/engine.log`.
The desktop also keeps unsent drafts and unconfirmed sends in `composer.db`.
Drafts belong to one task and workspace. Input stays saved until the engine
acknowledges admission; newer edits remain in the composer. After a connection
failure, use **Retry saved send** to check the original operation without sending
it twice. Reopening or reconnecting never automatically submits saved input.
**Forget saved send** removes the local retry record but cannot recall a prompt
already admitted by the engine. **Discard draft** explicitly clears unsent text.

The daemon shares one execution budget across sessions: two active operations,
64 queued operations, a 60-second admission deadline and a two-minute execution
deadline by default. It checks free RAM before admission and while work runs.
Queued work and its reason appear in the cockpit. Configure limits in
`execution.json` in the data directory; see [execution limits](docs/engine.mdx#execution-limits)
for process containment and platform guarantees.

## Documentation and releases

The [documentation source](docs/) is a Mintlify project. To preview it with the
Mintlify CLI installed:

```sh
cd docs
mint dev
```

Hiroshi uses `0.MINOR.PATCH` releases while the shell and application surface
stabilize. The current version is in [`package.json`](package.json); release
notes are in [the changelog](CHANGELOG.md).
