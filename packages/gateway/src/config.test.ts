import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  applyLlmTomlOverrides,
  getEffectiveAgentModel,
  getEffectiveClassifierModel,
} from "./config.ts";

const SAVED_ENV = {
  agent: process.env["NIMBUS_AGENT_MODEL"],
  classifier: process.env["NIMBUS_CLASSIFIER_MODEL"],
};

beforeAll(() => {
  delete process.env["NIMBUS_AGENT_MODEL"];
  delete process.env["NIMBUS_CLASSIFIER_MODEL"];
});

afterAll(() => {
  if (SAVED_ENV.agent !== undefined) process.env["NIMBUS_AGENT_MODEL"] = SAVED_ENV.agent;
  if (SAVED_ENV.classifier !== undefined)
    process.env["NIMBUS_CLASSIFIER_MODEL"] = SAVED_ENV.classifier;
});

afterEach(() => {
  applyLlmTomlOverrides({});
});

describe("getEffectiveAgentModel / getEffectiveClassifierModel", () => {
  test("falls back to hardcoded defaults when no overrides applied", () => {
    expect(getEffectiveAgentModel()).toBe("claude-sonnet-4-6");
    expect(getEffectiveClassifierModel()).toBe("claude-haiku-4-5-20251001");
  });

  test("TOML overrides win over hardcoded defaults", () => {
    applyLlmTomlOverrides({
      agentModel: "claude-opus-4-7",
      classifierModel: "claude-haiku-4-5-20251001",
    });
    expect(getEffectiveAgentModel()).toBe("claude-opus-4-7");
    expect(getEffectiveClassifierModel()).toBe("claude-haiku-4-5-20251001");
  });

  test("calling applyLlmTomlOverrides({}) resets to hardcoded defaults", () => {
    applyLlmTomlOverrides({ agentModel: "claude-opus-4-7" });
    expect(getEffectiveAgentModel()).toBe("claude-opus-4-7");
    applyLlmTomlOverrides({});
    expect(getEffectiveAgentModel()).toBe("claude-sonnet-4-6");
  });

  test("empty-string TOML value is treated as unset", () => {
    applyLlmTomlOverrides({ agentModel: "", classifierModel: "" });
    expect(getEffectiveAgentModel()).toBe("claude-sonnet-4-6");
    expect(getEffectiveClassifierModel()).toBe("claude-haiku-4-5-20251001");
  });

  test("partial overrides leave other field on default", () => {
    applyLlmTomlOverrides({ agentModel: "claude-opus-4-7" });
    expect(getEffectiveAgentModel()).toBe("claude-opus-4-7");
    expect(getEffectiveClassifierModel()).toBe("claude-haiku-4-5-20251001");
  });

  test("env var wins over TOML override", () => {
    applyLlmTomlOverrides({
      agentModel: "claude-opus-4-7",
      classifierModel: "claude-haiku-4-5-20251001",
    });
    process.env["NIMBUS_AGENT_MODEL"] = "claude-sonnet-from-env";
    process.env["NIMBUS_CLASSIFIER_MODEL"] = "claude-haiku-from-env";
    try {
      expect(getEffectiveAgentModel()).toBe("claude-sonnet-from-env");
      expect(getEffectiveClassifierModel()).toBe("claude-haiku-from-env");
    } finally {
      delete process.env["NIMBUS_AGENT_MODEL"];
      delete process.env["NIMBUS_CLASSIFIER_MODEL"];
    }
  });
});
