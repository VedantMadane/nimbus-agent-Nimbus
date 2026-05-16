import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadNimbusServiceConfigsFromConfigDir } from "./nimbus-toml.ts";

describe("loadNimbusServiceConfigsFromConfigDir + [pagerduty] aliases", () => {
  test("attaches lowercased severityP1Aliases to every ServiceConfig", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-sc-aliases-"));
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[pagerduty]
severity_p1_aliases = ["Critical", "SEV-1"]

[metrics.dora.payments]
repos = ["github:acme/payments"]

[ci.service.checkout]
repos = ["github:acme/checkout"]
`,
      "utf8",
    );
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.size).toBe(2);
    expect(merged.get("payments")?.severityP1Aliases).toEqual(["critical", "sev-1"]);
    expect(merged.get("checkout")?.severityP1Aliases).toEqual(["critical", "sev-1"]);
  });

  test("defaults to empty array when [pagerduty] is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-sc-no-pd-"));
    writeFileSync(
      join(dir, "nimbus.toml"),
      `[metrics.dora.svc]
repos = ["github:acme/svc"]
`,
      "utf8",
    );
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.get("svc")?.severityP1Aliases).toEqual([]);
  });

  test("returns empty map when nimbus.toml is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-sc-missing-"));
    const merged = loadNimbusServiceConfigsFromConfigDir(dir);
    expect(merged.size).toBe(0);
  });
});
