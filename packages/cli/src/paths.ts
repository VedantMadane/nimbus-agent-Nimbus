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
 * SCOPE NOTE for Phase 3 cast-tripwire harness consumers:
 * `NIMBUS_GATEWAY_SOCKET` flows into `paths.socketPath` here, but most CLI
 * commands construct their IPC client from `state.socketPath` read out of
 * `<dataDir>/gateway.json` via `readGatewayState()` (see
 * `packages/cli/src/lib/gateway-process.ts`). So this env var alone covers
 * `serve.ts`, `start.ts`, and the `discoverSocketPath` fallback in
 * `@nimbus-dev/client` — NOT the 26+ `new IPCClient(state.socketPath)` call
 * sites in command files. The cast-driver harness (Task 9) must EITHER also
 * write `gateway.json` pointing at the fake socket, OR ensure `gateway.json`
 * is absent so commands fall back to `discoverSocketPath()`, which then
 * honours this env var.
 */

/**
 * Resolves the IPC socket path the CLI uses to connect to the Gateway.
 *
 * Prefers the `NIMBUS_GATEWAY_SOCKET` environment variable when set and
 * non-empty — this lets the cast-driver tripwire harness (Phase 3) point the
 * CLI at a fake-Gateway socket without touching production config.
 * Falls back to the platform-default path when the env var is absent.
 *
 * This variable is an internal CI/dev flag; it is not part of the user-facing
 * CLI contract and should not appear in user-facing documentation.
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
