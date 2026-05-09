# Manual Smoke Checklist — v0.1.0

Run this end-to-end on **every supported platform** before pushing the `vscode-v0.1.0` and `v0.1.0` release tags. Anything blocking is a release-stopper.

`v0.1.0` ships only the headless gateway + CLI binaries and the VS Code extension. The Tauri desktop UI release vehicle was moved out of `v0.1.0` and into Phase 6 (Team) — its smoke checklist lives at [`manual-smoke-desktop.md`](./manual-smoke-desktop.md) and gates the future `desktop-v0.1.0` tag, not this one.

This consolidates the WS6 (Rich TUI) checklist and the WS7 VS Code extension section.

## Test environment

| Platform | Terminal / Shell | Build target |
|---|---|---|
| Windows 11 | Windows Terminal (PowerShell 7) | headless gateway |
| macOS 13+ Apple Silicon | Terminal.app, iTerm2 | headless gateway |
| macOS 13+ Intel | Terminal.app, iTerm2 | headless gateway |
| Ubuntu 24.04+ | gnome-terminal | `.deb` install + headless gateway |
| Fedora 40+ (sanity-only) | gnome-terminal | tarball install |

Each platform runs every section. Record observations inline. Mark blocked items 🚧 with a tracking-issue link; mark passed-with-caveat items ⚠ and describe inline.

## Preconditions

- A clean OS user account (no prior `nimbus.toml`, no prior data dir) — at least one platform should run the **fresh install** path.
- Nimbus Gateway built and installed (`bun run build:release` or platform installer).
- VS Code 1.90+ available on at least one platform; Cursor available on one platform for Open VSX coverage.
- At least two connectors authenticated (e.g. filesystem + GitHub). One should be in a deliberately broken state to exercise the TUI Connector Health pane and the VS Code status bar.

> The Data panel import/export tests moved to [`manual-smoke-desktop.md`](./manual-smoke-desktop.md), so the previous "valid Nimbus backup `.tar.gz`" precondition is no longer needed for the `v0.1.0` smoke.

---

> **Tauri desktop UI sections were extracted to [`manual-smoke-desktop.md`](./manual-smoke-desktop.md).** Sections 1 (App shell + onboarding), 2 (Dashboard + tray + HITL popup), and 3 (Settings panels) gate the future `desktop-v0.1.0` tag and do not block this release.

---

## 1. Rich TUI (WS6)

Each subsection below runs once on Windows + once on each macOS arch + once on each Linux distro listed in the test environment.

### 1.1 Launch

`nimbus start` then `nimbus tui`.

- [x] Ink renders the 5-pane layout at default terminal size.
- [x] No stack traces on stdout/stderr.
- [x] `paths.logDir/cli-<date>.log` records `cli.invoke` with `argv=["nimbus","tui"]`. The log file contains **no raw ANSI escape sequences** (those go to the terminal only).

### 1.2 Streaming

Submit `summarize my week from the last 100 commits` (or any prompt that triggers ≥ 20 s generation).

- [x] Tokens render continuously in `ResultStream` without flicker.
- [x] Prior lines (e.g. the `nimbus> …` entry for this query) **do not re-render** mid-stream — cursor position of prior text stays stable.
- [x] `engine.streamDone` flushes the live buffer into the static block; the next `nimbus>` prompt is immediately usable.

### 1.3 Inline HITL

Submit a query that triggers consent — e.g. `send a summary of my week to slack #general`.

- [x] `──[ consent required ]──` banner appears mid-stream.
- [x] Prompt changes to `nimbus[hitl]>` with the `[a]pprove [r]eject [d]etails [q]uit` hint.
- [x] Pressing `a` advances; for a multi-action batch, `(2 of N)` counter updates.
- [x] Outcome line (`✓ approved all` / `✗ rejected all` / `✓ approved N, ✗ rejected M`) prints and flushes into `<Static>`.
- [x] `consent.respond` is called **once** per batch with the full decisions array.

### 1.4 Unsuitable-terminal fallback

Each variant prints the fallback notice and enters the REPL; terminal is left sane on REPL exit.

- [x] `TERM=dumb nimbus tui`
- [x] `NO_COLOR=1 nimbus tui`
- [x] `nimbus tui < /dev/null` (non-TTY stdin)
- [x] `CI=true nimbus tui`
- [x] `stty rows 10 && nimbus tui` (then `stty rows 40` to restore)

### 1.5 Gateway death

Launch `nimbus tui` in one terminal; `nimbus stop` in another.

- [x] Disconnect banner appears within ≤ 30 s (sub-second during active stream).
- [x] Input dimmed + disabled; Ctrl+C still exits.
- [x] `(stale)` marker on poll-data panes.
- [x] After `nimbus start`: `✓ Reconnected` fade; input re-enables.

### 1.6 Layout adaptation

- [x] Resize below 100 columns → layout collapses to single-column with status bar at the bottom; resize back → 5-pane split restored.
- [x] Resize below 20 rows → one-line notice; Ink unmounts; exit code 0; terminal cursor + colors restored.

### 1.7 Cancel semantics

Submit a long query; when tokens start arriving:

- [x] Single Ctrl+C → state flips to idle; `(canceled by user — LLM may continue in the background)` appended; `^C Press again within 2s to exit` hint visible ~ 1.5 s.
- [x] Second Ctrl+C within 2 s → exits cleanly.
- [x] Relaunch; idle Ctrl+C → hint visible; second Ctrl+C → exit.

### 1.8 Signal handling (Linux + macOS only)

Look up the PID, then in another terminal:

- [x] `kill -INT <pid>` → terminal restored, exit code 130.
- [x] Relaunch; `kill -TERM <pid>` → terminal restored, exit code 143.
- [x] `paths.logDir/cli-<date>.log` flushed in both cases.

(Windows: SIGINT equivalent only via Ctrl+C — covered in §1.7.)

### 1.9 Paste safety

Paste a 5-paragraph prompt (~2 KB with newlines) into `QueryInput`.

- [x] Input does not expand vertically; single-line with horizontal scroll remains visible.
- [x] Right-column panes do not shift or misalign.
- [x] Pressing Enter submits the full content; the `ResultStream` query-echo line shows the full text.

### 1.10 Low-color-terminal readability

`TERM=xterm nimbus tui` (forces 16-color).

- [x] ●/◐/○ glyphs remain visible and distinguishable.
- [x] Yellow banners (disconnect, HITL, cancel hint) render readably.
- [x] `dimColor` text is still distinguishable from normal text.
- [x] If readability is degraded, file a follow-up — do **not** block release.

---

## 2. VS Code extension (WS7)

Run on at least one Windows + one macOS + one Linux platform with VS Code 1.90+. Cursor coverage on one platform via the Open VSX install path.

### 2.1 Install (Marketplace)

- [x] Open VS Code → Extensions → search `Nimbus`.
- [x] The `nimbus-agent.nimbus-vscode` extension appears with the correct icon and publisher.
- [x] Install completes without manual config; VS Code prompts a reload only if needed.
- [x] Extension appears under Installed with the published version.

### 2.2 Install (Open VSX, Cursor)

- [x] Open Cursor → Extensions → search `Nimbus`.
- [x] The `nimbus-agent.nimbus-vscode` extension is found via Open VSX.
- [x] Install completes; the chat side-panel command palette entries appear.

### 2.3 Activation + status bar

- [x] On VS Code launch, the Nimbus output channel registers (View → Output → Nimbus) without spawning a webview yet.
- [x] Status-bar item shows the connection state (`connecting…` → `connected` → `disconnected` on gateway stop).
- [x] When the gateway is unreachable and `nimbus.autoStartGateway` is `true`, the extension spawns `nimbus start` and reconnects; status bar reflects the transition.

### 2.4 `Nimbus: Ask` end-to-end

- [x] Command palette → **Nimbus: Ask** → input box appears.
- [x] Submit `"Summarize the README"` → chat panel opens beside the editor.
- [x] Tokens stream into the assistant turn in the panel; markdown renders progressively.
- [x] After `done`, the streaming class is dropped; further follow-ups in the same panel use the same session.
- [x] **Stop** button is enabled during streaming and disabled at idle; pressing it terminates the iterator.

### 2.5 `Nimbus: Ask About Selection` + `Nimbus: Search Selection`

- [x] With no selection, the command shows an error and exits.
- [x] Select a function in an open file → **Ask About Selection** prompts for a prefix; the selected text is appended and the question is asked.
- [x] **Search Selection** delegates to **Nimbus: Search** (Quick Pick).

### 2.6 `Nimbus: Search`

- [x] **Nimbus: Search** prompts for a query → executes `index.queryItems` against the running gateway.
- [x] Quick Pick lists results with title / service / url; selecting a result is harmless (or opens the URL — current implementation no-ops).

### 2.7 `Nimbus: New Conversation`

- [x] Resets the chat panel to the empty state.
- [x] After **Ask**, the next message starts a fresh sessionId.

### 2.8 Inline HITL

Trigger a consent-gated action from the chat panel (e.g. ask the agent to delete a file).

- [x] When the chat panel is **focused**, the HITL request renders as a card inline (with prompt + Approve + Reject).
- [x] Approve → action proceeds; the card collapses to "Decision recorded: approved".
- [x] Reject → action aborts; the card collapses to "Decision recorded: rejected".
- [x] When the chat panel is **not focused** (or not visible), the HITL request falls back to a VS Code information-message toast with Approve / Reject buttons.
- [x] Closing the chat panel mid-flight resolves any in-flight inline-HITL promise to `undefined` (the gateway-side request is left for the next surface to pick up; no extension hang).

### 2.9 Settings reactivity

- [x] Change `nimbus.socketPath`, `nimbus.autoStartGateway`, or `nimbus.statusBarPollMs` in Settings → status bar repaints without restarting the extension host.
- [x] Change `nimbus.askAgent` → next **Ask** invocation includes the new `agent` value in the streamed request.

### 2.10 Output channel + Open Logs

- [x] **Nimbus: Open Logs** (or status-bar tooltip click in `permission-denied` state) reveals the Nimbus output channel.
- [x] Levels respect `nimbus.logLevel`.

---

## Results matrix

Fill this in as each platform completes. Legend: ✅ passed · 🚧 blocked (link issue) · ⚠ passed with caveat (describe inline).

| Platform | 1. TUI | 2. VS Code |
|---|---|---|
| Windows 11 | ✅ | ✅ |
| macOS Apple Silicon | ✅ | ✅ |
| macOS Intel | ✅ | ✅ |
| Ubuntu 24.04 | ✅ | ✅ |
| Fedora 40 | ✅ | ✅ |

A platform is **release-ready** when every section in its row is ✅ or ⚠ (with the caveat documented). Any 🚧 is a release blocker — link the issue, do not flip.

## Release gate

When every row is ✅/⚠ across the matrix:

1. Push `vscode-v0.1.0` (publishes the VS Code extension to Marketplace + Open VSX + GitHub Release).
2. Push `v0.1.0` (publishes the Gateway + CLI binaries to GitHub Release).

If a regression is found after a tag push, do **not** delete the tag — issue a `v0.1.1` (or `vscode-v0.1.1`) with the fix and a release note describing the rollback path.
