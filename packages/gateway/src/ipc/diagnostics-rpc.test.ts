import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxRunner } from "../platform/sandbox/sandbox-runner.ts";
import type { DiagnosticsRpcContext } from "./diagnostics-rpc.ts";
import { buildSandboxDiagPayload, dispatchDiagnosticsRpc } from "./diagnostics-rpc.ts";

function makeCtx(dataDir: string): DiagnosticsRpcContext {
  return {
    dataDir,
    configDir: dataDir,
    consent: { pendingCount: () => 0 } as never,
    gatewayVersion: "0.0.0-test",
    startedAtMs: Date.now(),
  };
}

describe("telemetry.getStatus", () => {
  test("returns enabled:true when marker file absent", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-diag-"));
    try {
      const r = await dispatchDiagnosticsRpc("telemetry.getStatus", null, makeCtx(dir));
      expect(r.kind).toBe("hit");
      expect((r as { kind: "hit"; value: { enabled: boolean } }).value.enabled).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns enabled:false when marker file present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-diag-"));
    try {
      writeFileSync(join(dir, ".nimbus-telemetry-disabled"), `${Date.now()}\n`);
      const r = await dispatchDiagnosticsRpc("telemetry.getStatus", null, makeCtx(dir));
      expect(r.kind).toBe("hit");
      expect((r as { kind: "hit"; value: { enabled: boolean } }).value.enabled).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("telemetry.setEnabled", () => {
  test("setEnabled(false) writes the disable marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-diag-"));
    try {
      dispatchDiagnosticsRpc("telemetry.setEnabled", { enabled: false }, makeCtx(dir));
      expect(existsSync(join(dir, ".nimbus-telemetry-disabled"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("setEnabled(true) removes the disable marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-diag-"));
    try {
      writeFileSync(join(dir, ".nimbus-telemetry-disabled"), `${Date.now()}\n`);
      dispatchDiagnosticsRpc("telemetry.setEnabled", { enabled: true }, makeCtx(dir));
      expect(existsSync(join(dir, ".nimbus-telemetry-disabled"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects missing enabled param", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-diag-"));
    try {
      expect(() => dispatchDiagnosticsRpc("telemetry.setEnabled", null, makeCtx(dir))).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("diag.getVersion", () => {
  test("returns gateway version string", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-diag-ver-"));
    try {
      const r = await dispatchDiagnosticsRpc("diag.getVersion", null, makeCtx(dir));
      expect(r.kind).toBe("hit");
      const v = (r as { kind: "hit"; value: { version: string; uptimeMs: number } }).value;
      expect(typeof v.version).toBe("string");
      expect(v.version.length).toBeGreaterThan(0);
      expect(typeof v.uptimeMs).toBe("number");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * Build a minimal in-memory `SandboxRunner` for the buildSandboxDiagPayload
 * tests. We never call `.spawn()` so it returns a sentinel that fails the
 * test if anything reaches it.
 */
function makeMockRunner(opts: {
  platform: "linux" | "darwin" | "win32";
  fullyActive: boolean;
  reason: string | null;
}): SandboxRunner {
  return {
    platform: opts.platform,
    spawn: () => {
      throw new Error("buildSandboxDiagPayload should not invoke spawn");
    },
    isFullyActive: () => opts.fullyActive,
    degradedReason: () => opts.reason,
  };
}

describe("buildSandboxDiagPayload (T2 PR 1 Task 20)", () => {
  test("returns per_host + null reason for a fully-active macOS runner", () => {
    const payload = buildSandboxDiagPayload(
      makeMockRunner({ platform: "darwin", fullyActive: true, reason: null }),
    );
    expect(payload.platform_capabilities.network).toBe("per_host");
    expect(payload.platform_capabilities.reason).toBeNull();
    expect(payload.linux_helper).toBeNull();
    expect(payload.stale_rules_count).toBe(0);
  });

  test("returns all_or_nothing + reason for a degraded Windows runner", () => {
    const payload = buildSandboxDiagPayload(
      makeMockRunner({
        platform: "win32",
        fullyActive: false,
        reason: "Windows: per-host network filtering is degraded to all-or-nothing in T2 PR 1",
      }),
    );
    expect(payload.platform_capabilities.network).toBe("all_or_nothing");
    expect(payload.platform_capabilities.reason).toContain("Windows");
    expect(payload.linux_helper).toBeNull();
    expect(payload.stale_rules_count).toBe(0);
  });

  test("populates linux_helper={available:true,reason:null} on a fully-active Linux runner", () => {
    const payload = buildSandboxDiagPayload(
      makeMockRunner({ platform: "linux", fullyActive: true, reason: null }),
    );
    expect(payload.platform_capabilities.network).toBe("per_host");
    expect(payload.linux_helper).toEqual({ available: true, reason: null });
  });

  test("populates linux_helper={available:false,reason:...} on a degraded Linux runner", () => {
    const payload = buildSandboxDiagPayload(
      makeMockRunner({
        platform: "linux",
        fullyActive: false,
        reason: "nimbus-sandbox-helper not found at /usr/lib/nimbus/bin/nimbus-sandbox-helper",
      }),
    );
    expect(payload.platform_capabilities.network).toBe("all_or_nothing");
    expect(payload.platform_capabilities.reason).toContain("nimbus-sandbox-helper");
    expect(payload.linux_helper).toEqual({
      available: false,
      reason: "nimbus-sandbox-helper not found at /usr/lib/nimbus/bin/nimbus-sandbox-helper",
    });
  });

  test("reports all_or_nothing + 'sandbox runner unavailable' when no runner is wired", () => {
    const payload = buildSandboxDiagPayload(undefined);
    expect(payload.platform_capabilities.network).toBe("all_or_nothing");
    expect(payload.platform_capabilities.reason).toBe("sandbox runner unavailable");
    expect(payload.linux_helper).toBeNull();
    expect(payload.stale_rules_count).toBe(0);
  });
});
