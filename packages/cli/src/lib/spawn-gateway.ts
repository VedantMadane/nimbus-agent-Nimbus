import { type SpawnOptions, spawn } from "node:child_process";
import { closeSync, existsSync, fstatSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";

import type { CliPlatformPaths } from "../paths.ts";
import { resolveGatewayLaunch } from "./resolve-gateway-launch.ts";

const PROFILE_FILENAME = ".nimbus-profile";

/** Local calendar date for log filenames (append same file for multiple starts on the same day). Keep in sync with `packages/gateway/src/platform/gateway-log-file.ts`. */
function gatewayLogBasename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `gateway-${String(y)}-${m}-${day}.log`;
}

function readActiveProfileName(configDir: string): string | undefined {
  const p = join(configDir, PROFILE_FILENAME);
  if (!existsSync(p)) {
    return undefined;
  }
  try {
    const raw = readFileSync(p, "utf8").trim();
    return raw === "" || raw === "default" ? undefined : raw;
  } catch {
    return undefined;
  }
}

/**
 * Bun honors these env vars to launch its built-in inspector. When `nimbus
 * start` runs under VS Code's auto-attach, these are set on the CLI and
 * inheriting them in the gateway child causes the child to try to listen on
 * the same port the parent CLI already grabbed — failing with EADDRINUSE
 * before IPC is bound. The gateway is meant to be a detached background
 * process; users who want to debug it should run the gateway binary directly
 * under their debugger of choice.
 */
const BUN_INSPECTOR_ENV_KEYS: readonly string[] = [
  "BUN_INSPECT",
  "BUN_INSPECT_BRK",
  "BUN_INSPECT_NOTIFY",
  "BUN_INSPECT_PRELOAD",
  "BUN_INSPECT_CONNECT_TO",
  "BUN_INSPECT_DISABLE",
  "NODE_INSPECT_RESUME_ON_START",
  "NODE_OPTIONS",
];

export function stripInspectorEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...env };
  for (const k of BUN_INSPECTOR_ENV_KEYS) {
    delete out[k];
  }
  return out;
}

export type SpawnGatewayOptions = {
  /** Merged into the child environment (overrides duplicate keys). */
  readonly extraEnv?: Readonly<Record<string, string>>;
};

/**
 * Spawns the Gateway with the same model as `nimbus start` (detached on Windows, log append).
 * The Gateway itself writes `gateway.json` after IPC bind so any launcher (CLI,
 * IDE debugger, systemd) ends up with the same state file on disk; the CLI just
 * passes the log file path via `NIMBUS_GATEWAY_LOG_PATH` so the state file
 * records it.
 */
export async function spawnGateway(
  paths: CliPlatformPaths,
  opts: SpawnGatewayOptions = {},
): Promise<{ pid: number; logPath: string; logStartOffset: number }> {
  const launch = resolveGatewayLaunch(process.execPath, import.meta.url);
  if (!launch.ok) {
    throw new Error(launch.message);
  }

  const logPath = join(paths.logDir, gatewayLogBasename());
  const executable = launch.cmd[0];
  if (executable === undefined || executable === "") {
    throw new Error("Gateway launch command is empty");
  }
  const spawnArgs = launch.cmd.slice(1);
  // Open the log first (creates the file if missing in `"a"` mode), then
  // `fstat` the same descriptor to capture the offset BEFORE the marker
  // write. Using one descriptor for both avoids the TOCTOU between an
  // existence/stat check and the subsequent open.
  const logFd = openSync(logPath, "a");
  const logStartOffset = fstatSync(logFd).size;
  let pid: number;
  try {
    writeSync(
      logFd,
      `\n--- ${new Date().toISOString()} nimbus: spawning gateway (${launch.cmd.join(" ")}) ---\n`,
    );
    const childEnv: NodeJS.ProcessEnv = stripInspectorEnv(process.env);
    childEnv["NIMBUS_GATEWAY_LOG_PATH"] = logPath;
    const profile = readActiveProfileName(paths.configDir);
    if (profile !== undefined) {
      childEnv["NIMBUS_PROFILE"] = profile;
    }
    if (opts.extraEnv !== undefined) {
      for (const [k, v] of Object.entries(opts.extraEnv)) {
        childEnv[k] = v;
      }
    }
    const spawnOpts: SpawnOptions = {
      cwd: launch.cwd,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
      env: childEnv,
    };
    if (process.platform === "win32") {
      spawnOpts.detached = true;
    }
    const child = spawn(executable, spawnArgs, spawnOpts);
    const p = child.pid;
    if (p === undefined) {
      throw new Error("Gateway spawn did not return a process id");
    }
    pid = p;
    child.unref();
  } finally {
    closeSync(logFd);
  }

  return { pid, logPath, logStartOffset };
}
