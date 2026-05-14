import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { envGet } from "./env.ts";

/** Mirrors `packages/gateway/src/platform/paths.ts` (CLI must not import gateway source). */
export type CliPlatformPaths = {
  configDir: string;
  dataDir: string;
  logDir: string;
  socketPath: string;
  extensionsDir: string;
  tempDir: string;
};

/**
 * Resolves the IPC socket path the CLI uses to connect to the Gateway.
 *
 * Prefers the `NIMBUS_GATEWAY_SOCKET` environment variable when set and
 * non-empty — this lets the cast-driver tripwire harness (Phase 3) point the
 * CLI at a fake-Gateway socket without touching production config.
 * Falls back to the platform-default path when the env var is absent.
 */
export function resolveSocketPath(): string {
  const envOverride = envGet("NIMBUS_GATEWAY_SOCKET");
  if (envOverride !== undefined && envOverride.length > 0) {
    return envOverride;
  }
  return defaultSocketPath();
}

/** Returns the platform-default Gateway socket path (no env-var override). */
function defaultSocketPath(): string {
  switch (process.platform) {
    case "win32":
      return String.raw`\\.\pipe\nimbus-gateway`;
    case "darwin": {
      const tmp = envGet("TMPDIR") ?? "/tmp";
      return join(tmp, "nimbus-gateway.sock");
    }
    default: {
      const runtimeDir = envGet("XDG_RUNTIME_DIR") ?? tmpdir();
      return join(runtimeDir, "nimbus-gateway.sock");
    }
  }
}

export function getCliPlatformPaths(): CliPlatformPaths {
  switch (process.platform) {
    case "win32": {
      const appData = envGet("APPDATA");
      const localAppData = envGet("LOCALAPPDATA");
      if (appData === undefined || appData.length === 0) {
        throw new Error("APPDATA is not set. Nimbus requires a standard Windows user profile.");
      }
      if (localAppData === undefined || localAppData.length === 0) {
        throw new Error(
          "LOCALAPPDATA is not set. Nimbus requires a standard Windows user profile.",
        );
      }
      const configDir = join(appData, "Nimbus");
      const dataDir = join(localAppData, "Nimbus", "data");
      return {
        configDir,
        dataDir,
        logDir: join(dataDir, "logs"),
        socketPath: resolveSocketPath(),
        extensionsDir: join(localAppData, "Nimbus", "extensions"),
        tempDir: join(tmpdir(), "nimbus"),
      };
    }
    case "darwin": {
      const root = join(homedir(), "Library", "Application Support", "Nimbus");
      return {
        configDir: root,
        dataDir: root,
        logDir: join(root, "logs"),
        socketPath: resolveSocketPath(),
        extensionsDir: join(root, "extensions"),
        tempDir: join(tmpdir(), "nimbus"),
      };
    }
    default: {
      const home = homedir();
      const configRoot = envGet("XDG_CONFIG_HOME") ?? join(home, ".config");
      const dataRoot = envGet("XDG_DATA_HOME") ?? join(home, ".local", "share");
      const configDir = join(configRoot, "nimbus");
      const dataDir = join(dataRoot, "nimbus");
      return {
        configDir,
        dataDir,
        logDir: join(dataDir, "logs"),
        socketPath: resolveSocketPath(),
        extensionsDir: join(dataDir, "extensions"),
        tempDir: join(tmpdir(), "nimbus"),
      };
    }
  }
}
