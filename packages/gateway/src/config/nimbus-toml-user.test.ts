import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_NIMBUS_USER_TOML,
  loadNimbusUserFromConfigDir,
  loadNimbusUserFromPath,
  parseNimbusUserToml,
} from "./nimbus-toml.ts";

describe("parseNimbusUserToml", () => {
  test("returns defaults when [user] is absent", () => {
    const out = parseNimbusUserToml("");
    expect(out).toEqual(DEFAULT_NIMBUS_USER_TOML);
    expect(out.mePersonId).toBeUndefined();
  });

  test("reads me_person_id when set", () => {
    const out = parseNimbusUserToml('[user]\nme_person_id = "person-123"\n');
    expect(out.mePersonId).toBe("person-123");
  });

  test("ignores keys outside [user]", () => {
    const out = parseNimbusUserToml('[other]\nme_person_id = "ignored"\n');
    expect(out.mePersonId).toBeUndefined();
  });

  test("strips inline comments", () => {
    const out = parseNimbusUserToml('[user]\nme_person_id = "p1"  # my id\n');
    expect(out.mePersonId).toBe("p1");
  });

  test("ignores empty string values (treats as unset)", () => {
    const out = parseNimbusUserToml('[user]\nme_person_id = ""\n');
    expect(out.mePersonId).toBeUndefined();
  });
});

describe("loadNimbusUserFromPath", () => {
  test("returns defaults when file is missing", () => {
    const out = loadNimbusUserFromPath(join(tmpdir(), "does-not-exist.toml"));
    expect(out).toEqual(DEFAULT_NIMBUS_USER_TOML);
  });

  test("reads me_person_id from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-user-toml-"));
    const p = join(dir, "nimbus.toml");
    writeFileSync(p, '[user]\nme_person_id = "person-abc"\n', "utf8");
    const out = loadNimbusUserFromPath(p);
    expect(out.mePersonId).toBe("person-abc");
  });

  test("returns defaults on parse error (treats malformed file as absent)", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-user-toml-bad-"));
    const p = join(dir, "nimbus.toml");
    writeFileSync(p, "not actually toml ============", "utf8");
    expect(() => loadNimbusUserFromPath(p)).not.toThrow();
  });
});

describe("loadNimbusUserFromConfigDir", () => {
  test("resolves <configDir>/nimbus.toml", () => {
    const dir = mkdtempSync(join(tmpdir(), "nimbus-user-cfg-"));
    writeFileSync(join(dir, "nimbus.toml"), '[user]\nme_person_id = "p-cfg"\n', "utf8");
    const out = loadNimbusUserFromConfigDir(dir);
    expect(out.mePersonId).toBe("p-cfg");
  });
});
