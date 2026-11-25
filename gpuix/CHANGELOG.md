# Changelog

All notable changes to Morsel GPUIX are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [semantic versioning](https://semver.org/).

## Versioning

`0.MINOR.PATCH`

- Independent versioning for GPUIX starting from 0.1.0.
- Each milestone delivers a concrete feature parity slice towards full parity with the Tauri version.

## [0.1.0] - 2026-11-09

### Added
- Integrated GPUIX desktop app into Morsel repository under `gpuix/`.
- Reorganized repository into `tauri/` and `gpuix/` packages with root monorepo orchestration.
- GPUIX shell parity with custom transparent titlebar, Win32 window dragging, maximize/restore, multi-file workspace explorer, editor tabs, command palette, and island chrome styling.
- Added `EditorWorkspace` component with multi-tab buffer management, syntax highlighted code viewer with line numbers, status bar, and scratchpad creation.


- Bounded user/workspace configuration, scoped repository instructions and
  effective-setting provenance in the task's context history.
- Write-time instruction checks, durable hashes across restart and explicit
  native CLI scope limitations without duplicate workspace injection.
- Provider, tool, daemon and native window coverage for configuration precedence,
  scope changes, policy denial, malformed files and recovery.

## [0.26.0]

### Added

- Desktop internet-access toggle, setup/reconnect status, HTTPS address copy,
  explicit retry and internet/LAN pairing selection that hides unavailable codes.
- `pair --remote` with bounded readiness waiting and machine-readable invitations,
  plus internet status, enable, retry and disable CLI commands.
- Native controls and opt-in real source/packaged window tests against the hosted
  HTTPS service, including screenshot QR decoding, session access and revocation.
- Extended hosted acceptance for two device credentials, durable event recovery,
  daemon crash/restart, token rotation and disable, plus an independent-network
  read-only check and isolation guards for live probe data directories.

## [0.25.0]

### Added

- Opt-in daemon-managed OpenTunnel lifecycle and private internet management API,
  with a dedicated authenticated gateway and internet-ready pairing invitations.
- Isolated persistent tunnel identity, cancellation, reconnect status, explicit
  retry and a bounded hosted-service verification probe.

### Changed

- Pin Bun 1.4.2 for the tunnel SDK's supported runtime and compiled sidecars.

## [0.24.0]

### Added

- Single-use daemon invitations with desktop QR codes, copyable links and an
  engine CLI pairing command, plus independently revocable device credentials.
- Versioned remote connection metadata and a documented HTTP/SSE client contract,
  with integration coverage for restart, replay, revocation and desktop pairing.

## [0.23.0]

### Added

- Installed-skill discovery with searchable source filters, scope and file
  metadata, Markdown details, persistent enablement and real desktop file actions.
- Explicit skill invocation through task instructions, linked-installation
  deduplication and confirmed reversible removal without deleting link targets.

## [0.22.0]

### Added

- Task-scoped Supervised, Auto-accept edits, Auto and Full access controls with
  durable selection, policy precedence and execution-time revocation checks.
- Bounded AI review of routine workspace file actions, durable decision evidence
  and usage accounting. Failed/interrupted reviews request operator approval.

## [0.21.0]

### Added

- Task-owned native conversations for the four response CLI adapters, with
  durable executable/model/profile/workspace bindings and explicit resume IDs.
- Deliberate fresh-conversation recovery for interrupted submissions, changed
  bindings, rewinds, expired sessions and legacy stateless history. Queued work
  waits for recovery; a reconnect never replays an uncertain CLI request.
- Crash-boundary integration coverage, including finalizing a recorded successful
  answer exactly once after a database failure without invoking the CLI again.

## [0.20.0]

### Added

- Usage analytics across Hiroshi tasks with UTC date windows, daily/monthly/project
  charts, cache and reasoning metrics, model/day breakdowns, and explicit model
  rates. Preserve unknown costs and distinguish reported costs from estimates.
- Bounded, read-only import of available agent usage histories, excluding sessions
  already recorded through Hiroshi. Show missing, unsupported and partial coverage.
- Opt-in daemon network access with a separate credential, exact browser origins,
  persistent port settings, token reveal/copy/rotation and local-only administration.
  Listener changes leave the private engine and running tasks alive.
- Searchable project menus in the greeting and footer, plus isolated managed scratch
  tasks for work without a project. Retain task/draft and unavailable-folder recovery.
- Real daemon and native integration coverage for accounting, import edge cases,
  network security and persistence, scratch isolation and complete settings flows in
  source and packaged windows, with bounded process and RAM usage.

## [0.19.0] - Unreleased

### Added

- Save drafts per task and workspace in a local durable outbox before sending.
  Restore input after task/project switches and window restarts, including when
  the selected engine cannot start.
- Show unconfirmed or rejected sends with deliberate retry and forget actions.
  Retry the original text, model, delivery mode and key so lost acknowledgements
  cannot execute a prompt twice. Clear input only after durable acknowledgement
  and preserve newer edits, including edits from another window.
- Cover offline admission, lost acknowledgements, daemon restart, storage failure,
  stale-window edits and native draft recovery with integration tests. Run native
  test files sequentially to bound worker memory and GPU contexts.

## [0.18.3] - Unreleased

### Fixed

- Accept current Grok command-list and usage metadata during response streams
  and recognize both supported successful turn markers. Keep metadata and
  private thinking out of conversation history, and reject unsupported activity.
- Record terminal Grok token usage once, with regression coverage for streamed
  replies and durable history across daemon restarts.

## [0.18.2] - Unreleased

### Fixed

- Keep daemon discovery, RPC, feed and shutdown on direct loopback connections
  even when an HTTP proxy is inherited. External proxy settings stay intact.
- Preserve discovery records and startup locks owned by live daemons; an
  unreachable health endpoint cannot cause replacement database writers.
- Stop automatic startup retries after failure. Show the failure until the
  user retries, and wait for a competing startup within a bounded deadline.

## [0.18.1] - Unreleased

### Fixed

- Show the Windows app window when launched through `bun dev` or the packaged
  launcher, even when the parent suppresses console windows. Startup visibility
  handling preserves subsequent minimize actions and checks window ownership.
- Launch smoke tests now check actual OS visibility for both entry paths.

## [0.18.0] - Unreleased

### Changed

- Match the compact Providers layout: one grouped panel, vector agent marks,
  version/path metadata, observed status, switches and expandable setup rows.
- Shared model picker with a provider rail, search, keyboard selection and
  persisted favorites. Keep settings and composer on the real engine catalog.

## [0.17.0] - Unreleased

### Added

- Real project opening through the native folder picker or an absolute path,
  recent project history, and per-project task/panel restoration.
- Canonical workspace identity bound to each task. Missing, inaccessible or
  replaced folders keep their histories and reject effects; queued commands,
  tools, model requests and checkpoints revalidate the original directory.
- Two-repository CLI/instruction isolation and native project-switching checks.
  Protocol 13 and schema migration 9.

## [0.16.0] - Unreleased

### Added

- Real Providers settings for Agy, Cursor Agent, Pi and Grok: bounded metadata
  discovery, observed status, cancellation and manual executable paths.
- Durable enabled/default selections and explicit Cursor workspace trust,
  shared by Settings and the composer across windows. Changed executables keep
  old selections visibly unavailable rather than redirecting requests.
- Response-only Pi and Grok adapters with explicit tool restrictions and
  terminal-result validation. Unknown account/model access remains unknown.
  Engine-to-native-window integration coverage; protocol 12.

## [0.15.0] - Unreleased

### Added

- Response-only CLI adapters for Agy and Cursor Agent with bounded NDJSON
  streaming, stdin prompts, durable vendor session identifiers, explicit
  completion/error handling and cancellation of the complete process tree.
- Cursor uses read-only Ask mode. Agy requires strict tool permissions and
  explicit side-effect denials; plan mode alone is not a write barrier.
- Catalog and composer identify response-only operation. CLI submissions are
  never automatically retried or replayed after admission. Protocol 11.

## [0.14.0] - Unreleased

### Added

- One engine execution budget across sessions for model requests, tools,
  commands and workspace maintenance. Durable admission records, bounded
  queues, deadlines, cancellation and a monitored free RAM floor.
- Windows Job Objects contain command descendants before user code starts,
  enforce process and committed-memory ceilings, and clean up on engine exit.
  POSIX commands use process groups with sampled RSS/process limits.
- Cockpit queue reasons and daemon limit facts; restart resumes only commands
  that never acquired an execution claim. Protocol 10 and schema migration 8.

## [0.13.0] - 2026-10-24

### Added

- Native macOS titlebar dragging through AppKit's window tracking loop. Retain
  and validate the original press, consume it once, and queue tracking on the
  main thread without blocking JavaScript. Preserve native traffic lights and
  existing double-click zoom behavior.
- Build the macOS helper automatically before local development. Cover the
  native bridge in macOS CI and all four titlebar regions in GPU hit tests.
- An explicit Linux notice in General settings: custom titlebar dragging remains
  unavailable; use the desktop's Move Window action. Windows dragging is unchanged.

## [0.12.2] - 2026-10-24

### Fixed

- Verify download archives after extraction on Windows, macOS and Linux: check
  checksums, exact payloads, manifest/file hashes, executable permissions and
  release versions, then run the extracted cockpit and its engine sidecar from
  an isolated directory.
- Reject publication before creating a draft if any platform archive, checksum,
  manifest or new delta chunk is missing or corrupt. Publish only verified files.
- Exercise the complete three-platform publication inputs in PR CI without
  making GitHub release changes.

## [0.12.1] - 2026-10-24

### Fixed

- Remove the unreachable legacy swarm cockpit, unused mock data, icons and mail
  images, and the obsolete animation script. Documentation describes the current
  engine-backed cockpit and no longer advertises the removed inspector panel.
- Mount the browser preview explicitly and replace native window FFI with browser
  adapters. Verify Wasm rendering and composer interaction in isolated Chrome.
- Update the screenshot harness to current controls and isolate its engine data.

## [0.12.0] - 2026-10-24

### Added

- A packaged shell with a compiled engine sidecar and embedded GPUIX binding.
  A window watchdog replaces crashed or stalled windows without killing runs.
- Local window size, display placement, selected session and open surface
  preferences. Windows/macOS restore normal bounds and maximize state; Linux
  restores size/layout while the compositor owns placement.
- Validated `hiroshi://session/<id>?file=relative/path&line=1` links, with
  per-user scheme registration and macOS URL event handling.
- Release builds for Windows x64, macOS arm64 and Linux x64, checksum archives
  and GitHub/Sigstore provenance signatures. Publisher OS certificates and
  notarization are not included.
- Verified, chunk-based delta staging through `hiroshi --update <version>`;
  unchanged chunks stay local, and running files/engine processes stay intact.

### Changed

- Both engine release version and protocol are checked before attachment.
- `bun run build` builds the cockpit and sidecar together. The packaged
  launcher supervises its window; source hot-reload keeps the direct dev entry.

## [0.11.0] - 2026-10-23

### Added

- Engine-ordered transcript facts: streaming answers and reasoning, tool requests
  and results, retries, permissions, context boundaries and command lifecycle.
  Snapshots and live feeds share one projection, including after reconnect/rewind.
- Real session sidebar, turn count and run phase in the header. The composer
  shows Send while idle, Queue while busy, or Steer for the next safe boundary.
- Session Usage from durable provider token counters, including attempts and
  archived turns. Missing counters and cost remain explicitly unreported.
- Two-client daemon integration for both provider adapters, two actual desktop
  windows, native composer/usage tests and persistence checks.

### Removed

- The Inspector panel, its toggle and resize state. Run status stays in the header.
- Template threads, workspace selections and unsupported composer controls from
  the engine-connected cockpit.

## [0.10.0] - 2026-10-23

### Added

- Engine-backed workspace surfaces replace sample files, review totals and browser
  content. Files reads bounded directory/file previews and displays real Git
  markers. The model's `list_files` tool shares the directory reader.
- Review resolves a branch merge base and renders actual committed, staged,
  unstaged and untracked changes with explicit preview limits.
- Commit/push lists the same Git changes, previews staged-only or complete pending
  patches, rejects stale reviews and starts durable Git runs. Literal argument
  execution preserves commit messages and surfaces real output and failures.
- The native page-reader pane loads bounded HTML/text from HTTP/HTTPS URLs,
  follows safe links and keeps back/forward history across surface switches.
  JavaScript, CSS layouts, forms and login cookies are explicitly unsupported.
- Model-requested shell calls and their actual results appear in Terminal.
  Surface/environment menus use deferred layers above filled workspace panes.
- Real Git/daemon, HTTP fixture, native renderer and desktop-window integration
  coverage for file changes, staged selection, commit/push, terminal tool output
  and browser navigation. The typed protocol is version 8.

## [0.9.0] - 2026-10-23

### Added

- Pre-prompt checkpoints commit workspace Git trees and exact active message ids
  at inbox delivery. A private Git database and hidden refs preserve unignored
  content without changing the user's HEAD or staging index.
- Cockpit checkpoint controls rewind files and conversation together, save the
  current state first, retain archived history and expose recovery retries.
- Durable rewind journals recover partially applied file plans before work
  resumes. Unexpected later edits and ignored obstructions are preserved;
  overlapping workspace work stays blocked until recovery completes.
- Active model history and compaction follow the restored branch. Rewinds are
  transcript facts; archived messages and prior events remain durable. Pending
  prompts are cancelled rather than silently executed after a rewind.
- Real Git/daemon integration tests cover index isolation, binary/CRLF content,
  directory transitions, two clients, continued model history and crash recovery.
  Native and actual-window tests restore files and chat, inspect old history and
  reopen the cockpit. Protocol version 7 ships with an additive migration.

## [0.8.0] - 2026-10-23

### Added

- One schema-validated tool registry for built-ins and extension runners; the
  newest registration of a name wins. Built-ins read and atomically write
  workspace files and run cancellable shell commands.
- Durable allow/ask/deny permission gates, cockpit answers and exact-request
  saved decisions. Repository denials override user grants; always-ask policy
  requires a fresh answer. Policy is checked again before execution.
- Linked tool requests and result messages, with each model continuation recorded
  as a separate step. Claimed effects are never replayed after a restart.
- Bounded result previews with explicit truncation markers and complete managed
  output files that open in the cockpit. Protocol version 6 and additive storage
  migration preserve earlier transcripts without executing historical requests.
- Real-daemon integration tests for both provider protocols, restart during an
  approval, denial, reasoning-state continuation and megabyte output retrieval.
  Native and real-window tests exercise approval, denial, remember and output UI.

## [0.7.0] - 2026-10-23

### Added

- Configured provider adapters for OpenAI Responses and Anthropic Messages, with
  a normalized engine model catalog. The cockpit's picker reads the catalog and
  sends the selected identity with each admitted prompt.
- Local `providers.json` configuration references credential environment
  variables. Provider policy is independent of credentials; the last matching
  allow/deny rule wins. Denials remain visible and never contact the provider.
- Streaming text now reaches the main transcript. Reasoning summaries and tool
  request deltas are bounded durable parts, carried by snapshots and the feed.
  Tool requests are displayed without execution; the permission gate comes next.
- Recovery treats reasoning and tool parts as output, preventing duplicate calls
  after a crash before text arrives. Streams require terminal completion events;
  provider error messages never copy remote error prose or credentials.
- HTTP fixture and real-daemon integration tests cover both adapters, partial
  feed delivery, catalog identities, policy, credentials, cancellation and crash
  recovery. The protocol is version 5 with an additive database migration.

## [0.6.0] - 2026-10-23

### Added

- Active context budgeting before every provider attempt: model window, reserved
  output, message framing, instructions and tool definitions all count. A
  conservative UTF-8 byte estimate works without a provider tokenizer.
- Durable compaction boundaries rebuild active history from a bounded extractive
  summary and recent complete turns. The newest prompt and system messages stay
  intact. The full transcript is never edited or deleted.
- A provider `context_overflow` before output rebuilds the same step once. A
  second overflow, an irreducible request, or overflow after output fails clearly.
  The recovery boundary survives a restart, so restarting cannot reset the limit.
- Instruction sources are values, reloaded each attempt. The context ledger
  records SHA-256 hashes and changed source names, including removals, rather
  than rendered instruction prose. Workspace `AGENTS.md` is the default source.
- The Terminal's context viewer shows budget usage, source changes, all original
  messages and the summaries at their boundaries. Snapshots and feed replay
  carry the same records. The protocol is version 4.
- Compaction can be disabled with `--no-compaction` or `HIROSHI_COMPACTION=off`.

## [0.5.0] - 2026-10-23

### Added

- **The step.** A delivered prompt now starts one model call, durable before it
  streams: `step.started` commits the provider, the model, attempt 1 and the
  daemon's pid as the claim, `step.output` carries the bounded text as it
  arrives, and `step.completed` writes the assistant message and releases the
  claim in the same transaction. A unique index keeps one step per prompt.
- **Narrow retries, visible.** A retryable provider failure (a rate limit, a
  transport failure with no output) increments `attempt` on the same row and
  records `step.retry` with the delay, up to three attempts with jittered
  exponential backoff. A stream that dies after producing text is failed with
  the text kept and is never replayed, so an answer cannot be duplicated.
- **Crash recovery for a step.** On startup a claimed step with no output
  continues as its next attempt with the same id (`step.resumed`). A claimed
  step that had produced output fails with `engine_restart_mid_stream` instead
  of being re-run. A graceful shutdown writes no ending, so the claim survives
  for the next start; an operator's interrupt writes `step.cancelled` with the
  reason.
- **Runs are tool calls.** `run.started` commits the run and its `shell`
  `ToolCall` before the process exists, and `run.ended` ends both with the exit
  code and a reason. `Run` grew an `error` field; a run that was still going
  when the engine died ends `interrupted` on both records with the reason, and
  is never replayed.
- **A provider seam.** The engine owns the step and knows nothing about how
  tokens arrive. The built-in `local` provider is deterministic and needs no
  credentials; `--provider-delay <ms>` (or `HIROSHI_PROVIDER_DELAY_MS`) holds
  each chunk for watching a stream or reproducing a crash mid-step.
- The inbox boundary now covers steps as well as runs: a prompt waits while
  either is in flight, so the answer to the prompt already streaming comes
  before the prompt that arrived during it. The interrupt cancels the step
  first and then the runs, and may start the next step at the boundary it
  creates.
- The Terminal surface draws the latest step: provider, model, status, attempt
  and the first line of its answer or its failure. The inbox's delivered count
  now counts operator turns only, not the assistant replies.
- The protocol is version 3. `SessionDetail` carries `steps` and `toolCalls`,
  the event union carries the seven step events and the tool call on the run
  events, `MessageRole` gains `assistant`, and `interrupt` answers
  `{ runs, steps }`.

## [0.4.0] - 2026-10-22

### Added

- The protocol: one shape module. `engine/src/protocol.ts` now holds the
  operations table and the event union, and the cockpit's client is generated
  from that table: no command hand writes a path or a `fetch`, and the daemon
  routes on the same rows. `EventPayloads` replaced the `data: unknown` event
  bodies, so the store checks every payload it records and the reducer reads
  each event without a cast, failing to compile when an event has no
  projection.
- `bun run test:integration`: the windowed integration test. It starts the app
  as a real process, drives the real window to the Terminal surface, runs a
  command through it, and then closes the window while a second command is
  still going: that one has to finish, succeeded, with its output in the
  daemon's durable log. Nothing in the in-process suite can prove that.
- `.github/workflows/integration.yml`: runs the windowed test on
  `windows-latest`, where a hosted runner has the desktop session a window
  needs, with a deadline of its own so a window that never opens fails in
  minutes instead of hanging.
- The feed is one hub, not one subscription per window: each event is encoded
  once and the same bytes go to every connection, and each connection has its
  own bounded queue. A window that stops reading loses its connection with an
  `overflow` frame and nothing else; the run and the other windows carry on.
- Every feed connection opens with a `hello` frame carrying the durable edge
  (`lastSeq`), replays the gap to that edge a page at a time as the socket asks
  for frames, then follows live. A log that ends behind the watermark a client
  asked from is a typed `feed_behind` error rather than a feed that waits
  forever, and an idle connection gets a heartbeat.
- Sessions have an inbox. A prompt is admitted to it as a durable fact before
  anything can see it, then delivered to the transcript at a safe boundary: the
  end of a run, which is the engine's only step for now. `steer` is delivered
  ahead of `queue` at the same boundary and never stops the run it is steered
  past. A retry is a no-op through the client's idempotency key, an interrupt
  stops every run in the session with a reason and keeps the queue intact, and
  a prompt left pending by a crash is delivered on the next start. The terminal
  surface shows the pending input, both modes and an interrupt action.
  `prompt` now answers `{ item, message }` (`message` is `null` while the item
  waits), `POST /v1/sessions/:id/interrupt` is new, and the protocol is
  version 2.

### Fixed

- A replay longer than 2000 events was silently cut short. `eventsSince` no
  longer has a default limit: the caller either asks for everything or names a
  page and pages to its watermark.
- A slow window made every event cost one `JSON.stringify` per connection, and
  the daemon's own stream buffer was the only bound. The queue is now per
  connection and the encoding is once per event.
- The surfaces panel opens at 480 instead of 380, and the resize handle floors
  it at 460. The picker on an empty surface is a 2×2 grid of 196px cards that
  needs 452px before it fits; at 380 the right column was cut off at the panel
  edge. Nothing can drag the panel narrow enough to clip the picker again.

## [0.3.0] - 2026-10-21

### Added

- The engine: a detached local daemon that owns runs. It keeps a SQLite event
  log, exposes HTTP commands and one SSE feed on loopback, and mints a bearer
  token per start in a discovery file with owner-only permissions.
- A run is durable before it has any effect: `run.started` commits before the
  shell spawns, output arrives in batched events, `run.ended` records the exit
  code. A run a crashed daemon died inside is settled as `interrupted` on the
  next start.
- Runs outlive the window. The cockpit spawns the daemon detached with no
  pipes back to it, adopts a daemon another window started, and never kills one
  except from the Restart button.
- The cockpit side of the engine: discovery, a fetch-only client, a pure event
  reducer and a hook that hydrates at a watermark and follows the feed.
- The Terminal surface executes through the engine and draws real output, exit
  codes and truncation. The Daemon settings page shows the process, protocol,
  database and session count, and restarts it.
- `bun run test:engine`, the engine's own suite, and a Linux CI job for it. It
  spawns real daemons and one test starts the engine from a launcher that exits
  immediately to prove the daemon survives the process that started it.
- `docs/engine.mdx`.

## [0.2.0] - 2026-10-21

### Added

- The custom titlebar drags the window. The press records the window and the
  cursor, every move pushes the window by the cursor delta, the release lets
  go. The titlebar regions are the header title, the sidebar strip, the right
  panel strip and the settings strip.
- The maximize button restores the window again, and a double click on the
  titlebar zooms it. The button shows a restore glyph while the window is
  maximized.
- GitHub Actions runs the typecheck and the integration tests on macOS and
  Windows, with the Bun version pinned in `.bun-version`.
- `CHANGELOG.md` and the versioning policy.

### Fixed

- The window never moved when the titlebar was dragged. The OS modal move
  loop (`WM_SYSCOMMAND` with `SC_MOVE|HTCAPTION`) is ignored by the GPUI
  Windows backend, so the app moves the window itself.
- The titlebar press never reached the drag handler. An unfilled in-flow
  `div` gets no GPUI hitbox, so a drag region needs `pointerEvents: 'auto'`.
- The second click on the maximize button did nothing. The native zoom only
  maximizes on Windows, the restore goes through `ShowWindow(SW_RESTORE)`.
- The command palette rows did not follow the pointer. GPUIX has no
  `onHover` prop, the rows use `onMouseEnter`.

### Changed

- `@gpuix/react` moved to the released 0.11.0. 0.10.0 does not export
  `Button`, `Dialog`, `DialogPopup` or `DialogPortal`, so the app could not
  be installed from npm and CI could not typecheck it.
- The integration suite was rewritten against the current cockpit. It
  asserted a swarm UI that the app no longer renders, and all five tests
  failed on a clean checkout.

## [0.1.0] - 2026-10-20

### Added

- The Hiroshi cockpit on GPUIX: the chat transcript, the composer, the
  workspace footer, the conversation sidebar and the inspector.
- A custom titlebar with the window controls, and a transparent native
  titlebar.
- Six settings views, reachable from the sidebar.
- The environment menu, the commit and push modal, and the command palette.
- The right panel with the browser, terminal, files and review surfaces.
- Resizable sidebars and panels.
- The opening, closing, tab switching and row addition and deletion
  animations.
