import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CaptureResult, spawnCapture } from "./capture.ts";
import { type EventsScript, FakeGateway } from "./fake-gateway.ts";
import type { CompiledScript, ConsentStep } from "./yaml-script.ts";

/**
 * Per-script harness: opens a fake-Gateway, spawns the CLI per input step,
 * collects captures. Caller drives the lifecycle.
 *
 * Socket override mechanism:
 *  1. Sets NIMBUS_GATEWAY_SOCKET in the spawned CLI's env, which flows through
 *     resolveSocketPath() for the few commands that consult paths.socketPath
 *     directly (serve, start, discoverSocketPath fallback).
 *  2. Writes a fake <dataDir>/gateway.json with `socketPath` pointing at the
 *     temp socket, covering the 26+ commands that read state.socketPath via
 *     readGatewayState(). Both mechanisms must agree on the path.
 *  3. Overrides LOCALAPPDATA / XDG_DATA_HOME / HOME so the CLI's
 *     getCliPlatformPaths() resolves dataDir to our temp directory.
 *
 * Platform-specific dataDir derivation (mirrors packages/cli/src/paths.ts):
 *  - Windows: join(LOCALAPPDATA, "Nimbus", "data")
 *  - macOS:   join(HOME, "Library", "Application Support", "Nimbus")
 *             NOTE: on macOS dataDir == configDir == root (no "data" subdir)
 *  - Linux:   join(XDG_DATA_HOME, "nimbus")
 */

export interface HarnessOpts {
  readonly compiled: CompiledScript;
  readonly events: EventsScript;
  /** Absolute path to the CLI entry, e.g. `packages/cli/src/index.ts`. */
  readonly cliEntry: string;
}

export interface PerStepCapture {
  readonly input: string;
  readonly capture: CaptureResult;
}

export interface HarnessRun {
  readonly captures: ReadonlyArray<PerStepCapture>;
  readonly tmpDirPrefix: string;
}

function socketPathFor(tmpDir: string): string {
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\nimbus-cast-${process.pid}-${Date.now()}`;
  }
  return join(tmpDir, "gw.sock");
}

function writeConsentJsonl(path: string, consents: ReadonlyArray<ConsentStep>): void {
  const lines = consents
    .map((c) => JSON.stringify({ approved: c.consent === "approve" }))
    .join("\n");
  writeFileSync(path, lines.length > 0 ? `${lines}\n` : "", "utf8");
}

/**
 * Derives the CLI's dataDir for a given tmpDir, mirroring getCliPlatformPaths()
 * from packages/cli/src/paths.ts exactly.
 *
 * - Windows:  join(tmpDir, "Nimbus", "data")     [LOCALAPPDATA=tmpDir]
 * - macOS:    join(tmpDir, "Library", "Application Support", "Nimbus")
 *             [HOME=tmpDir] — NOTE: macOS dataDir has NO "data" trailing segment
 * - Linux:    join(tmpDir, "nimbus")             [XDG_DATA_HOME=tmpDir]
 */
function dataDirFor(tmpDir: string): string {
  if (process.platform === "win32") {
    return join(tmpDir, "Nimbus", "data");
  }
  if (process.platform === "darwin") {
    return join(tmpDir, "Library", "Application Support", "Nimbus");
  }
  // Linux (default)
  return join(tmpDir, "nimbus");
}

function writeFakeGatewayState(dataDir: string, socketPath: string): void {
  mkdirSync(dataDir, { recursive: true });
  // readGatewayState() validates { pid: number, socketPath: string, logPath?: string }.
  // Extra fields are silently ignored by the validator (it only checks those three).
  // Use a synthetic PID — the CLI does not verify liveness via kill(pid, 0) before
  // constructing an IPCClient; it trusts the file.
  const state: { pid: number; socketPath: string } = {
    pid: 1,
    socketPath,
  };
  writeFileSync(join(dataDir, "gateway.json"), JSON.stringify(state), "utf8");
}

export async function runHarness(opts: HarnessOpts): Promise<HarnessRun> {
  const tmpDir = mkdtempSync(join(tmpdir(), "cast-driver-"));
  const socketPath = socketPathFor(tmpDir);
  const dataDir = dataDirFor(tmpDir);

  // Write gateway.json BEFORE starting the fake server so commands that read it
  // see the right socket from the moment they spawn.
  writeFakeGatewayState(dataDir, socketPath);

  const gateway = new FakeGateway({ socketPath, events: opts.events });
  await gateway.start();

  const captures: PerStepCapture[] = [];
  try {
    for (let idx = 0; idx < opts.compiled.inputGroups.length; idx += 1) {
      const group = opts.compiled.inputGroups[idx];
      if (group === undefined) continue;

      const consentJsonl = join(tmpDir, `consent-${idx}.jsonl`);
      writeConsentJsonl(consentJsonl, group.consents);

      const cmd = parseInput(group.input.input, opts.cliEntry);
      const result = await spawnCapture({
        cmd,
        env: {
          ...(process.env as Record<string, string>),
          NO_COLOR: "1",
          FORCE_COLOR: "0",
          TERM: "dumb",
          COLUMNS: "120",
          LINES: "40",
          LANG: "C.UTF-8",
          NIMBUS_GATEWAY_SOCKET: socketPath,
          NIMBUS_SCRIPT_CONSENT_SOURCE: consentJsonl,
          // Redirect the CLI's dataDir/configDir resolution to our temp dir.
          // getCliPlatformPaths() reads these per-platform (see paths.ts):
          //   Windows: LOCALAPPDATA → join(LOCALAPPDATA, "Nimbus", "data")
          //   macOS:   HOME         → join(HOME, "Library", "Application Support", "Nimbus")
          //   Linux:   XDG_DATA_HOME → join(XDG_DATA_HOME, "nimbus")
          // Override all three so this is portable across platforms.
          LOCALAPPDATA: tmpDir,
          APPDATA: tmpDir,
          XDG_DATA_HOME: tmpDir,
          XDG_CONFIG_HOME: tmpDir,
          XDG_RUNTIME_DIR: tmpDir,
          HOME: tmpDir,
        },
        timeoutMs: group.input.timeoutMs ?? 60_000,
      });

      captures.push({ input: group.input.input, capture: result });

      // Assert expects
      const combined = result.chunks.map((c) => c.data).join("");
      if (group.input.expect !== undefined && !combined.includes(group.input.expect)) {
        throw new Error(`step ${idx}: expect missed: "${group.input.expect}"`);
      }
      for (const c of group.consents) {
        if (c.expect !== undefined && !combined.includes(c.expect)) {
          throw new Error(`step ${idx}: consent expect missed: "${c.expect}"`);
        }
      }

      gateway.advanceStep();
    }
  } finally {
    await gateway.stop();
  }

  return { captures, tmpDirPrefix: tmpDir };
}

/**
 * Tokenizes a "nimbus <subcommand> <args>" string into argv.
 * Supports single- and double-quoted strings but no backslash escapes.
 * Replaces the leading "nimbus" token with `["bun", cliEntry]` so the
 * harness does not require a globally-installed CLI binary.
 */
function parseInput(rawInput: string, cliEntry: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < rawInput.length; i += 1) {
    const ch = rawInput[i];
    if (quote !== null) {
      if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === " " || ch === "\t") {
      if (cur.length > 0) {
        tokens.push(cur);
        cur = "";
      }
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) tokens.push(cur);
  if (tokens[0] !== "nimbus") {
    throw new Error(`harness: input must start with "nimbus", got "${tokens[0] ?? ""}"`);
  }
  // Replace "nimbus" with `bun <cliEntry>` so we don't need a globally-installed CLI
  return ["bun", cliEntry, ...tokens.slice(1)];
}
