import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadNimbusServiceConfigsFromConfigDir,
  parseNimbusCiServiceToml,
  parseNimbusDoraToml,
} from "../../../src/config/nimbus-toml.ts";

describe("[ci.service.<id>] alias parser", () => {
  it("parses one service entry with all keys", () => {
    const raw = `
[ci.service.payment-service]
repos = ["github:nimbus-agent/payments"]
pagerduty_services = ["P12ABCD"]
deploy_workflow_pattern = "^Release"
incident_window_minutes = 90
exclude_pr_labels = ["revert", "rollback"]
`;
    const parsed = parseNimbusCiServiceToml(raw);
    expect(parsed.size).toBe(1);
    const cfg = parsed.get("payment-service");
    if (cfg === undefined) throw new Error("payment-service missing");
    expect(cfg.repos.map((r) => `${r.provider}:${r.providerId}`)).toEqual([
      "github:nimbus-agent/payments",
    ]);
    expect(cfg.pagerdutyServices).toEqual(["P12ABCD"]);
    expect(cfg.incidentWindowMinutes).toBe(90);
  });

  it("returns an empty Map when no [ci.service.*] tables present", () => {
    expect(parseNimbusCiServiceToml('[user]\nme_person_id = "alice"\n').size).toBe(0);
  });

  it("rejects an unknown key", () => {
    const raw = `
[ci.service.bad]
repos = ["github:org/svc"]
mystery = "yes"
`;
    expect(() => parseNimbusCiServiceToml(raw)).toThrow(/unknown key/i);
  });
});

describe("loadNimbusServiceConfigsFromConfigDir", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "nimbus-cfg-"));
  });
  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* non-fatal */
    }
  });

  it("unions [metrics.dora.<id>] and [ci.service.<id>] blocks", () => {
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.svc-a]
repos = ["github:org/a"]

[ci.service.svc-b]
repos = ["gitlab:org/b"]
`,
    );
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.size).toBe(2);
    expect(merged.get("svc-a")?.repos[0]?.provider).toBe("github");
    expect(merged.get("svc-b")?.repos[0]?.provider).toBe("gitlab");
  });

  it("on same id, [ci.service.<id>] wins and a warning is logged", () => {
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.svc-a]
repos = ["github:org/dora-version"]

[ci.service.svc-a]
repos = ["gitlab:org/ci-version"]
`,
    );
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (msg: unknown) => warnings.push(String(msg));
    try {
      const merged = loadNimbusServiceConfigsFromConfigDir(dir);
      expect(merged.get("svc-a")?.repos[0]?.provider).toBe("gitlab");
    } finally {
      console.warn = orig;
    }
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/svc-a/);
    expect(warnings[0]).toMatch(/ci\.service/);
  });

  it("returns empty Map when nimbus.toml is missing", () => {
    expect(loadNimbusServiceConfigsFromConfigDir(dir).size).toBe(0);
  });
});

describe("DoraServiceConfig type alias for back-compat", () => {
  it("parses dora blocks through the renamed ServiceConfig shape", () => {
    const raw = `
[metrics.dora.svc-c]
repos = ["github:org/c"]
`;
    const parsed = parseNimbusDoraToml(raw);
    const cfg = parsed.get("svc-c");
    if (cfg === undefined) throw new Error("svc-c missing");
    // The rename is type-level only; runtime shape is identical.
    expect(cfg.serviceId).toBe("svc-c");
  });
});
