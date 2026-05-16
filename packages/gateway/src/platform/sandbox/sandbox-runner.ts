import type { ChildProcess, SpawnOptions } from "node:child_process";
import type { ExtensionManifest } from "../../extensions/manifest.ts";

export interface SandboxSpawnOptions {
  /** Resolved manifest of the extension being spawned. Must carry an object-form `permissions`. */
  manifest: ExtensionManifest;
  /** Output of `extensionProcessEnv(...)` — inner env builder (I1). */
  env: Record<string, string>;
  /** Extension's working directory. Always FS-accessible inside the sandbox. */
  cwd: string;
  stdio?: SpawnOptions["stdio"];
}

export interface SandboxRunner {
  readonly platform: "linux" | "darwin" | "win32";
  spawn(cmd: string, args: string[], opts: SandboxSpawnOptions): ChildProcess;
  /**
   * True iff the full sandbox is active. False on Windows when
   * `permissions.network` is non-empty (no per-host enforcement),
   * or on Linux when the helper binary is missing or lacks
   * `CAP_NET_ADMIN`. Reported in `nimbus diag --json`.
   */
  isFullyActive(): boolean;
  /** Reason for degraded posture, or `null` when fully active. */
  degradedReason(): string | null;
}

export function createSandboxRunner(): SandboxRunner {
  switch (process.platform) {
    case "linux": {
      const { createLinuxSandboxRunner } = require("./linux") as typeof import("./linux.ts");
      return createLinuxSandboxRunner();
    }
    case "darwin": {
      const { createDarwinSandboxRunner } = require("./darwin") as typeof import("./darwin.ts");
      return createDarwinSandboxRunner();
    }
    case "win32": {
      const { createWin32SandboxRunner } = require("./win32") as typeof import("./win32.ts");
      return createWin32SandboxRunner();
    }
    default:
      throw new Error(`Unsupported platform for sandbox: ${process.platform}`);
  }
}
