import { describe, expect, test } from "bun:test";
import { parseExpertArgs } from "./expert.ts";

describe("parseExpertArgs", () => {
  test("captures topicOrFile from positional arg", () => {
    const out = parseExpertArgs(["src/billing/retry.ts"]);
    expect(out.topicOrFile).toBe("src/billing/retry.ts");
    expect(out.json).toBe(false);
    expect(out.limit).toBeUndefined();
  });

  test("--json flag", () => {
    const out = parseExpertArgs(["src/x.ts", "--json"]);
    expect(out.json).toBe(true);
  });

  test("--limit N", () => {
    const out = parseExpertArgs(["src/x.ts", "--limit", "10"]);
    expect(out.limit).toBe(10);
  });

  test("rejects missing topic", () => {
    expect(() => parseExpertArgs([])).toThrow(/Usage/);
  });

  test("rejects --limit > 25", () => {
    expect(() => parseExpertArgs(["x", "--limit", "30"])).toThrow(/1\.\.25/);
  });

  test("rejects --limit followed by another flag", () => {
    expect(() => parseExpertArgs(["x", "--limit", "--json"])).toThrow(/1\.\.25/);
  });

  test("multi-word topic", () => {
    const out = parseExpertArgs(["payment", "retry", "logic"]);
    expect(out.topicOrFile).toBe("payment retry logic");
  });
});
