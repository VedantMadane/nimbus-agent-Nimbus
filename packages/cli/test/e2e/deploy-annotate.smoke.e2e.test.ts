import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lightweight smoke for `nimbus deploy annotate`: spawn the CLI without a
 * running Gateway and verify the arg-parse exit paths and help integration.
 *
 * Mirrors deploy.smoke.e2e.test.ts. Exit-code convention for the annotate
 * subcommand:
 *   2 = arg-parse / validation error (caught locally, never reaches IPC)
 *   1 = internal failure (gateway unreachable, IPC error, malformed envelope)
 *   0 = success (deployment recorded)
 *
 * `getCliPlatformPaths` in `packages/cli/src/paths.ts` does NOT honour
 * `NIMBUS_DATA_DIR`; it derives `dataDir` from platform-specific env vars.
 * To deterministically force the no-gateway branch in `readGatewayState`,
 * we point those vars at an empty temp dir so `<dataDir>/gateway.json`
 * does not exist.
 */
describe("nimbus deploy annotate e2e (no-Gateway smoke)", () => {
  const cliEntry = fileURLToPath(new URL("../../src/index.ts", import.meta.url));

  function emptyEnvOverrides(): Record<string, string> {
    const root = mkdtempSync(join(tmpdir(), "nimbus-no-gateway-"));
    return {
      LOCALAPPDATA: root,
      APPDATA: root,
      XDG_DATA_HOME: root,
      XDG_CONFIG_HOME: root,
      XDG_RUNTIME_DIR: root,
      HOME: root,
    };
  }

  test("help text mentions 'deploy annotate'", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "help"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(stdout).toContain("deploy annotate");
  });

  test("missing required arg → exit 2 with clear message", async () => {
    const proc = Bun.spawn({
      cmd: [process.execPath, "run", cliEntry, "deploy", "annotate", "--service", "x"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).toBe(2);
    expect(stderr).toMatch(/--sha is required|--target-ref is required/);
  });

  test("unknown --status → exit 2 with clear message", async () => {
    const proc = Bun.spawn({
      cmd: [
        process.execPath,
        "run",
        cliEntry,
        "deploy",
        "annotate",
        "--service",
        "x",
        "--sha",
        "abc1234",
        "--target-ref",
        "refs/heads/main",
        "--env",
        "prod",
        "--status",
        "bogus",
        "--started-at",
        "1747142400000",
      ],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).toBe(2);
    expect(stderr).toMatch(/--status must be/);
  });

  test("valid args with no gateway → exit 1 with 'Gateway is not running'", async () => {
    const proc = Bun.spawn({
      cmd: [
        process.execPath,
        "run",
        cliEntry,
        "deploy",
        "annotate",
        "--service",
        "payment-service",
        "--sha",
        "abc1234",
        "--target-ref",
        "refs/heads/main",
        "--env",
        "prod",
        "--status",
        "success",
        "--started-at",
        "1747142400000",
      ],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...emptyEnvOverrides() },
    });
    const code = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(code).toBe(1);
    expect(stderr).toContain("Gateway is not running");
  });
});
