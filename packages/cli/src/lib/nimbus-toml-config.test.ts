import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listTomlKeysWithEnv } from "./nimbus-toml-config.ts";

const SAVED = {
  agent: process.env["NIMBUS_AGENT_MODEL"],
  classifier: process.env["NIMBUS_CLASSIFIER_MODEL"],
  telemetry: process.env["NIMBUS_TELEMETRY_ENABLED"],
};

let dir: string;
let tomlPath: string;

beforeEach(() => {
  delete process.env["NIMBUS_AGENT_MODEL"];
  delete process.env["NIMBUS_CLASSIFIER_MODEL"];
  delete process.env["NIMBUS_TELEMETRY_ENABLED"];
  dir = mkdtempSync(join(tmpdir(), "nimbus-toml-cfg-"));
  tomlPath = join(dir, "nimbus.toml");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (SAVED.agent !== undefined) process.env["NIMBUS_AGENT_MODEL"] = SAVED.agent;
  else delete process.env["NIMBUS_AGENT_MODEL"];
  if (SAVED.classifier !== undefined) process.env["NIMBUS_CLASSIFIER_MODEL"] = SAVED.classifier;
  else delete process.env["NIMBUS_CLASSIFIER_MODEL"];
  if (SAVED.telemetry !== undefined) process.env["NIMBUS_TELEMETRY_ENABLED"] = SAVED.telemetry;
  else delete process.env["NIMBUS_TELEMETRY_ENABLED"];
});

describe("listTomlKeysWithEnv — llm.* entries", () => {
  test("llm.remote_model surfaces from env when NIMBUS_AGENT_MODEL is set", () => {
    process.env["NIMBUS_AGENT_MODEL"] = "claude-opus-4-7";
    const rows = listTomlKeysWithEnv(tomlPath);
    const row = rows.find((r) => r.key === "llm.remote_model");
    expect(row).toEqual({
      key: "llm.remote_model",
      value: "claude-opus-4-7",
      source: "env",
      envVar: "NIMBUS_AGENT_MODEL",
    });
  });

  test("llm.classifier_model surfaces from env when NIMBUS_CLASSIFIER_MODEL is set", () => {
    process.env["NIMBUS_CLASSIFIER_MODEL"] = "claude-haiku-4-5-20251001";
    const rows = listTomlKeysWithEnv(tomlPath);
    const row = rows.find((r) => r.key === "llm.classifier_model");
    expect(row).toEqual({
      key: "llm.classifier_model",
      value: "claude-haiku-4-5-20251001",
      source: "env",
      envVar: "NIMBUS_CLASSIFIER_MODEL",
    });
  });

  test("llm.* surfaces from file when env is unset and the key is in the TOML", () => {
    writeFileSync(
      tomlPath,
      `[llm]\nremote_model = "claude-sonnet-4-6"\nclassifier_model = "claude-haiku-4-5-20251001"\n`,
    );
    const rows = listTomlKeysWithEnv(tomlPath);
    const remote = rows.find((r) => r.key === "llm.remote_model");
    const classifier = rows.find((r) => r.key === "llm.classifier_model");
    expect(remote).toEqual({
      key: "llm.remote_model",
      value: '"claude-sonnet-4-6"',
      source: "file",
    });
    expect(classifier).toEqual({
      key: "llm.classifier_model",
      value: '"claude-haiku-4-5-20251001"',
      source: "file",
    });
  });

  test("env beats file when both are set", () => {
    writeFileSync(tomlPath, `[llm]\nremote_model = "claude-sonnet-4-6"\n`);
    process.env["NIMBUS_AGENT_MODEL"] = "claude-opus-4-7";
    const rows = listTomlKeysWithEnv(tomlPath);
    const row = rows.find((r) => r.key === "llm.remote_model");
    expect(row?.source).toBe("env");
    expect(row?.value).toBe("claude-opus-4-7");
  });

  test("llm.* is omitted when both env and file are unset", () => {
    const rows = listTomlKeysWithEnv(tomlPath);
    expect(rows.find((r) => r.key === "llm.remote_model")).toBeUndefined();
    expect(rows.find((r) => r.key === "llm.classifier_model")).toBeUndefined();
  });
});
