# Phase 5 T2 PR 1 — Sandbox PAL + 3-OS isolation + `permissions.{network,filesystem}` — Design

> **Status:** Draft for review
> **Author:** asafgolombek
> **Date:** 2026-05-16
> **Parent sequencing spec:** [`2026-05-16-phase-5-t2-design.md`](./2026-05-16-phase-5-t2-design.md) §2 PR 1
> **Branch / worktree:** `dev/asafgolombek/phase-5-t2-pr1-sandbox` @ `.worktrees/phase-5-t2-pr1-sandbox/`

## Purpose

T2 PR 1 replaces the current process-only honor-system isolation of extension child processes with OS-native kernel-level sandboxing — seccomp BPF + `bwrap` + a privileged helper binary on Linux, `sandbox-exec` (with documented `EndpointSecurity` fallback) on macOS, AppContainer on Windows. It adds `permissions.network` and `permissions.filesystem` to the extension manifest schema, routes every connector spawn in `connectors/lazy-mesh/` through a new `SandboxRunner` PAL, migrates the 30 first-party connectors to declare their network surface, and locks the sandbox-runner-intrinsic-to-every-extension-spawn property as new invariant `I15` (production wiring + docs entry + enforcement test + extended `D10` static rule).

PR 1 is the first of five PRs in T2 (sandbox → verified-publisher → auto-update → dependency-resolution → ratings). The parent sequencing spec calls it "the largest" and ordered it first because **security urgency outranks rebase economy**: shipping verified-publisher and auto-update without sandbox hardening would mean an attacker-controlled extension can still exfil via unrestricted network egress even with a valid signature. PR 1's per-PR scope is locked here; the 5 design decisions deferred to "PR 1's per-PR spec" by T2 §2 PR 1 are resolved in §2 below.

This document does not enumerate the 30 first-party connectors' hostnames — that mechanical work happens in the implementation plan. The spec names the *requirement* (every first-party connector declares its `permissions.network`); the plan names *each host*.

## Section 1 — Scope refinement vs T2 spec §2 PR 1

The parent T2 spec §2 PR 1 listed the touchpoints and out-of-scope items at the granularity needed to sequence T2. This section refines a single scope item; everything else in T2 spec §2 PR 1 carries through unchanged.

### Deviation — pre-T2 third-party extensions are hard-disabled, not legacy-mode

T2 spec §2 PR 1 line 89 said: "third-party extensions installed pre-T2 are flagged 'no sandbox declaration' and run in legacy mode until reinstalled." PR 1 hardens this to **hard-disable until reinstall**. Pre-T2 extensions without a `permissions.*` object are refused at registry-load time with a structured error message:

```
Extension <id> v<version> was installed before sandbox hardening (T2 PR 1, 2026-05-16).
Reinstall to enable: nimbus extension reinstall <id>
```

The extension is not auto-removed — the install record stays so the user can reinstall in-place. `nimbus extension list` flags the row `[needs-reinstall]`; `nimbus diag` reports a count under `extensions.disabled_pre_t2`.

**Rationale.** Matches PR 1's security-urgency-over-convenience posture (the same posture that ordered sandbox before marketplace). Practical impact is low: Marketplace v2 (T2 PR 5) ships the rating + discovery surface, so third-party install count in the wild at PR 1's merge time is minimal. Hard-disable also eliminates a parallel "no sandbox" code path inside `SandboxRunner.spawn`, which keeps the I15 surface coherent (every spawn is sandboxed, no exceptions).

**Coordination with T2 PR 2 (verified-publisher).** PR 2 introduces an "unverified-publisher" badge for extensions without GPG signatures. The hard-disable path here and the unverified-publisher badge in PR 2 are independent surfaces — an extension can be hard-disabled (no `permissions.*`) without being unverified, and vice versa. PR 2's spec will address how the two states compose for an extension that triggers both.

### Everything else carried through verbatim from T2 §2 PR 1

- `packages/gateway/src/platform/sandbox/` subdirectory with `sandbox-runner.ts` + `linux.ts` + `darwin.ts` + `win32.ts`.
- Manifest schema additions in `extensions/manifest.ts`: `permissions: { network?: string[]; filesystem?: { read?: string[]; write?: string[] } }` (object form); back-compat with the existing array form maps to default-deny on both axes. Validator rejects unknown `permissions.*` keys.
- Every connector spawn under `connectors/lazy-mesh/` (`mesh.ts`, `connector-spawns.ts`, `phase3-config.ts`, `user-mcp.ts`) routes through `sandboxRunner.spawn(...)`. `extensionProcessEnv` (I1) stays as the inner env builder; the outer wrapper is `sandboxRunner.spawn`.
- 30 first-party connector manifests gain `permissions.network` (plus `permissions.filesystem` for local-files / iac-cli).
- New invariant `I15` — "Sandbox runner is intrinsic to every extension spawn." Triple wiring (§7).
- `D10` static-audit rule extended to also fail on bare `spawn(` under `connectors/` outside `sandbox-runner.ts`.
- New coverage gate `test:coverage:sandbox` ≥ 80%; `test:coverage:extensions` stays ≥ 85%.

## Section 2 — Locked design decisions

The five questions T2 spec §2 PR 1 deferred to "PR 1's per-PR spec" plus the contract-test interface shape that the spec implied but did not pin. Locked through brainstorming on 2026-05-16.

| # | Topic | Decision |
| - | ----- | -------- |
| 1 | **macOS sandbox-exec viability** | Viability spike first. A ~2-hour prototype on the worktree exercises `sandbox-exec` with `(version 1) (deny default) (allow file-read* (subpath "<cwd>")) (allow network* (remote tcp (host "<allowed>")))` against Bun child processes making HTTPS fetches on macOS 14 (Sonoma) and macOS 15 (Sequoia). The spike's three pass/fail probes: listed-host fetch succeeds; unlisted host (`192.0.2.1`) fails with `EPERM`; FS read of `/etc/passwd` fails with `EACCES`. Spike result documented in this spec before the darwin branch is implemented. Spike pass → lock `sandbox-exec`. Spike fail → lock minimal `EndpointSecurity` wrapper (would push PR 1 size up; documented as the fallback in T2 spec line 66). |
| 2 | **Windows AppContainer lifecycle** | Startup orphan-reap only. Profile created at install (`CreateAppContainerProfile("nimbus-ext-<extension-id>", ...)`), deleted at uninstall (`DeleteAppContainerProfile` after terminate-then-delete sequence). Unhappy paths — crash-during-spawn, Gateway-killed-mid-spawn, uninstall-with-running-extension — all converge on next-startup reap: enumerate AppContainer profile registry sub-keys under `GetAppContainerRegistryLocation()` matching `nimbus-ext-*`, cross-reference against the `extension_state` table, `DeleteAppContainerProfile` on any orphan. No schema additions (`extension_state` rows are sufficient; no `live_appcontainer_sid` column). No background watchdog. Trade-off: up to one Gateway-startup cycle of orphan retention — acceptable since AppContainer SIDs are cheap. |
| 3 | **Linux mechanism** | `bwrap` for FS confinement + netns creation (`--unshare-net`). Per-host iptables rules inside the netns are configured by `nimbus-sandbox-helper`, a small Nimbus-shipped C binary granted `cap_net_admin+ep` via `setcap` at install time. Linux package installers (`.deb`, `.rpm`, tarball install script) run `setcap`. Helper unavailable or lacks the cap → fall back to all-or-nothing network (bwrap `--unshare-net` for "no network" if `permissions.network` is empty; bwrap `--share-net` if non-empty) with a structured-log warning at Gateway startup. CI sets the cap on the helper in the test-setup step. |
| 4 | **Pre-T2 extension UX** | Hard-disable until reinstall (§1 deviation). |
| 5 | **Per-connector seccomp overrides** | None at PR 1. A single hard-coded default Linux seccomp BPF filter is shared by every connector spawn. All 30 first-party connectors fit: HTTPS + file I/O + `execve` + `mmap` + `clock_gettime` are allowed; `ptrace`, `mount`, `setuid`/`setgid`, `bpf`, `kexec_load`, module-loading (`init_module` / `delete_module` / `finit_module`), `pivot_root`, `chroot`, `swapon`/`swapoff`, `reboot` are blocked. No new manifest field; if a future connector needs an override, becomes a follow-up issue with its own per-connector audit. |
| 6 | **Contract-test interface** | `@nimbus-dev/sdk/testing` exports `runSandboxContractTests(manifestPath: string): Promise<void>`. Each connector adds `test/sandbox.test.ts` with a single `it("respects sandbox", async () => { await runSandboxContractTests("./nimbus.extension.json"); })`. SDK reads the manifest, spawns a child via `sandboxRunner.spawn`, runs three probes per OS: (a) one listed-host fetch succeeds; (b) fetch of `192.0.2.1` returns `ECONNREFUSED` (Linux/macOS) or `EPERM` (Windows fallback); (c) FS read of `/etc/passwd` (POSIX) / `C:\Windows\System32\config\SAM` (Windows) returns `EACCES`. Third-party extensions can use the same API. The negative-test target `192.0.2.1` is from RFC 5737 documentation range — guaranteed not to be in any legitimate `permissions.network` declaration. |

## Section 3 — Manifest schema additions

### TypeScript shape

In `packages/gateway/src/extensions/manifest.ts`:

```typescript
export interface FilesystemPermissions {
  /** Paths the extension may read. Absolute paths or paths relative to the extension cwd. */
  read?: string[];
  /** Paths the extension may write. Absolute paths or paths relative to the extension cwd. */
  write?: string[];
}

export interface SandboxPermissions {
  /** Hostnames the extension may connect to. Empty array / undefined = no network. */
  network?: string[];
  /** Filesystem read/write allow-lists. cwd + scoped temp dir are always implicitly allowed. */
  filesystem?: FilesystemPermissions;
}

export type ResolvedExtensionManifest = {
  // ... existing fields ...
  permissions: SandboxPermissions;
};
```

### Back-compat with the existing array form

`extensions/manifest.ts` already declares `permissions: string[]`. The validator becomes a normalizer:

- **Object form** — `permissions` is a `SandboxPermissions`. Used as-is. Validator rejects unknown keys.
- **Array form (legacy)** — `permissions` is a `string[]`. Normalized to `{ network: [], filesystem: {} }` (default-deny on both axes). Logged once at load with `extension.id` so the registry sees a deprecation breadcrumb. Existing array entries (e.g., `"read-files"`, `"trash"`) are dropped silently — the HITL gate (I2/I3) is the real defense for write tools, not the manifest permission string.

### Validator changes

- Unknown top-level `permissions.*` keys → reject install with a clear error.
- `permissions.network` entries must be valid hostnames (RFC 1123). Wildcards are not accepted in object form. Empty array / omitted = no network.
- `permissions.filesystem.read` / `.write` entries must be absolute paths or relative paths without `..`. The validator does not resolve paths; the sandbox does the resolution at spawn time against the extension's cwd.

### Out of scope for PR 1

- Glob patterns inside `filesystem.read` / `filesystem.write` — paths are exact prefixes only.
- Runtime permission elevation (extension asking for `network` mid-run) — out of T2.
- Per-tool permission scoping (`tools.<name>.permissions`) — out of T2.

## Section 4 — SandboxRunner PAL

### Interface — `packages/gateway/src/platform/sandbox/sandbox-runner.ts`

```typescript
import type { ChildProcess, SpawnOptions } from "node:child_process";
import type { ResolvedExtensionManifest } from "../../extensions/manifest";

export interface SandboxSpawnOptions {
  manifest: ResolvedExtensionManifest;
  env: Record<string, string>;          // result of extensionProcessEnv(...) — I1 (unchanged)
  cwd: string;                          // extension's working dir; always FS-accessible
  stdio?: SpawnOptions["stdio"];
}

export interface SandboxRunner {
  readonly platform: "linux" | "darwin" | "win32";

  /**
   * Spawn an extension child process inside the OS-native sandbox.
   * Throws if `manifest.permissions` is missing (T2 PR 1 §1 deviation —
   * pre-T2 extensions are hard-disabled at registry-load, so this should
   * never fire at spawn time; the throw is the I15 safety net).
   */
  spawn(cmd: string, args: string[], opts: SandboxSpawnOptions): ChildProcess;

  /**
   * True iff the full sandbox is active (e.g., Linux helper has CAP_NET_ADMIN
   * and is granting per-host filtering). False = sandbox is degraded to
   * all-or-nothing network. Reported in `nimbus diag --json`.
   */
  isFullyActive(): boolean;

  /**
   * Reason for degraded posture, or `null` when fully active. Surfaced in
   * `nimbus diag` and the structured-log warning at startup.
   */
  degradedReason(): string | null;
}

export function createSandboxRunner(): SandboxRunner; // dispatch on process.platform
```

The dispatch helper mirrors `createPlatformServices()` in `packages/gateway/src/platform/index.ts`. Each branch returns a fully constructed runner; the runner is a Gateway-process singleton consumed by `connectors/lazy-mesh/` via dependency injection (not a module-level global — keeps it testable).

### Linux — `packages/gateway/src/platform/sandbox/linux.ts`

**Outer spawn flow:**

1. Resolve the path to `bwrap` (must be on `PATH`; checked once at Gateway startup, fail-loud if absent).
2. Detect helper availability at Gateway startup: probe `nimbus-sandbox-helper --check-caps`, which prints `OK` to stdout iff the binary has `cap_net_admin` in its permitted set. Cache the result; surface in `nimbus diag --json` under `sandbox.linux_helper`.
3. Decide the network mode for this spawn:
   - **`permissions.network` non-empty AND helper available** → "per-host" mode. The helper is the outer wrapper: it creates the netns (`unshare(CLONE_NEWNET)` with real `CAP_NET_ADMIN`), configures veth + iptables for the allowed hosts, drops `CAP_NET_ADMIN` from its inheritable + effective sets, then `execv`'s bwrap with `--share-net` to inherit the helper-built netns rather than creating its own.
   - **`permissions.network` non-empty AND helper unavailable/uncapped** → "fallback" mode. No helper; bwrap with `--share-net` only (no `--unshare-net`). All-or-nothing network. `isFullyActive() → false`; `degradedReason()` returns `"nimbus-sandbox-helper missing or lacks CAP_NET_ADMIN"`. Structured-log warning at Gateway startup.
   - **`permissions.network` empty** → "no-net" mode. No helper involved; bwrap with `--unshare-net`. No connectivity.
4. Build the bwrap argv (mode-dependent on step 3, then common flags):
   - `--unshare-pid --unshare-uts --unshare-ipc --unshare-user --new-session`
   - Network: `--unshare-net` (no-net mode) or `--share-net` (per-host + fallback modes — the netns is inherited from the helper in per-host mode and from the Gateway in fallback mode).
   - `--ro-bind /usr /usr --ro-bind /etc /etc --ro-bind /lib /lib --ro-bind /lib64 /lib64`
   - `--proc /proc --dev /dev --tmpfs /tmp`
   - `--bind <opts.cwd> <opts.cwd>` (writable cwd)
   - Per `permissions.filesystem.read`: `--ro-bind <path> <path>` for each entry that resolves.
   - Per `permissions.filesystem.write`: `--bind <path> <path>` for each entry that resolves.
   - `--seccomp <fd>` pointing at the default seccomp BPF filter (compiled once at module load).
   - `--die-with-parent` (Gateway death kills the child).
5. Why the connector cannot un-do its own restrictions: bwrap's `--unshare-user` puts the connector in a fresh user namespace where the helper-created outer netns is *not* owned by the connector's user namespace. `iptables` calls from inside the connector require `CAP_NET_ADMIN` in the *owning* user namespace (the host's), which the connector does not possess. Combined with the seccomp filter blocking `bpf` / `unshare` (CLONE_NEWUSER variants in the connector's context) / `setns`, the connector has no kernel-level path to modify or escape the netns rules the helper installed.

**Default seccomp BPF filter** (compiled once at module load, shared across all connector spawns):

- **Allow**: `read`, `write`, `open`, `openat`, `close`, `stat`, `fstat`, `lstat`, `mmap`, `mprotect`, `munmap`, `brk`, `rt_sigaction`, `rt_sigprocmask`, `rt_sigreturn`, `ioctl` (TTY ops only), `pread64`, `pwrite64`, `readv`, `writev`, `access`, `pipe`, `pipe2`, `select`, `pselect6`, `poll`, `ppoll`, `epoll_create1`, `epoll_ctl`, `epoll_wait`, `epoll_pwait`, `dup`, `dup2`, `dup3`, `nanosleep`, `clock_gettime`, `clock_nanosleep`, `getpid`, `gettid`, `getuid`, `geteuid`, `getgid`, `getegid`, `getpgrp`, `getppid`, `getrandom`, `clone`, `fork`, `vfork`, `execve`, `execveat`, `wait4`, `waitid`, `exit`, `exit_group`, `rt_sigtimedwait`, `arch_prctl`, `set_tid_address`, `set_robust_list`, `prlimit64`, `getrlimit`, `socket`, `socketpair`, `bind`, `connect`, `accept`, `accept4`, `listen`, `sendto`, `recvfrom`, `sendmsg`, `recvmsg`, `shutdown`, `getsockname`, `getpeername`, `getsockopt`, `setsockopt`, `futex`, `madvise`, `mincore`, `mremap`, `msync`, `sched_yield`, `sched_getaffinity`, `sched_setaffinity`, `uname`, `chdir`, `getcwd`, `fcntl`, `lseek`, `unlink`, `unlinkat`, `mkdir`, `mkdirat`, `rmdir`, `rename`, `renameat`, `renameat2`, `chmod`, `fchmod`, `fchmodat`, `chown`, `fchown`, `fchownat`, `link`, `linkat`, `symlink`, `symlinkat`, `readlink`, `readlinkat`, `statfs`, `fstatfs`, `getdents`, `getdents64`, `utime`, `utimes`, `utimensat`, `futimesat`.
- **Block** (`SCMP_ACT_ERRNO(EPERM)`): `ptrace`, `process_vm_readv`, `process_vm_writev`, `mount`, `umount`, `umount2`, `setuid`, `setgid`, `setreuid`, `setregid`, `setresuid`, `setresgid`, `setfsuid`, `setfsgid`, `bpf`, `kexec_load`, `kexec_file_load`, `init_module`, `finit_module`, `delete_module`, `pivot_root`, `chroot`, `swapon`, `swapoff`, `reboot`, `quotactl`, `iopl`, `ioperm`, `personality` (with restricted args), `keyctl`, `add_key`, `request_key`, `move_pages`, `migrate_pages`, `mbind`, `set_mempolicy`, `get_mempolicy`, `userfaultfd`, `perf_event_open`.
- **Block** (`SCMP_ACT_KILL_PROCESS`): everything else not in the allow list. Kill-process rather than EPERM-deny for unknown syscalls hardens against future syscall additions being abused.

The seccomp filter is built using `libseccomp`-equivalent helpers (we ship a TypeScript builder that emits raw BPF bytecode — no native `libseccomp` dependency; reviewed in the implementation plan).

**`nimbus-sandbox-helper` binary:**

- Tiny C program (~200 LOC) — single-purpose, audit-able. Source in `packages/gateway/src-native/sandbox-helper/main.c`.
- Built as part of the Linux release pipeline; shipped as `<install-dir>/bin/nimbus-sandbox-helper`.
- `setcap cap_net_admin+ep` applied by the `.deb` / `.rpm` `postinst` script; manual tarball install instructions document the same. The installer-script changes are part of PR 1's diff.
- Modes:
  - `nimbus-sandbox-helper --check-caps` → print `OK` and exit 0 iff `cap_net_admin` is in permitted set; otherwise print reason and exit 1. Used by the Gateway startup probe.
  - `nimbus-sandbox-helper --allow <host> [--allow <host> ...] -- <argv...>` → enforce-and-exec mode (operation below).
- Enforce-and-exec operation:
  1. Parse `--allow <host>` flags; resolve each to one or more IPv4 + IPv6 addresses.
  2. `unshare(CLONE_NEWNET)` — creates a new netns owned by the host's user namespace; the helper has real `CAP_NET_ADMIN` here.
  3. Set up a veth pair: peer `nb-out-<pid>` in host netns, peer `nb-in-<pid>` in the new netns; bring up `lo` and `nb-in-<pid>`; add a default route through the host peer; configure host-side NAT (`iptables -t nat -A POSTROUTING -s <netns-subnet> -j MASQUERADE`) once at Gateway startup, not per-spawn.
  4. Install iptables (and `ip6tables`) rules inside the new netns: default-drop `OUTPUT`; accept TCP to each resolved address on port 443 (HTTPS); accept established/related; accept DNS (UDP 53 + TCP 53) to `127.0.0.53` and the resolvers declared in `/etc/resolv.conf`.
  5. Drop `CAP_NET_ADMIN` from the effective + inheritable + permitted sets via `prctl(PR_CAPBSET_DROP)` + `cap_set_proc`.
  6. `execv` the supplied argv — which is `bwrap --share-net ... <cmd> <args>`. Bwrap inherits the helper-created netns (because `--share-net` means "do not create a new netns") and layers its own user/pid/uts/ipc isolation on top.
- DNS handling: rules permit DNS queries to the system resolver, which means the connector can resolve any hostname — but it can only `connect()` to the IPs allowed by the iptables rules. Future hostname-resolution-IP-change is handled by periodic re-resolve in a follow-up; PR 1's helper resolves once at exec-time, and connectors handle DNS-rotation by retrying on connection failure.
- IPv6: parallel rule installation via `ip6tables`.

### macOS — `packages/gateway/src/platform/sandbox/darwin.ts`

**Gated on viability spike.** Before the darwin branch is implemented, the spike documented in §2 row 1 runs in the worktree and the result is recorded in this spec under §9 (added in a follow-up commit during PR 1 development). The two outcomes:

**Spike pass → `sandbox-exec` path:**

- Generate a `.sb` profile per spawn (written to scoped temp dir, deleted on child exit):

  ```scheme
  (version 1)
  (deny default)
  (allow process-fork process-exec)
  (allow signal (target self))
  (allow file-read*
    (subpath "<opts.cwd>")
    (subpath "<scoped-tmpdir>")
    (subpath "/usr/lib")
    (subpath "/usr/bin")
    (subpath "/System")
    (subpath "/private/etc"))
  (allow file-write*
    (subpath "<opts.cwd>")
    (subpath "<scoped-tmpdir>"))
  (allow network*
    (remote tcp "*:443" (host "<h1>"))
    (remote tcp "*:443" (host "<h2>"))
    ...
    (remote udp "*:53"))
  (allow mach-lookup) ; minimum for Bun to bootstrap
  (allow iokit-open)  ; minimum for crypto
  ```

- Spawn: `sandbox-exec -f <profile.sb> <cmd> <args>`.
- Hostname matching in SBPL `(remote tcp (host ...))` is dynamic (kernel resolver, not policy-compile-time). DNS-rotation works.
- `isFullyActive() → true`.

**Spike fail → minimal `EndpointSecurity` wrapper:**

- Requires `com.apple.developer.endpoint-security.client` entitlement.
- Significantly increases PR 1 size: code signing + notarization changes to the release pipeline.
- The same follow-up commit that records the spike outcome in §9 adds the detailed `EndpointSecurity` design (event subscriptions, ESF authorization rules) inline under §4 darwin.
- The spike's result determines which sub-section of §4 darwin is implemented; both sub-sections cannot coexist in the merged PR.

### Windows — `packages/gateway/src/platform/sandbox/win32.ts`

- At extension install: `CreateAppContainerProfile(L"nimbus-ext-<id>", L"Nimbus extension <id>", L"<id>", NULL, 0, &sid)`.
- `permissions.network` non-empty → AppContainer SID gets the `internetClient` capability; empty → no network capability.
- `permissions.filesystem.{read,write}` → corresponding ACEs added to the listed paths' ACLs via `SetNamedSecurityInfo` with the AppContainer SID. cwd + scoped temp dir get always-on ACEs.
- Spawn: `CreateProcessAsUserW` with `STARTUPINFOEX` carrying `PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES` populated from the AppContainer SID + capability list.

**Known platform asymmetry — Windows is all-or-nothing network in PR 1.**

The AppContainer `internetClient` capability allows outbound network when granted, denies it when absent — but does not filter by host. Per-host filtering on Windows would require Windows Filtering Platform (WFP) rules, which is significantly heavier than the Linux helper-binary approach (WFP callout drivers need kernel-mode signing and a Windows hardware program enrollment).

PR 1 accepts the asymmetry:

| OS | Network policy | `permissions.network: ["a.com", "b.com"]` | `permissions.network: []` or absent |
| -- | -------------- | ----------------------------------------- | ----------------------------------- |
| Linux | Per-host (with helper) | `connect()` to `a.com` or `b.com` succeeds; to anything else, `ECONNREFUSED` (iptables `--reject-with icmp-port-unreachable`) | bwrap `--unshare-net`; no network |
| Linux (fallback) | All-or-nothing | `--share-net`; full network available | bwrap `--unshare-net`; no network |
| macOS (`sandbox-exec`) | Per-host | `connect()` to `a.com` or `b.com` succeeds; to anything else, `EPERM` | sandbox-exec policy denies all network |
| Windows | All-or-nothing | `internetClient` granted; full network available | no `internetClient`; no network |

`isFullyActive()` returns `false` on Windows when `permissions.network` is non-empty (because per-host is not enforced). The structured-log warning at Gateway startup names the asymmetry. Reported under `sandbox.platform_capabilities` in `nimbus diag --json`. Windows-side WFP per-host filtering is a tracked follow-up; the contract tests on Windows assert the listed host succeeds + filesystem denies work, but the negative network probe is **skipped on Windows** with an explicit `test.skip("Windows: per-host network filtering not enforced in PR 1", ...)`.

**Cleanup (per §2 row 2):**

- Profile created at install → deleted at uninstall (`DeleteAppContainerProfile` after the running-extension terminate sequence).
- Startup orphan-reap: enumerate registry sub-keys under `GetAppContainerRegistryLocation()` matching `nimbus-ext-*`; cross-reference against `extension_state.id`; `DeleteAppContainerProfile` on any orphan.

## Section 5 — Lazy-mesh spawn wiring

The four files under `packages/gateway/src/connectors/lazy-mesh/` that today call `spawn(cmd, args, { env: extensionProcessEnv(...) })` are each rewritten to call `sandboxRunner.spawn(cmd, args, { manifest, env: extensionProcessEnv(...), cwd })`:

| File | Change |
| ---- | ------ |
| `mesh.ts` | The single `spawn(...)` call in the connector-startup path gains a `manifest` lookup before spawning and routes through `sandboxRunner.spawn`. |
| `connector-spawns.ts` | Same pattern; the function gains a `manifest` parameter. |
| `phase3-config.ts` | Same pattern; the Phase-3 lazy-mesh config bundle's spawn helper. |
| `user-mcp.ts` | User-installed MCP server spawns; the I15 wiring applies to user-installed third-party MCPs too. (Pre-T2 user MCPs without `permissions.*` hit the hard-disable path at registry load — they never reach this spawn site.) |

`extensionProcessEnv` retains its current shape and call sites — it remains the inner env builder. The outer wrapper `sandboxRunner.spawn` is what changes. I1 invariant is unaffected; the I1 enforcement test continues to assert `{ ...process.env }` does not appear under `connectors/`.

## Section 6 — First-party connector permissions migration

The 30 first-party connectors are listed in `packages/mcp-connectors/`. Each gets a `permissions.network` declaration in its `nimbus.extension.json`. The local-files + iac-cli connectors get `permissions.filesystem` declarations and no `permissions.network` (or `permissions.network: []` — both forms are equivalent at runtime).

**Enumeration is deferred to the implementation plan.** The spec locks the requirement: every first-party connector in `packages/mcp-connectors/` declares a `permissions` object whose `network` list contains exactly the hosts that connector contacts in production. The plan enumerates each connector + its hosts, derived from each connector's existing source code. Spot-checks during plan-writing:

- `github` → `api.github.com`
- `gitlab` → `gitlab.com`, `<self-hosted-gitlab>` (configurable; PR 1 documents how user-configured hosts extend the allow-list at install time — for self-hosted instances, the per-extension config triggers a manifest re-validation + sandbox restart)
- `slack` → `slack.com`, `api.slack.com`, `wss-primary.slack.com` (WebSocket endpoints)
- `aws` → AWS service hostnames per region (the full set is documented in the AWS SDK; `permissions.network` lists the regional control-plane prefixes — finalized in the plan)
- `local-files` → no network; `permissions.filesystem.read` + `permissions.filesystem.write` declarations
- `iac-cli` → no network for the connector itself (terraform / pulumi are spawned as subprocesses; they need their own sandbox, which is **out of scope for PR 1** — the connector's `execve` of `terraform` runs in the same sandbox as the connector and inherits the same `permissions.*`; this is acceptable because IaC tools' network needs are well-defined and finite)

User-configurable hosts (self-hosted GitLab, self-hosted Jira, etc.) are handled by the connector's existing per-extension config mechanism — the connector ships with a base `permissions.network` and the configured host (read from the connector's TOML config or vault entry at Gateway startup) extends the in-memory manifest before the sandbox spawn. The exact configuration surface per connector (which TOML key, which vault entry) is enumerated in the implementation plan. No new CLI command is introduced in PR 1; the augmentation happens transparently at spawn time.

## Section 7 — Invariant I15

### Statement

`I15` — **Sandbox runner is intrinsic to every extension spawn.** Every code path that spawns an extension process under `packages/gateway/src/connectors/` MUST route through `SandboxRunner.spawn(...)`. Bare `spawn(` outside `packages/gateway/src/platform/sandbox/sandbox-runner.ts` is forbidden.

### Triple wiring

| Layer | Location | Failure mode |
| ----- | -------- | ------------ |
| Production wiring | `packages/gateway/src/connectors/lazy-mesh/{mesh.ts,connector-spawns.ts,phase3-config.ts,user-mcp.ts}` — each spawn site calls `sandboxRunner.spawn(...)`. | Code review + I15 enforcement test catches a regression that drops the wrapper. |
| Docs entry | `docs/SECURITY-INVARIANTS.md` gains an §I15 row in the table, matching the I1–I14 pattern: invariant statement + wiring file:line + anti-pattern. The §I15 section beneath the table mirrors the §I1 + §I11 structure (statement, anti-patterns, audit cross-reference). | Out-of-date docs are caught by reviewers; the static `check-doc-references.ts` audit catches broken file:line links. |
| Enforcement test | `packages/gateway/src/security-invariants.test.ts` gains four assertions (one per lazy-mesh file) that grep the source for `sandboxRunner.spawn(` and assert each file imports the runner. The fifth assertion asserts `packages/gateway/src/platform/sandbox/sandbox-runner.ts` exports a `SandboxRunner` interface. | Removing the wiring or renaming the runner breaks the test in CI before merge. |
| Static-audit complement | `scripts/structure-audit/check-nimbus-invariants.ts` `D10` rule (today: every `spawn(` under `connectors/` must reach `extensionProcessEnv()` — I1) gains a parallel check: every `spawn(` under `connectors/` must also reach `sandboxRunner.spawn(...)` — I15. The only file exempt from both checks is `packages/gateway/src/platform/sandbox/sandbox-runner.ts` itself, where the underlying `spawn` actually happens. Implemented as a second AST pattern in the same audit pass. | `bun run audit:invariants` exits non-zero on regression. |

### Anti-pattern locked into the audit + test

- A new connector spawn site that calls `spawn(cmd, args, { env: extensionProcessEnv(...) })` directly, skipping `sandboxRunner.spawn`. The `D10` extension catches this at static time; the enforcement test catches it if `D10` is somehow disabled.
- Reusing `SandboxRunner.spawn` for non-extension spawns (e.g., the Gateway spawning a sub-process for its own purposes) is allowed but unnecessary; the runner's contract requires a `manifest` parameter, which non-extension callers cannot honestly supply. Spawning the Gateway itself, or first-party Bun processes (CLI, IPC server, voice service) is out of T2.

## Section 8 — Contract tests

### SDK API surface

`@nimbus-dev/sdk/testing` (in `packages/sdk/src/testing/sandbox-contract.ts`) exports:

```typescript
/**
 * Verify that the sandbox enforces the declared permissions for a manifest.
 *
 * Reads the manifest, spawns a probe child via the gateway's SandboxRunner
 * with the declared permissions.*, runs three probes per OS:
 *   1. fetch(listed-host) succeeds
 *   2. fetch(192.0.2.1) returns ECONNREFUSED / EPERM (skipped on Windows in PR 1)
 *   3. read(/etc/passwd or %WINDIR%\System32\config\SAM) returns EACCES
 *
 * Throws on probe-result mismatch. Designed to be called from a single
 * Vitest `it(...)` in the connector's `test/sandbox.test.ts`.
 */
export function runSandboxContractTests(manifestPath: string): Promise<void>;
```

### Probe binary

The probe is a tiny Bun script shipped with the SDK at `packages/sdk/src/testing/sandbox-probe.ts`. It accepts `--probe={network-listed,network-unlisted,fs-denied}` and exits with a known status code per outcome. The SDK consumer never invokes the probe directly — `runSandboxContractTests` orchestrates the three spawns and asserts the outcomes.

### Per-connector wiring

Each first-party connector adds `packages/mcp-connectors/<name>/test/sandbox.test.ts`:

```typescript
import { runSandboxContractTests } from "@nimbus-dev/sdk/testing";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const manifestPath = resolve(fileURLToPath(import.meta.url), "../../nimbus.extension.json");

describe("sandbox contract", () => {
  it("respects declared permissions", async () => {
    await runSandboxContractTests(manifestPath);
  });
});
```

The 30 invocations are part of PR 1's exit criteria (§12). The test runs in the 3-OS CI matrix; on Windows the negative-network probe is skipped with an explicit `test.skip` and a reason string referencing §4 Windows asymmetry.

### Third-party usage

Third-party extension authors can use the same import path; the SDK doesn't gate `runSandboxContractTests` on first-party-only. The contract is the same contract a first-party connector verifies — the only difference is the manifest under test.

## Section 9 — macOS spike result (intentional placeholder — filled in during PR 1 development)

This section is the **only intentional placeholder** in this spec. It will be filled in during PR 1 development, after the viability spike completes. Spike script + raw output land at `.worktrees/phase-5-t2-pr1-sandbox/scripts/spike-darwin-sandbox-exec.sh`. The spike runs:

1. `sandbox-exec -p '<minimal profile>' bun -e 'console.log(await fetch("https://api.github.com/zen").then(r => r.status))'` — expects `200`.
2. `sandbox-exec -p '<minimal profile>' bun -e 'console.log(await fetch("http://192.0.2.1").catch(e => e.code))'` — expects `EPERM` or `ECONNREFUSED`.
3. `sandbox-exec -p '<minimal profile>' bun -e 'console.log(await Bun.file("/etc/passwd").text().catch(e => e.code))'` — expects `EACCES`.
4. Repeat on macOS 14 (Sonoma) + macOS 15 (Sequoia) in the existing CI matrix `_test-suite.yml`.

If all three probes pass on both OS versions: lock `sandbox-exec`; fill in §4 darwin spike-pass branch as the implementation; remove the spike-fail branch.

If any probe fails: document which one + on which OS version; lock the `EndpointSecurity` fallback path. The fallback raises PR 1 by an estimated 30–40 % LOC (code signing + entitlement + notarization changes); PR 1 stays a single PR — the spike result decides the darwin branch implementation, but not the PR's identity.

## Section 10 — Coverage gate + CI

### New coverage gate `test:coverage:sandbox`

Add a new `test:coverage:sandbox` script to `package.json` mirroring the existing per-subsystem pattern (`test:coverage:engine`, `test:coverage:vault`, etc.). The exact shape of the script — Bun coverage flags, threshold-enforcement wrapper, glob expressions — follows whatever pattern the existing scripts use; the implementation plan locks the line.

Gate target: ≥ 80 % line coverage on `packages/gateway/src/platform/sandbox/`.

Wire the new gate into `.github/workflows/_test-suite.yml` next to the existing per-subsystem gates. Add the row to `.claude/commands/nimbus-commands.md` under "Coverage gates (enforced in CI)". Both edits are part of PR 1's diff.

### Existing gates that must stay green

- `test:coverage:extensions` ≥ 85 % — extends to the new manifest-validator code.
- `test:coverage:engine` ≥ 85 % — unaffected.
- The full `test:ci` 3-OS push matrix must pass on Linux, macOS, Windows.

### CI matrix changes

- `_test-suite.yml`: add a `linux-sandbox-helper-setup` step that runs `setcap cap_net_admin+ep <install-dir>/bin/nimbus-sandbox-helper` after the build step, before the integration-test step. (CI runs as the workflow user, which has `sudo` available — the `setcap` invocation is `sudo setcap ...`.)
- macOS: no extra setup; `sandbox-exec` is built into the OS. (If the spike forces `EndpointSecurity`, a code-signing setup step is added in the same follow-up commit that fills §9.)
- Windows: no extra setup; AppContainer is built into the OS.

## Section 11 — Out of scope

The full out-of-scope list from T2 spec §2 PR 1 carries forward. Items reiterated + clarified for this per-PR spec:

- **Sandboxing the Gateway itself** — Phase 6+ territory.
- **Sandboxing first-party Bun processes** (CLI, IPC server, voice service) — out of T2.
- **Browser/terminal automation sandbox** — Phase 11.
- **Per-connector filesystem scopes finer than read/write top-level paths** — minimum-viable is whole-tree allow-deny prefixes; glob support deferred.
- **Runtime permission elevation** — extension cannot request `network` mid-run; if needed, follow-up HITL.
- **Custom per-connector seccomp rules** — locked: none at PR 1 (§2 row 5).
- **Defense against same-uid setuid bypasses** — extensions are not setuid binaries; existing install-time check enforces.
- **Windows per-host network filtering** — locked: all-or-nothing on Windows in PR 1 (§4 Windows asymmetry table); WFP-based per-host filtering is a tracked follow-up.
- **Linux netns IPv6 + IPv4 dual-stack rules at runtime** — `nimbus-sandbox-helper` resolves both v4 + v6 at exec time; rule re-resolution on DNS rotation is deferred to a follow-up.
- **EndpointSecurity rollout if the macOS spike forces the fallback** — same PR as the spike-pass path, but spike result locks which sub-section is implemented.
- **Pre-T2 extension auto-removal** — hard-disable retains the install record so user can `nimbus extension reinstall <id>`; auto-removal is not in scope.
- **Migration of `permissions: string[]` array-form entries to object-form by content** — array-form normalizes to default-deny; the existing array entries (`"read-files"`, `"trash"`) are dropped (they were never load-bearing security defenses — the HITL gate is).
- **Sandboxing of `terraform` / `pulumi` subprocesses spawned by the `iac-cli` connector** — they inherit the connector's sandbox; finer-grained per-tool scopes are out of T2.

## Section 12 — Exit criteria

PR 1 is mergeable when **all** the following are true:

1. `packages/gateway/src/platform/sandbox/sandbox-runner.ts` + `linux.ts` + `darwin.ts` + `win32.ts` exist with the §4 implementations.
2. The macOS spike has run and §9 is filled in; darwin branch implements the spike-pass-determined path.
3. Manifest schema additions (§3) land in `packages/gateway/src/extensions/manifest.ts`; validator rejects unknown `permissions.*` keys; array-form normalization works.
4. All four spawn sites under `connectors/lazy-mesh/` route through `sandboxRunner.spawn`.
5. All 30 first-party connector `nimbus.extension.json` files declare a `permissions` object with the right `network` (or `filesystem`) entries.
6. Pre-T2 extensions without `permissions.*` are hard-disabled at registry-load with the §1 error message; `nimbus extension list` flags them `[needs-reinstall]`; `nimbus diag --json` reports `extensions.disabled_pre_t2` count.
7. `nimbus-sandbox-helper` binary builds on Linux; Linux installer scripts (`.deb`, `.rpm`, tarball) apply `setcap cap_net_admin+ep`.
8. I15 triple wired: production sites (§7), `docs/SECURITY-INVARIANTS.md` §I15 row + section, `security-invariants.test.ts` assertions, extended `D10` rule in `check-nimbus-invariants.ts`.
9. `runSandboxContractTests(manifestPath)` exported from `@nimbus-dev/sdk/testing`; 30 connector test files call it; all pass on the 3-OS CI matrix (Windows negative-network probe skipped with explicit reason).
10. New coverage gate `test:coverage:sandbox` ≥ 80 % green; `test:coverage:extensions` ≥ 85 % stays green.
11. `bun run audit:invariants` passes (D10 extension catches the deliberate-violation test fixture).
12. `bun run test:ci` green on the 3-OS push matrix.
13. `docs/SECURITY-INVARIANTS.md` updated (§I15 row + section); `docs/architecture.md` "Extension Registry" section updated with the new manifest schema; `CLAUDE.md` line 10 + `GEMINI.md` updated with T2 PR 1 ✅ entry; `docs/roadmap.md` T2 PR 1 sub-checkbox flipped; `.claude/commands/nimbus-security-invariants.md` updated with I15.
14. `.claude/commands/nimbus-commands.md` updated with the new `test:coverage:sandbox` row.

## Section 13 — See also

- [`./2026-05-16-phase-5-t2-design.md`](./2026-05-16-phase-5-t2-design.md) §2 PR 1 — parent sequencing scope this spec refines.
- [`./2026-05-16-phase-5-t2-design-review.md`](./2026-05-16-phase-5-t2-design-review.md) — review feedback rolled into the parent T2 spec at rev 2, including the macOS sandbox-exec viability + Windows AppContainer lifecycle items that this spec resolves.
- [`../../SECURITY-INVARIANTS.md`](../../SECURITY-INVARIANTS.md) — I1 (current); I15 (new in this PR).
- [`../../../.claude/commands/nimbus-security-invariants.md`](../../../.claude/commands/nimbus-security-invariants.md) — the invariant triple rule that I15 must satisfy.
- [`../../../.claude/commands/nimbus-connector-authoring.md`](../../../.claude/commands/nimbus-connector-authoring.md) — first-party connector pattern; the 30-connector manifest migration follows this skill's authoring checklist.
- [`../../../.claude/commands/nimbus-architecture.md`](../../../.claude/commands/nimbus-architecture.md) — the PAL pattern (`platform/{win32,darwin,linux}.ts`) that `platform/sandbox/` mirrors.
- [`../../../.claude/commands/nimbus-testing.md`](../../../.claude/commands/nimbus-testing.md) — contract-test conventions; `runSandboxContractTests` follows the SDK-exported test-function pattern.
