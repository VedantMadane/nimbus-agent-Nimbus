#!/usr/bin/env bun
/**
 * Nimbus Dev Doctor: Checks the development environment for prerequisites,
 * configuration issues, and common pitfalls.
 *
 * Usage: bun scripts/dev-doctor.ts
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/root.ts";

const isLinux = process.platform === "linux";
const isDarwin = process.platform === "darwin";
const isWin32 = process.platform === "win32";

type Status = "OK" | "INFO" | "WARN" | "ERROR";

const STATUS_COLORS: Record<Status, string> = {
  OK: "\x1b[32m",
  INFO: "\x1b[36m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
};

function log(status: Status, message: string): void {
  const color = STATUS_COLORS[status];
  const reset = "\x1b[0m";
  process.stdout.write(`[${color}${status}${reset}] ${message}\n`);
}

async function checkBun(): Promise<void> {
  const version = Bun.version;
  const [major, minor] = version.split(".").map(Number);
  if (major !== undefined && (major > 1 || (major === 1 && minor !== undefined && minor >= 2))) {
    log("OK", `Bun version: ${version} (>= 1.2 required)`);
  } else {
    log("ERROR", `Bun version: ${version} (< 1.2 is not supported)`);
  }
}

async function checkRust(): Promise<void> {
  try {
    const p = Bun.spawnSync(["rustc", "--version"], { stderr: "ignore" });
    if (p.exitCode === 0) {
      log("OK", `Rust version: ${p.stdout.toString().trim()}`);
    } else {
      log("WARN", "Rust (rustc) not found. Required for building Tauri UI.");
    }
  } catch {
    log("WARN", "Rust (rustc) not found. Required for building Tauri UI.");
  }
}

async function checkNodeModules(): Promise<void> {
  if (existsSync(join(REPO_ROOT, "node_modules"))) {
    log("OK", "Root node_modules found.");
  } else {
    log("ERROR", "Root node_modules missing. Run `bun install`.");
  }
}

/**
 * Linux build dependencies. Distro-agnostic where possible: prefer
 * capability checks (`Bun.which`, `pkg-config --exists`) over package-
 * manager-specific queries so Fedora/Arch users don't get false WARNs.
 */
async function checkLinuxBuildDeps(): Promise<void> {
  // C/C++ toolchain — needed for native deps that lack a prebuilt for the
  // platform. Capability check is the presence of any C compiler driver.
  const ccPath = Bun.which("cc") ?? Bun.which("gcc") ?? Bun.which("clang");
  if (ccPath) {
    log("OK", `C compiler available (${ccPath}).`);
  } else {
    log(
      "WARN",
      "No C compiler found (cc/gcc/clang). Install build-essential (Debian/Ubuntu), Development Tools (Fedora), or base-devel (Arch).",
    );
  }

  // pkg-config — needed by node-gyp for libsecret discovery
  const pkgConfigPath = Bun.which("pkg-config");
  if (!pkgConfigPath) {
    log(
      "WARN",
      "pkg-config not found. Install pkg-config (Debian/Ubuntu) / pkgconf (Fedora/Arch).",
    );
    return;
  }
  log("OK", `pkg-config available (${pkgConfigPath}).`);

  // libsecret development headers — capability-checked via pkg-config so
  // Fedora (libsecret-devel) and Arch (libsecret) aren't flagged.
  const libsecret = Bun.spawnSync(["pkg-config", "--exists", "libsecret-1"], {
    stderr: "ignore",
    stdout: "ignore",
  });
  if (libsecret.exitCode === 0) {
    log("OK", "libsecret-1 development headers available.");
  } else {
    log(
      "WARN",
      "libsecret-1 development headers missing. Install libsecret-1-dev (Debian/Ubuntu), libsecret-devel (Fedora), or libsecret (Arch).",
    );
  }
}

/**
 * Linux runtime requirement: `secret-tool` (from libsecret-tools) is what
 * `nimbus doctor` and the Vault end up calling against the Secret Service.
 * Matches the check in `packages/cli/src/commands/doctor.ts`.
 */
async function checkLinuxSecretTool(): Promise<void> {
  if (Bun.which("secret-tool") === null) {
    log(
      "WARN",
      "secret-tool not on PATH. Install libsecret-tools (Debian/Ubuntu) or libsecret (Fedora/Arch) for the Linux Vault runtime.",
    );
    return;
  }
  log("OK", "secret-tool on PATH.");
}

/**
 * macOS build dependencies: Xcode Command Line Tools provide the C/C++
 * toolchain for native deps + Tauri's `cargo` linker. `xcode-select -p`
 * prints the active developer dir; missing/non-existent → CLT not installed.
 */
async function checkMacosXcodeCLT(): Promise<void> {
  const p = Bun.spawnSync(["xcode-select", "-p"], { stderr: "ignore" });
  const path = p.stdout.toString().trim();
  if (p.exitCode === 0 && path && existsSync(path)) {
    log("OK", `Xcode Command Line Tools at ${path}.`);
  } else {
    log(
      "WARN",
      "Xcode Command Line Tools not installed. Run `xcode-select --install`.",
    );
  }
}

/**
 * Windows: best-effort check for a C++ build toolchain. We only verify a
 * compiler driver is reachable from the current shell — if the user runs
 * dev-doctor from a vanilla PowerShell the tools may exist but not be on
 * PATH, so this is informational, not a hard error.
 */
async function checkWindowsBuildTools(): Promise<void> {
  const cl = Bun.which("cl") ?? Bun.which("clang") ?? Bun.which("gcc");
  if (cl) {
    log("OK", `C/C++ compiler reachable on PATH (${cl}).`);
    return;
  }
  log(
    "INFO",
    "No C/C++ compiler found on PATH. Visual Studio Build Tools (Desktop development with C++) are needed only if a native dep lacks a prebuilt; reachable via the Developer PowerShell shortcut.",
  );
}

async function checkPlatformDeps(): Promise<void> {
  if (isLinux) {
    await checkLinuxBuildDeps();
    await checkLinuxSecretTool();
  } else if (isDarwin) {
    await checkMacosXcodeCLT();
  } else if (isWin32) {
    await checkWindowsBuildTools();
  }
}

/**
 * gcloud is only needed to develop / test against the Google connectors
 * (Drive, Gmail, Photos). Most contributors don't touch those — log INFO
 * so the absence isn't a yellow flag in everyone's terminal.
 */
async function checkGcloud(): Promise<void> {
  try {
    const p = Bun.spawnSync(["gcloud", "--version"], { stderr: "ignore" });
    if (p.exitCode === 0) {
      log("OK", "Google Cloud SDK (gcloud) found.");
    } else {
      log("INFO", "Google Cloud SDK not found (only needed for Google connector dev).");
    }
  } catch {
    log("INFO", "Google Cloud SDK not found (only needed for Google connector dev).");
  }
}

async function main(): Promise<void> {
  process.stdout.write("--- Nimbus Dev Doctor ---\n");
  await checkBun();
  await checkNodeModules();
  await checkRust();
  await checkPlatformDeps();
  await checkGcloud();
  process.stdout.write("-------------------------\n");
}

await main();
