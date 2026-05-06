# Cross-Platform Install Scripts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `install.ps1` (Windows), `install.sh` (macOS + Linux tarball + AppImage), and matching uninstallers, bundled into release artefacts so a fresh user runs **one command** after extracting the tarball and `nimbus --version` works in a new shell — no manual PATH editing, no admin/sudo.

**Architecture:** Pure helper logic (path resolution, marker-block construction) lives in `scripts/install/lib/*.ts` with full unit-test coverage. The `.ps1` and `.sh` wrappers re-implement that same logic in their respective shell layers and are validated end-to-end by per-OS CI smoke jobs. Idempotency is enforced through sentinel comment markers (`# >>> nimbus PATH >>>` / `# <<< nimbus PATH <<<`) so re-runs and uninstalls never touch lines outside the markers.

**Tech Stack:** Bun (TypeScript) for testable helpers; PowerShell 7 for Windows install logic; POSIX sh for macOS + Linux. Uses `[Environment]::SetEnvironmentVariable("PATH", ..., "User")` on Windows (NOT `setx` — see Task 12 for rationale).

**Source spec:** [`docs/superpowers/specs/2026-05-05-v0.1.0-release-readiness-design.md`](../specs/2026-05-05-v0.1.0-release-readiness-design.md) — Workstream B.

---

## File Structure

```
scripts/install/
├── lib/
│   ├── paths.ts            -- pure: resolveInstallDir(platform), resolveBinaryNames()
│   ├── paths.test.ts
│   ├── markers.ts          -- pure: BEGIN/END markers, buildBlock(installDir), stripBlock(content)
│   └── markers.test.ts
├── windows/
│   ├── install.ps1
│   └── uninstall.ps1
├── unix/
│   ├── install.sh
│   └── uninstall.sh
└── README.md
```

Plus:
- `.github/workflows/install-smoke.yml` — new
- Modify `scripts/package-linux-installers.ts` — bundle scripts into AppImage + tarball
- Modify `.github/workflows/release.yml` — bundle scripts into Win/Mac tarballs
- Modify root `README.md` — install section

---

## Task 1: Create `scripts/install/` skeleton

**Files:**
- Create: `scripts/install/lib/paths.ts` (empty stub)
- Create: `scripts/install/lib/markers.ts` (empty stub)
- Create: `scripts/install/lib/paths.test.ts` (empty stub)
- Create: `scripts/install/lib/markers.test.ts` (empty stub)
- Create: `scripts/install/README.md` (one-line placeholder)

- [ ] **Step 1: Create the directory tree and stub files**

```bash
mkdir -p scripts/install/lib scripts/install/windows scripts/install/unix
touch scripts/install/lib/paths.ts scripts/install/lib/paths.test.ts
touch scripts/install/lib/markers.ts scripts/install/lib/markers.test.ts
echo "# Nimbus install scripts" > scripts/install/README.md
```

- [ ] **Step 2: Verify the layout**

Run: `find scripts/install -type f | sort`
Expected: 5 files listed.

- [ ] **Step 3: Commit**

```bash
git add scripts/install/
git commit -m "chore: scaffold scripts/install layout"
```

---

## Task 2: `paths.ts` — failing test for `resolveInstallDir`

**Files:**
- Modify: `scripts/install/lib/paths.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `scripts/install/lib/paths.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { resolveInstallDir } from "./paths.ts";

describe("resolveInstallDir", () => {
  test("windows: %LOCALAPPDATA%\\Programs\\Nimbus\\bin", () => {
    const env = { LOCALAPPDATA: "C:\\Users\\jane\\AppData\\Local" };
    expect(resolveInstallDir("win32", env)).toBe(
      "C:\\Users\\jane\\AppData\\Local\\Programs\\Nimbus\\bin",
    );
  });

  test("windows: throws if LOCALAPPDATA is unset", () => {
    expect(() => resolveInstallDir("win32", {})).toThrow(/LOCALAPPDATA/);
  });

  test("darwin: ~/.local/bin", () => {
    expect(resolveInstallDir("darwin", { HOME: "/Users/jane" })).toBe(
      "/Users/jane/.local/bin",
    );
  });

  test("linux: ~/.local/bin", () => {
    expect(resolveInstallDir("linux", { HOME: "/home/jane" })).toBe(
      "/home/jane/.local/bin",
    );
  });

  test("darwin/linux: throws if HOME is unset", () => {
    expect(() => resolveInstallDir("darwin", {})).toThrow(/HOME/);
  });

  test("unknown platform throws", () => {
    expect(() => resolveInstallDir("aix" as never, { HOME: "/home/x" })).toThrow(
      /unsupported/i,
    );
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `bun test scripts/install/lib/paths.test.ts`
Expected: FAIL with `resolveInstallDir is not a function` (or import error).

---

## Task 3: `paths.ts` — implement `resolveInstallDir`

**Files:**
- Modify: `scripts/install/lib/paths.ts`

- [ ] **Step 1: Write the minimal implementation**

```typescript
export type SupportedPlatform = "win32" | "darwin" | "linux";

export function resolveInstallDir(
  platform: SupportedPlatform,
  env: Record<string, string | undefined>,
): string {
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) {
      throw new Error("LOCALAPPDATA is not set");
    }
    return `${localAppData}\\Programs\\Nimbus\\bin`;
  }
  if (platform === "darwin" || platform === "linux") {
    const home = env.HOME;
    if (!home) {
      throw new Error("HOME is not set");
    }
    return `${home}/.local/bin`;
  }
  throw new Error(`unsupported platform: ${platform}`);
}
```

- [ ] **Step 2: Run the test**

Run: `bun test scripts/install/lib/paths.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 3: Commit**

```bash
git add scripts/install/lib/paths.ts scripts/install/lib/paths.test.ts
git commit -m "feat(install): add resolveInstallDir for win32/darwin/linux"
```

---

## Task 4: `markers.ts` — failing test for marker constants

**Files:**
- Modify: `scripts/install/lib/markers.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `scripts/install/lib/markers.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { BEGIN_MARKER, END_MARKER } from "./markers.ts";

describe("marker constants", () => {
  test("are unique sentinel strings", () => {
    expect(BEGIN_MARKER).toBe("# >>> nimbus PATH >>>");
    expect(END_MARKER).toBe("# <<< nimbus PATH <<<");
    expect(BEGIN_MARKER).not.toBe(END_MARKER);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `bun test scripts/install/lib/markers.test.ts`
Expected: FAIL with import error.

---

## Task 5: `markers.ts` — implement constants

**Files:**
- Modify: `scripts/install/lib/markers.ts`

- [ ] **Step 1: Write minimal implementation**

```typescript
export const BEGIN_MARKER = "# >>> nimbus PATH >>>";
export const END_MARKER = "# <<< nimbus PATH <<<";
```

- [ ] **Step 2: Verify test passes**

Run: `bun test scripts/install/lib/markers.test.ts`
Expected: PASS.

---

## Task 6: `markers.ts` — failing test for `buildMarkerBlock`

**Files:**
- Modify: `scripts/install/lib/markers.test.ts`

- [ ] **Step 1: Add test cases**

Append to `scripts/install/lib/markers.test.ts`:

```typescript
import { buildMarkerBlock } from "./markers.ts";

describe("buildMarkerBlock", () => {
  test("wraps export PATH line with markers", () => {
    const block = buildMarkerBlock("/Users/jane/.local/bin");
    expect(block).toBe(
      "# >>> nimbus PATH >>>\n" +
        'export PATH="/Users/jane/.local/bin:$PATH"\n' +
        "# <<< nimbus PATH <<<",
    );
  });

  test("escapes a path containing spaces by quoting", () => {
    const block = buildMarkerBlock("/Users/jane doe/.local/bin");
    expect(block).toContain('"/Users/jane doe/.local/bin:$PATH"');
  });

  test("rejects a path with a double-quote (defensive)", () => {
    expect(() => buildMarkerBlock('/tmp/"evil')).toThrow(/double-quote/);
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run: `bun test scripts/install/lib/markers.test.ts`
Expected: FAIL with `buildMarkerBlock is not a function`.

---

## Task 7: `markers.ts` — implement `buildMarkerBlock`

**Files:**
- Modify: `scripts/install/lib/markers.ts`

- [ ] **Step 1: Append implementation**

```typescript
export function buildMarkerBlock(installDir: string): string {
  if (installDir.includes('"')) {
    throw new Error("install dir must not contain a double-quote character");
  }
  return [
    BEGIN_MARKER,
    `export PATH="${installDir}:$PATH"`,
    END_MARKER,
  ].join("\n");
}
```

- [ ] **Step 2: Run tests**

Run: `bun test scripts/install/lib/markers.test.ts`
Expected: PASS — 4 tests.

---

## Task 8: `markers.ts` — failing test for `stripMarkerBlock`

**Files:**
- Modify: `scripts/install/lib/markers.test.ts`

- [ ] **Step 1: Add test cases**

Append:

```typescript
import { stripMarkerBlock } from "./markers.ts";

describe("stripMarkerBlock", () => {
  test("removes a single nimbus block, preserves surrounding lines", () => {
    const before = [
      "# user's existing rc",
      'export EDITOR="vim"',
      "",
      "# >>> nimbus PATH >>>",
      'export PATH="/home/x/.local/bin:$PATH"',
      "# <<< nimbus PATH <<<",
      "",
      "alias ll='ls -l'",
    ].join("\n");
    const after = stripMarkerBlock(before);
    expect(after).toBe(
      [
        "# user's existing rc",
        'export EDITOR="vim"',
        "",
        "",
        "alias ll='ls -l'",
      ].join("\n"),
    );
  });

  test("returns the input unchanged when no block is present", () => {
    const input = "# user rc\nexport X=1";
    expect(stripMarkerBlock(input)).toBe(input);
  });

  test("removes only the first block when (defensively) multiple exist", () => {
    const input = [
      "# >>> nimbus PATH >>>",
      'export PATH="/a:$PATH"',
      "# <<< nimbus PATH <<<",
      "echo middle",
      "# >>> nimbus PATH >>>",
      'export PATH="/b:$PATH"',
      "# <<< nimbus PATH <<<",
    ].join("\n");
    const out = stripMarkerBlock(input);
    expect(out).toBe(
      [
        "echo middle",
        "# >>> nimbus PATH >>>",
        'export PATH="/b:$PATH"',
        "# <<< nimbus PATH <<<",
      ].join("\n"),
    );
  });

  test("preserves trailing newline if input had one", () => {
    const input =
      "alpha\n# >>> nimbus PATH >>>\nx\n# <<< nimbus PATH <<<\nomega\n";
    expect(stripMarkerBlock(input)).toBe("alpha\nomega\n");
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run: `bun test scripts/install/lib/markers.test.ts`
Expected: FAIL with `stripMarkerBlock is not a function`.

---

## Task 9: `markers.ts` — implement `stripMarkerBlock`

**Files:**
- Modify: `scripts/install/lib/markers.ts`

- [ ] **Step 1: Append implementation**

```typescript
export function stripMarkerBlock(content: string): string {
  const beginIndex = content.indexOf(BEGIN_MARKER);
  if (beginIndex === -1) {
    return content;
  }
  const endIndex = content.indexOf(END_MARKER, beginIndex);
  if (endIndex === -1) {
    return content;
  }
  // Cut from the line containing BEGIN through the line containing END (inclusive).
  // Find the start of the BEGIN line:
  const beginLineStart = content.lastIndexOf("\n", beginIndex - 1) + 1;
  // Find the end of the END line:
  const endLineEnd = content.indexOf("\n", endIndex + END_MARKER.length);
  const cutEnd = endLineEnd === -1 ? content.length : endLineEnd + 1;
  return content.slice(0, beginLineStart) + content.slice(cutEnd);
}
```

- [ ] **Step 2: Run tests**

Run: `bun test scripts/install/lib/markers.test.ts`
Expected: PASS — 8 tests across both describe blocks.

- [ ] **Step 3: Coverage check**

Run: `bun test --coverage scripts/install/lib/`
Expected: ≥ 80% line coverage on `paths.ts` and `markers.ts`.

- [ ] **Step 4: Commit**

```bash
git add scripts/install/lib/markers.ts scripts/install/lib/markers.test.ts
git commit -m "feat(install): add marker block helpers (build, strip, sentinel)"
```

---

## Task 10: Write `scripts/install/unix/install.sh`

**Files:**
- Create: `scripts/install/unix/install.sh`

- [ ] **Step 1: Write the script**

```sh
#!/bin/sh
# Nimbus installer for macOS + Linux (tarball or AppImage).
# Per-user, no sudo required.

set -eu

INSTALL_DIR="${HOME}/.local/bin"
BEGIN_MARKER="# >>> nimbus PATH >>>"
END_MARKER="# <<< nimbus PATH <<<"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSUME_YES=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [-y|--yes] [--dry-run]
  -y, --yes    Skip confirmation prompts
  --dry-run    Print planned actions and exit
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

# Locate binaries shipped beside this script.
NIMBUS_SRC="${SCRIPT_DIR}/nimbus"
GATEWAY_SRC="${SCRIPT_DIR}/nimbus-gateway"
if [ ! -x "$NIMBUS_SRC" ] || [ ! -x "$GATEWAY_SRC" ]; then
  # Fall back to bin/ subdir for tarball-style layouts.
  NIMBUS_SRC="${SCRIPT_DIR}/bin/nimbus"
  GATEWAY_SRC="${SCRIPT_DIR}/bin/nimbus-gateway"
fi
if [ ! -x "$NIMBUS_SRC" ] || [ ! -x "$GATEWAY_SRC" ]; then
  echo "Error: cannot locate 'nimbus' or 'nimbus-gateway' beside $0" >&2
  exit 1
fi

# Detect rc files to update.
RC_FILES=""
[ -f "${HOME}/.zshrc" ] && RC_FILES="${RC_FILES} ${HOME}/.zshrc"
[ -f "${HOME}/.bash_profile" ] && RC_FILES="${RC_FILES} ${HOME}/.bash_profile"
[ -f "${HOME}/.bashrc" ] && RC_FILES="${RC_FILES} ${HOME}/.bashrc"
# If none exist, default to ~/.profile (POSIX-portable login shell file).
if [ -z "$RC_FILES" ]; then
  RC_FILES="${HOME}/.profile"
fi

cat <<EOF
About to install Nimbus:
  Binaries:  ${NIMBUS_SRC}, ${GATEWAY_SRC}
  → into:    ${INSTALL_DIR}/
  Update PATH in:${RC_FILES}
EOF

if [ "$DRY_RUN" -eq 1 ]; then
  echo "(--dry-run; no changes made)"
  exit 0
fi

if [ "$ASSUME_YES" -ne 1 ]; then
  printf "Continue? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

mkdir -p "$INSTALL_DIR"

# Idempotent overwrite.
if [ -e "${INSTALL_DIR}/nimbus" ] || [ -e "${INSTALL_DIR}/nimbus-gateway" ]; then
  if [ "$ASSUME_YES" -ne 1 ]; then
    printf "Existing install detected at %s. Overwrite? [y/N] " "$INSTALL_DIR"
    read -r answer2
    case "$answer2" in
      y|Y|yes) ;;
      *) echo "Aborted."; exit 1 ;;
    esac
  fi
fi

cp "$NIMBUS_SRC" "${INSTALL_DIR}/nimbus"
cp "$GATEWAY_SRC" "${INSTALL_DIR}/nimbus-gateway"
chmod +x "${INSTALL_DIR}/nimbus" "${INSTALL_DIR}/nimbus-gateway"

# Append marker block to rc files (idempotent — strip first if present).
BLOCK="${BEGIN_MARKER}
export PATH=\"${INSTALL_DIR}:\$PATH\"
${END_MARKER}"

for rc in $RC_FILES; do
  # Create rc file if missing.
  [ -f "$rc" ] || touch "$rc"
  # Strip any pre-existing nimbus block.
  if grep -qF "$BEGIN_MARKER" "$rc" 2>/dev/null; then
    awk -v b="$BEGIN_MARKER" -v e="$END_MARKER" '
      $0==b {skip=1; next}
      skip && $0==e {skip=0; next}
      !skip {print}
    ' "$rc" > "${rc}.tmp.nimbus" && mv "${rc}.tmp.nimbus" "$rc"
  fi
  # Append fresh block.
  printf "\n%s\n" "$BLOCK" >> "$rc"
done

echo
echo "✓ Nimbus installed."
echo "  Open a new shell, then run: nimbus --version"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/install/unix/install.sh
```

- [ ] **Step 3: Lint with shellcheck if available**

Run: `shellcheck scripts/install/unix/install.sh || echo "shellcheck not installed; skipping"`
Expected: zero errors. Warnings about POSIX-only constructs are fine — this is intentionally POSIX-portable.

- [ ] **Step 4: Smoke test locally on this machine (Linux)**

```bash
mkdir -p /tmp/nimbus-smoke
cp $(which echo) /tmp/nimbus-smoke/nimbus  # fake binaries
cp $(which echo) /tmp/nimbus-smoke/nimbus-gateway
cp scripts/install/unix/install.sh /tmp/nimbus-smoke/
HOME=/tmp/nimbus-smoke-home /tmp/nimbus-smoke/install.sh --yes
test -x /tmp/nimbus-smoke-home/.local/bin/nimbus && echo "OK"
grep -q "# >>> nimbus PATH >>>" /tmp/nimbus-smoke-home/.profile && echo "RC OK"
rm -rf /tmp/nimbus-smoke /tmp/nimbus-smoke-home
```
Expected: prints `OK` and `RC OK`.

- [ ] **Step 5: Commit**

```bash
git add scripts/install/unix/install.sh
git commit -m "feat(install): add unix install.sh (macOS + Linux)"
```

---

## Task 11: Write `scripts/install/unix/uninstall.sh`

**Files:**
- Create: `scripts/install/unix/uninstall.sh`

- [ ] **Step 1: Write the script**

```sh
#!/bin/sh
# Nimbus uninstaller for macOS + Linux.
set -eu

INSTALL_DIR="${HOME}/.local/bin"
BEGIN_MARKER="# >>> nimbus PATH >>>"
END_MARKER="# <<< nimbus PATH <<<"
ASSUME_YES=0

for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

cat <<EOF
About to uninstall Nimbus:
  Remove: ${INSTALL_DIR}/nimbus
  Remove: ${INSTALL_DIR}/nimbus-gateway
  Strip nimbus PATH block from: ~/.zshrc, ~/.bash_profile, ~/.bashrc, ~/.profile (if present)
EOF

if [ "$ASSUME_YES" -ne 1 ]; then
  printf "Continue? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

rm -f "${INSTALL_DIR}/nimbus" "${INSTALL_DIR}/nimbus-gateway"

for rc in "${HOME}/.zshrc" "${HOME}/.bash_profile" "${HOME}/.bashrc" "${HOME}/.profile"; do
  [ -f "$rc" ] || continue
  if grep -qF "$BEGIN_MARKER" "$rc"; then
    awk -v b="$BEGIN_MARKER" -v e="$END_MARKER" '
      $0==b {skip=1; next}
      skip && $0==e {skip=0; next}
      !skip {print}
    ' "$rc" > "${rc}.tmp.nimbus" && mv "${rc}.tmp.nimbus" "$rc"
  fi
done

echo "✓ Nimbus uninstalled."
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/install/unix/uninstall.sh
```

- [ ] **Step 3: Local smoke test (round-trip with Task 10)**

```bash
mkdir -p /tmp/nimbus-smoke
cp $(which echo) /tmp/nimbus-smoke/nimbus
cp $(which echo) /tmp/nimbus-smoke/nimbus-gateway
cp scripts/install/unix/install.sh /tmp/nimbus-smoke/
cp scripts/install/unix/uninstall.sh /tmp/nimbus-smoke/
HOME=/tmp/smoke-home /tmp/nimbus-smoke/install.sh --yes
HOME=/tmp/smoke-home /tmp/nimbus-smoke/uninstall.sh --yes
test ! -e /tmp/smoke-home/.local/bin/nimbus && echo "REMOVED OK"
! grep -q "# >>> nimbus PATH >>>" /tmp/smoke-home/.profile 2>/dev/null && echo "RC CLEANED"
rm -rf /tmp/nimbus-smoke /tmp/smoke-home
```
Expected: prints `REMOVED OK` and `RC CLEANED`.

- [ ] **Step 4: Commit**

```bash
git add scripts/install/unix/uninstall.sh
git commit -m "feat(install): add unix uninstall.sh"
```

---

## Task 12: Write `scripts/install/windows/install.ps1`

**Why not `setx`:** `setx` reads `PATH` and truncates it at 1024 characters when writing back. On any developer machine with a long `PATH`, this destroys the original variable. The .NET API `[Environment]::SetEnvironmentVariable("PATH", $value, "User")` writes directly to `HKCU\Environment` with no truncation.

**Files:**
- Create: `scripts/install/windows/install.ps1`

- [ ] **Step 1: Write the script**

```powershell
#Requires -Version 7.0
<#
.SYNOPSIS
  Nimbus installer for Windows (per-user, no admin).
.PARAMETER Yes
  Skip confirmation prompts.
.PARAMETER DryRun
  Print planned actions and exit without writing.
#>
[CmdletBinding()]
param(
  [switch]$Yes,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Nimbus\bin"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$NimbusSrc  = Join-Path $ScriptDir "nimbus.exe"
$GatewaySrc = Join-Path $ScriptDir "nimbus-gateway.exe"

if (-not (Test-Path $NimbusSrc) -or -not (Test-Path $GatewaySrc)) {
  $NimbusSrc  = Join-Path $ScriptDir "bin\nimbus.exe"
  $GatewaySrc = Join-Path $ScriptDir "bin\nimbus-gateway.exe"
}
if (-not (Test-Path $NimbusSrc) -or -not (Test-Path $GatewaySrc)) {
  throw "Cannot locate 'nimbus.exe' or 'nimbus-gateway.exe' beside this script."
}

Write-Host "About to install Nimbus:"
Write-Host "  Binaries: $NimbusSrc, $GatewaySrc"
Write-Host "  -> into:  $InstallDir"
Write-Host "  Update User PATH (registry: HKCU\Environment)"

if ($DryRun) {
  Write-Host "(--DryRun; no changes made)"
  exit 0
}

if (-not $Yes) {
  $answer = Read-Host "Continue? [y/N]"
  if ($answer -notmatch '^(y|yes)$') { Write-Host "Aborted."; exit 1 }
}

if (-not (Test-Path $InstallDir)) {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

if ((Test-Path (Join-Path $InstallDir "nimbus.exe")) -and -not $Yes) {
  $answer2 = Read-Host "Existing install detected. Overwrite? [y/N]"
  if ($answer2 -notmatch '^(y|yes)$') { Write-Host "Aborted."; exit 1 }
}

Copy-Item -Path $NimbusSrc  -Destination (Join-Path $InstallDir "nimbus.exe")  -Force
Copy-Item -Path $GatewaySrc -Destination (Join-Path $InstallDir "nimbus-gateway.exe") -Force

# Update User PATH via .NET API (avoids setx 1024-char truncation bug).
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($null -eq $currentPath) { $currentPath = "" }

# Idempotent: only add if not already present (case-insensitive on Windows).
$pathSegments = $currentPath -split ";" | Where-Object { $_ -ne "" }
$alreadyPresent = $pathSegments | Where-Object { $_ -ieq $InstallDir }
if (-not $alreadyPresent) {
  $newPath = if ($currentPath -eq "") { $InstallDir } else { "$currentPath;$InstallDir" }
  [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

  # Broadcast WM_SETTINGCHANGE so already-open Explorer / shells pick up the new value.
  # Wrapped in try/catch: Add-Type is blocked under Constrained Language Mode (WDAC/AppLocker).
  # PATH is already written to the registry; only the live-session refresh is missing on failure.
  try {
    $signature = @'
[DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
  IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
  uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
    $type = Add-Type -MemberDefinition $signature -Name 'NimbusEnvBroadcast' -Namespace Win32 -PassThru
    [UIntPtr]$result = [UIntPtr]::Zero
    $HWND_BROADCAST = [IntPtr]0xffff
    $WM_SETTINGCHANGE = 0x001A
    $SMTO_ABORTIFHUNG = 0x0002
    $type::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", $SMTO_ABORTIFHUNG, 5000, [ref]$result) | Out-Null
  } catch {
    Write-Warning "Could not broadcast environment change (likely Constrained Language Mode). PATH was updated successfully — open a new shell to pick it up."
  }
}

Write-Host ""
Write-Host "✓ Nimbus installed."
Write-Host "  Open a new shell, then run: nimbus --version"
```

- [ ] **Step 2: Lint with PSScriptAnalyzer if available**

Run on a Windows machine: `Invoke-ScriptAnalyzer -Path scripts/install/windows/install.ps1`
Expected: no Error-severity findings. Warnings about `Read-Host` are expected (interactive prompts).

- [ ] **Step 3: Local smoke test on Windows**

```powershell
$smoke = "$env:TEMP\nimbus-smoke"
New-Item -ItemType Directory -Path $smoke -Force | Out-Null
Copy-Item C:\Windows\System32\where.exe "$smoke\nimbus.exe"
Copy-Item C:\Windows\System32\where.exe "$smoke\nimbus-gateway.exe"
Copy-Item scripts\install\windows\install.ps1 $smoke
$env:LOCALAPPDATA = "$smoke\AppData\Local"
& "$smoke\install.ps1" -Yes
Test-Path "$env:LOCALAPPDATA\Programs\Nimbus\bin\nimbus.exe"
[Environment]::GetEnvironmentVariable("PATH","User") -split ";" | Where-Object { $_ -like "*Nimbus*" }
```
Expected: `True`, then a path containing `Nimbus\bin`.

- [ ] **Step 4: Commit**

```bash
git add scripts/install/windows/install.ps1
git commit -m "feat(install): add Windows install.ps1 (User PATH via .NET API)"
```

---

## Task 13: Write `scripts/install/windows/uninstall.ps1`

**Files:**
- Create: `scripts/install/windows/uninstall.ps1`

- [ ] **Step 1: Write the script**

```powershell
#Requires -Version 7.0
[CmdletBinding()]
param(
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Nimbus\bin"

Write-Host "About to uninstall Nimbus:"
Write-Host "  Remove: $InstallDir\nimbus.exe"
Write-Host "  Remove: $InstallDir\nimbus-gateway.exe"
Write-Host "  Remove $InstallDir from User PATH (registry: HKCU\Environment)"

if (-not $Yes) {
  $answer = Read-Host "Continue? [y/N]"
  if ($answer -notmatch '^(y|yes)$') { Write-Host "Aborted."; exit 1 }
}

Remove-Item -Path (Join-Path $InstallDir "nimbus.exe")         -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $InstallDir "nimbus-gateway.exe") -Force -ErrorAction SilentlyContinue

$pathChanged = $false
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($null -ne $currentPath) {
  # Use case-insensitive equality against the exact install dir — not a glob.
  # A glob like -inotlike "*Nimbus\bin" would false-positive on unrelated PATH
  # entries such as C:\Tools\NimbusTeam\nimbus\bin or D:\Custom\Nimbus\bin.
  $newSegments = $currentPath -split ";" | Where-Object { $_ -ne "" -and $_ -ine $InstallDir }
  $newPath = $newSegments -join ";"
  if ($newPath -ne $currentPath) {
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    $pathChanged = $true
  }
}

if ($pathChanged) {
  # Broadcast WM_SETTINGCHANGE so already-open Explorer / shells pick up the change.
  # Wrapped in try/catch: Add-Type is blocked under Constrained Language Mode (WDAC/AppLocker).
  # PATH is already written to the registry; only the live-session refresh is missing on failure.
  try {
    $signature = @'
[DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
  IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
  uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
    $type = Add-Type -MemberDefinition $signature -Name 'NimbusEnvBroadcast' -Namespace Win32 -PassThru
    [UIntPtr]$result = [UIntPtr]::Zero
    $HWND_BROADCAST = [IntPtr]0xffff
    $WM_SETTINGCHANGE = 0x001A
    $SMTO_ABORTIFHUNG = 0x0002
    $type::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", $SMTO_ABORTIFHUNG, 5000, [ref]$result) | Out-Null
  } catch {
    Write-Warning "Could not broadcast environment change (likely Constrained Language Mode). PATH was updated successfully — open a new shell to pick it up."
  }
}

Write-Host "✓ Nimbus uninstalled."
```

- [ ] **Step 2: Smoke test on Windows (round-trip with Task 12)**

```powershell
$smoke = "$env:TEMP\nimbus-smoke"
& "$smoke\install.ps1" -Yes
Copy-Item scripts\install\windows\uninstall.ps1 $smoke
& "$smoke\uninstall.ps1" -Yes
Test-Path "$env:LOCALAPPDATA\Programs\Nimbus\bin\nimbus.exe"  # expect False
[Environment]::GetEnvironmentVariable("PATH","User") -split ";" | Where-Object { $_ -like "*Nimbus*" }  # expect (empty)
```

- [ ] **Step 3: Commit**

```bash
git add scripts/install/windows/uninstall.ps1
git commit -m "feat(install): add Windows uninstall.ps1"
```

---

## Task 14: Write `scripts/install/README.md`

**Files:**
- Modify: `scripts/install/README.md`

- [ ] **Step 1: Replace the placeholder**

```markdown
# Nimbus Install Scripts

Per-user installers bundled with v0.1.0+ release tarballs.

## Why scripts (not signed `.msi` / `.pkg`)

v0.1.0 ships unsigned on macOS and Windows. A signed installer would still trip
SmartScreen / Gatekeeper warnings until the publisher reputation builds, so we
keep the install surface as a plain text script you can read before running.

## What they do

| | Windows | macOS / Linux |
|---|---|---|
| Install dir | `%LOCALAPPDATA%\Programs\Nimbus\bin` | `~/.local/bin` |
| PATH update | `[Environment]::SetEnvironmentVariable("PATH", ..., "User")` (writes `HKCU\Environment`) | Idempotent block in `~/.zshrc`, `~/.bash_profile`, `~/.bashrc`, or `~/.profile` |
| Admin / sudo? | No | No |

`setx` is **not** used on Windows because it truncates `PATH` at 1024
characters. The `.NET` API has no such limit.

## Idempotency

The Unix scripts wrap their PATH line in sentinel comments:

```
# >>> nimbus PATH >>>
export PATH="…/.local/bin:$PATH"
# <<< nimbus PATH <<<
```

Re-running `install.sh` strips the existing block before appending a fresh one.
`uninstall.sh` removes only what's between the markers, never lines outside.

## Usage

```bash
# Linux / macOS
./install.sh             # interactive
./install.sh --yes       # non-interactive
./install.sh --dry-run   # print planned actions, exit

# Windows
.\install.ps1            # interactive
.\install.ps1 -Yes       # non-interactive
.\install.ps1 -DryRun    # print planned actions, exit
```

After install, **open a new shell** and run `nimbus --version`.

## Uninstall

```bash
./uninstall.sh --yes
.\uninstall.ps1 -Yes
```
```

- [ ] **Step 2: Commit**

```bash
git add scripts/install/README.md
git commit -m "docs(install): explain what install scripts write and why"
```

---

## Task 15: Bundle install scripts into Linux AppImage + tarball

**Files:**
- Modify: `scripts/package-linux-installers.ts`

- [ ] **Step 1: Locate the tarball + AppImage assembly site**

Run: `grep -n 'tar' scripts/package-linux-installers.ts | head -20`
Expected: locate where the tarball is built and where AppImage assembly happens. Note the line numbers.

- [ ] **Step 2: Add install scripts to the staged file set**

In the function that copies files into the staging dir before tarball creation, add:

```typescript
// Bundle the installer scripts.
const installSrc = path.join(REPO_ROOT, "scripts/install/unix");
fs.copyFileSync(path.join(installSrc, "install.sh"), path.join(stageDir, "install.sh"));
fs.copyFileSync(path.join(installSrc, "uninstall.sh"), path.join(stageDir, "uninstall.sh"));
fs.chmodSync(path.join(stageDir, "install.sh"), 0o755);
fs.chmodSync(path.join(stageDir, "uninstall.sh"), 0o755);
```

(Use the variable names already in the file; this is a sketch.)

- [ ] **Step 3: Add a unit test**

Add to `scripts/package-linux-installers.test.ts`:

```typescript
test("tarball contains install.sh and uninstall.sh", async () => {
  const tarballPath = await runPackager(/* with the existing test harness */);
  const list = (await Bun.spawn(["/usr/bin/tar", "-tzf", tarballPath]).stdout.text()).split("\n");
  expect(list.some((p) => p.endsWith("/install.sh"))).toBe(true);
  expect(list.some((p) => p.endsWith("/uninstall.sh"))).toBe(true);
});
```

- [ ] **Step 4: Run the packager test**

Run: `bun test scripts/package-linux-installers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/package-linux-installers.ts scripts/package-linux-installers.test.ts
git commit -m "feat(install): bundle install/uninstall scripts in Linux tarball + AppImage"
```

---

## Task 16: Bundle install scripts into Windows + macOS release tarballs

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Locate the artefact-packaging steps**

Run: `grep -n 'tar -czf\|Compress-Archive\|zip ' .github/workflows/release.yml`
Expected: locate the macOS `tar -czf` and Windows `Compress-Archive` (or equivalent) steps.

- [ ] **Step 2: Add install scripts to each platform's staging step**

For macOS:

```yaml
      - name: Stage install scripts (macOS)
        run: |
          cp scripts/install/unix/install.sh   "$STAGE_DIR/"
          cp scripts/install/unix/uninstall.sh "$STAGE_DIR/"
          chmod +x "$STAGE_DIR/install.sh" "$STAGE_DIR/uninstall.sh"
```

For Windows:

```yaml
      - name: Stage install scripts (Windows)
        shell: pwsh
        run: |
          Copy-Item scripts\install\windows\install.ps1   "$env:STAGE_DIR\"
          Copy-Item scripts\install\windows\uninstall.ps1 "$env:STAGE_DIR\"
```

Place each step **immediately before** the existing tarball/zip-creation step on its respective matrix leg. Use the existing `STAGE_DIR` env var (or the variable the workflow already uses).

- [ ] **Step 3: Verify with a workflow lint**

Run: `gh workflow view release.yml` (or use `actionlint` if installed).
Expected: no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): bundle install scripts into Win/Mac release tarballs"
```

---

## Task 17: Add `.github/workflows/install-smoke.yml`

**Files:**
- Create: `.github/workflows/install-smoke.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: install-smoke

on:
  pull_request:
    paths:
      - "scripts/install/**"
      - "scripts/package-linux-installers.ts"
      - ".github/workflows/install-smoke.yml"
      - ".github/workflows/release.yml"

permissions:
  contents: read

jobs:
  smoke:
    name: ${{ matrix.os }} install smoke
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-24.04, macos-14, windows-2022]

    steps:
      - name: Harden Runner
        uses: step-security/harden-runner@a5ad31d6a139d249332a2605b85202e8c0b78450
        with:
          egress-policy: audit

      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
        with:
          persist-credentials: false

      - name: Setup Bun and install dependencies
        uses: ./.github/actions/setup-nimbus-ci

      - name: Build Gateway + CLI
        run: bun run build

      - name: Stage a fake release tarball (Unix)
        if: runner.os != 'Windows'
        shell: bash
        run: |
          STAGE=$(mktemp -d)
          cp packages/cli/dist/nimbus           "$STAGE/nimbus"
          cp packages/gateway/dist/nimbus-gateway "$STAGE/nimbus-gateway"
          chmod +x "$STAGE/nimbus" "$STAGE/nimbus-gateway"
          cp scripts/install/unix/install.sh    "$STAGE/"
          cp scripts/install/unix/uninstall.sh  "$STAGE/"
          chmod +x "$STAGE/install.sh" "$STAGE/uninstall.sh"
          echo "STAGE=$STAGE" >> "$GITHUB_ENV"

      - name: Run install.sh + verify (Unix)
        if: runner.os != 'Windows'
        shell: bash
        run: |
          export HOME="$RUNNER_TEMP/fake-home"
          mkdir -p "$HOME"
          "$STAGE/install.sh" --yes
          # Source the rc file the installer wrote, then exec nimbus --version.
          for rc in "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.bashrc" "$HOME/.profile"; do
            if [ -f "$rc" ]; then
              # shellcheck disable=SC1090
              . "$rc"
              break
            fi
          done
          nimbus --version
          "$STAGE/uninstall.sh" --yes
          test ! -e "$HOME/.local/bin/nimbus"

      - name: Stage a fake release dir (Windows)
        if: runner.os == 'Windows'
        shell: pwsh
        run: |
          $stage = Join-Path $env:RUNNER_TEMP "stage"
          New-Item -ItemType Directory -Path $stage -Force | Out-Null
          Copy-Item packages\cli\dist\nimbus.exe              $stage\
          Copy-Item packages\gateway\dist\nimbus-gateway.exe  $stage\
          Copy-Item scripts\install\windows\install.ps1       $stage\
          Copy-Item scripts\install\windows\uninstall.ps1     $stage\
          "STAGE=$stage" | Out-File -FilePath $env:GITHUB_ENV -Append

      - name: Run install.ps1 + verify (Windows)
        if: runner.os == 'Windows'
        shell: pwsh
        run: |
          $env:LOCALAPPDATA = "$env:RUNNER_TEMP\fake-localappdata"
          New-Item -ItemType Directory -Path $env:LOCALAPPDATA -Force | Out-Null
          & "$env:STAGE\install.ps1" -Yes
          $userPath = [Environment]::GetEnvironmentVariable("PATH","User")
          $env:PATH = "$userPath;$env:PATH"
          nimbus --version
          & "$env:STAGE\uninstall.ps1" -Yes
          if (Test-Path "$env:LOCALAPPDATA\Programs\Nimbus\bin\nimbus.exe") { exit 1 }
```

- [ ] **Step 2: Lint with actionlint if available**

Run: `actionlint .github/workflows/install-smoke.yml`
Expected: no errors.

- [ ] **Step 3: Push the branch and let the workflow run**

```bash
git add .github/workflows/install-smoke.yml
git commit -m "ci: add install-smoke workflow (per-OS install round-trip)"
git push origin <branch>
```

Verify on GitHub Actions: all 3 OS legs pass.

---

## Task 18: Update root `README.md` install section

**Files:**
- Modify: `README.md` (find the "Install" section)

- [ ] **Step 1: Replace the install section with the bundled-script flow**

Replace existing manual-PATH instructions with:

```markdown
## Install

### Linux (`.deb`)
```bash
curl -L https://github.com/asafgolombek/Nimbus/releases/latest/download/nimbus_amd64.deb -o nimbus.deb
curl -L https://github.com/asafgolombek/Nimbus/releases/latest/download/nimbus_amd64.deb.asc -o nimbus.deb.asc
gpg --recv-keys <FINGERPRINT>
gpg --verify nimbus.deb.asc nimbus.deb
sudo dpkg -i nimbus.deb
```

### macOS / Linux (tarball)
```bash
curl -L https://github.com/asafgolombek/Nimbus/releases/latest/download/nimbus-macos-arm64.tar.gz | tar -xz
cd nimbus-*
./install.sh --yes
# Open a new shell:
nimbus --version
```

### Windows (zip)
```powershell
Invoke-WebRequest https://github.com/asafgolombek/Nimbus/releases/latest/download/nimbus-windows-x64.zip -OutFile nimbus.zip
Expand-Archive nimbus.zip
cd nimbus-*
.\install.ps1 -Yes
# Open a new shell:
nimbus --version
```

### AppImage
```bash
curl -L https://github.com/asafgolombek/Nimbus/releases/latest/download/Nimbus-x86_64.AppImage -o Nimbus.AppImage
chmod +x Nimbus.AppImage
# Optional: install to ~/.local/bin so it's on PATH
./install.sh --yes
```

### Uninstall
Same flow with `uninstall.sh` / `uninstall.ps1`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update install section for bundled install.sh / install.ps1"
```

---

## Task 19: Acceptance verification

- [ ] `bun test scripts/install/lib/` shows ≥ 80% coverage on `paths.ts` + `markers.ts`.
- [ ] `bun test scripts/package-linux-installers.test.ts` PASS — tarball includes install scripts.
- [ ] `install-smoke.yml` workflow passes on Ubuntu 24.04, macOS 14, Windows 2022.
- [ ] On a fresh local machine: extract the latest `release.yml`-built tarball → run install script → open new shell → `nimbus --version` prints `0.1.0` (or the current rc).
- [ ] On the same machine: run uninstall script → binaries gone, marker block removed from rc files, `nimbus` not on PATH.
- [ ] Re-running install on the same machine prompts before overwriting and is idempotent with `--yes`.

---

## Out of scope

- Signed `.msi` / `.pkg` installers (deferred until cert procurement)
- System-wide install (admin/sudo path) — per-user only for v0.1.0
- Auto-update via the install script (use `nimbus update` instead, served by the updater subsystem)
