# Manual Smoke Run Sheet — Headless Release (Windows 11 / PowerShell)

Companion to [`manual-smoke-headless.md`](./manual-smoke-headless.md). The checklist is platform-agnostic; this file is the concrete command sequence for executing it on **Windows 11 with PowerShell 7**. Reusable across headless point releases (`v0.1.x`, `v0.2.0`, …) — substitute the version under test wherever `v0.1.0` is referenced below.

Assumes the four connectors `google_drive`, `google_gmail`, `google_photos`, and `github` are authenticated. HITL triggers in §1.3 and §2.8 use Gmail and GitHub. On a different connector mix, swap to whatever HITL-gated write tool you have available — the gating behavior is connector-agnostic.

The Tauri desktop sections (1, 2, 3 of the original checklist) moved to [`manual-smoke-desktop.md`](./manual-smoke-desktop.md) and gate the future `desktop-v0.1.0` tag, not the headless tags.

---

## §0. Preconditions (one-time setup)

```powershell
# 0.1 Confirm gateway + connectors are up
nimbus start
nimbus status
nimbus connector list
# verify: 4 connectors, all 'healthy'

# 0.2 Pause one connector to exercise the degraded Connector Health pane
nimbus connector pause google_photos
nimbus connector list
# verify: google_photos shows non-healthy

# 0.3 Note the canonical Windows log dir (hardcoded in paths.ts:33-37)
$logDir = Join-Path $env:LOCALAPPDATA 'Nimbus\data\logs'
Get-ChildItem $logDir

# 0.4 [SKIP] No backup file is needed for the trimmed v0.1.0 smoke — the
# Data panel import/export tests moved to manual-smoke-desktop.md.
#
# DO NOT run `nimbus data export` here today: it deadlocks waiting for HITL
# consent because the CLI does not register a consent handler. (BUG-002 in
# the v0.1.0 smoke run; verify it has been fixed in the build under test.)
```

> **Note on `diag --json`:** the current build wraps JSON output with an ANSI banner header (`T  Nimbus`) and a `Done.` footer, which breaks `ConvertFrom-Json`. Banner-stripping idiom:
>
> ```powershell
> $raw  = (& nimbus diag --json) -join "`n"
> $json = $raw.Substring($raw.IndexOf('{'), $raw.LastIndexOf('}') - $raw.IndexOf('{') + 1) | ConvertFrom-Json
> ```
>
> Top-level keys: `gateway`, `connectorHealth`, `hitl`, `index`, `watchers`, `auditLogTail`. There is no `paths` key — use the hardcoded `$logDir` from §0.3.

---

## §1. Rich TUI (WS6)

### 1.1 Launch

```powershell
nimbus tui
# verify: 5-pane layout (Query / ResultStream / ConnectorHealth / Watchers / SubTask)
# verify: google_photos shows degraded in ConnectorHealth pane
# verify: no stack traces

# In a second PowerShell window:
$log = Join-Path $env:LOCALAPPDATA "Nimbus\data\logs\cli-$(Get-Date -Format yyyy-MM-dd).log"
Select-String 'cli.invoke' $log | Select-Object -Last 1
Select-String '\x1b\[' $log
# first should match a row with argv=["nimbus","tui"]
# second should return zero hits (no raw ANSI in the log file)
```

### 1.2 Streaming (inside TUI)

Type at the `nimbus>` prompt:

```
summarize the last 100 commits across my github repos
```

Verify: tokens flow continuously, prior `nimbus> ...` line does not redraw, the next prompt is usable when streaming finishes.

### 1.3 Inline HITL (inside TUI)

Type:

```
draft a gmail to my own address summarising what I did this week
```

Verify: `--[ consent required ]--` banner appears mid-stream, prompt becomes `nimbus[hitl]>` with the `[a]pprove [r]eject [d]etails [q]uit` hint. Press `r` to reject. Outcome line `rejected all` flushes into static.

If `gmail.draft.create` is not gated on your config, substitute and reject:

```
open a github issue titled "smoke-test" in <your-test-repo>
```

Quit the TUI (Ctrl+C twice) before the next subsection.

### 1.4 Unsuitable-terminal fallback

Each command prints the fallback notice and drops to the Phase 3 REPL; verify the terminal is sane after exit.

```powershell
$env:TERM='dumb'; nimbus tui; Remove-Item Env:TERM
$env:NO_COLOR='1'; nimbus tui; Remove-Item Env:NO_COLOR
cmd /c "nimbus tui < NUL"
$env:CI='true'; nimbus tui; Remove-Item Env:CI

# Force <20 rows then restore
mode con cols=120 lines=10
nimbus tui
mode con cols=120 lines=40
```

> PowerShell `$null` redirection does not produce a closed stdin handle on Windows; `cmd /c "... < NUL"` does.
> `mode con` is the cmd-shell tool that resizes Windows Terminal for real. `[Console]::WindowHeight = 10` only changes the buffer view, not the OS-reported size, and Ink reads the OS size.

### 1.5 Gateway death

```powershell
# Terminal A
nimbus tui

# Terminal B (within 30s)
nimbus stop
# in Terminal A: disconnect banner appears, input dimmed, '(stale)' on poll panes

nimbus start
# in Terminal A: 'Reconnected' fade, input re-enables
```

### 1.6 Layout adaptation

```powershell
mode con cols=80  lines=40   # narrow, single-column collapse
mode con cols=120 lines=40   # wide, 5-pane restored
mode con cols=120 lines=10   # short, one-line notice, Ink unmounts, exit code 0
mode con cols=120 lines=40   # restore
```

### 1.7 Cancel semantics (inside TUI)

```
summarize every commit, PR, and email I touched in the last 30 days
```

While tokens stream:

- Press Ctrl+C once. State flips to idle, `(canceled by user — LLM may continue in the background)` appended, `^C Press again within 2s to exit` hint visible ~1.5s.
- Press Ctrl+C again within 2s. Clean exit.

Relaunch `nimbus tui`, at idle press Ctrl+C once, hint visible. Ctrl+C again, exit.

### 1.8 Signal handling

Skip on Windows. The smoke checklist explicitly limits this to Linux + macOS. Windows SIGINT is covered by §1.7.

### 1.9 Paste safety (inside TUI)

Paste this 5-paragraph block (~2 KB) into `QueryInput`:

```
Paragraph one. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.

Paragraph two. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.

Paragraph three. Sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio.

Paragraph four. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.

Paragraph five. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit.
```

Verify: input stays single-line with horizontal scroll, right-column panes do not shift, Enter submits the full text, the `ResultStream` echo line shows the full paste.

### 1.10 Low-color readability

```powershell
$env:TERM='xterm'; nimbus tui; Remove-Item Env:TERM
```

Verify the health glyphs and yellow banners are still readable.

---

## §2. VS Code extension (WS7)

Ensure the gateway is running:

```powershell
nimbus start
```

### 2.1 Install (Marketplace, VS Code)

VS Code → Extensions → search `Nimbus` → install `nimbus-agent.nimbus-vscode`. Verify icon, publisher, version.

### 2.2 Install (Open VSX, Cursor)

In Cursor → Extensions → search `Nimbus`. Verify it is found via Open VSX and installs cleanly.

### 2.3 Activation + status bar

- Launch VS Code → View → Output → `Nimbus` channel exists.
- Status bar shows `connecting...` then `connected`.

```powershell
nimbus stop
# status bar flips to 'disconnected'
```

In VS Code Settings, set `nimbus.autoStartGateway = true`, then run any Nimbus command.

- Verify the extension auto-spawns `nimbus start` and reconnects.

### 2.4 `Nimbus: Ask` end-to-end

`F1` (or Ctrl+Shift+P) → `Nimbus: Ask` → enter `Summarize the README`. Verify chat panel opens beside editor, tokens stream, markdown renders progressively, **Stop** button toggles enabled/disabled with state.

### 2.5 Selection commands

In any open file:

- Make no selection → `Nimbus: Ask About Selection` → verify error.
- Select a function → `Nimbus: Ask About Selection` → enter prefix → verify selected text is appended.
- Select again → `Nimbus: Search Selection` → verify Quick Pick opens (delegates to `Nimbus: Search`).

### 2.6 `Nimbus: Search`

`F1` → `Nimbus: Search` → enter `pull request`. Verify Quick Pick lists results with title / service / url.

### 2.7 `Nimbus: New Conversation`

`F1` → `Nimbus: New Conversation`. Verify chat panel resets. Issue a new `Nimbus: Ask` and verify it starts a fresh sessionId (check Output channel).

### 2.8 Inline HITL

In the focused chat panel, ask:

```
open a github issue titled "smoke-test-vscode" in <your-test-repo>
```

- Panel focused: inline card with prompt + Approve + Reject. Press Reject. Card collapses to "Decision recorded: rejected".
- Switch to another VS Code panel before the next ask, then trigger another HITL action. Verify VS Code information-message toast with Approve / Reject.
- Trigger one more, then close the chat panel mid-flight. Verify no extension hang.

### 2.9 Settings reactivity

VS Code Settings:

- Change `nimbus.statusBarPollMs` (e.g. 2000 → 5000). Verify status bar repaints without reload.
- Change `nimbus.askAgent` (e.g. `default` → another agent). Run `Nimbus: Ask`. In the Output channel verify the new `agent` value in the streamed request.

### 2.10 Output channel + logs

`F1` → `Nimbus: Open Logs`. Verify the Nimbus output channel reveals. Toggle `nimbus.logLevel` between `info` and `debug` and verify verbosity changes on the next request.

---

## §3. Cleanup

```powershell
# Restore paused connector
nimbus connector unpause google_photos

# Reset any settings toggled in VS Code (autoStartGateway, statusBarPollMs, askAgent, logLevel)
```

---

## Recording results

Fill in the Results matrix at the bottom of [`manual-smoke-headless.md`](./manual-smoke-headless.md):

| Platform | 1. TUI | 2. VS Code |
|---|---|---|
| Windows 11 | / | / |

Legend: passed / blocked (link issue) / passed-with-caveat (describe inline). A blocker in either column blocks the `v0.1.0` (or `vscode-v0.1.0`) tag. Link an issue, do not flip.
