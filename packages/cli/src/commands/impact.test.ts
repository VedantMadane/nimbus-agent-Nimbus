import { describe, expect, test } from "bun:test";
import { parseImpactArgs } from "./impact.ts";

describe("parseImpactArgs", () => {
  test("parses positional fileOrPrUrl", () => {
    const a = parseImpactArgs(["src/billing/retry.ts"]);
    expect(a.fileOrPrUrl).toBe("src/billing/retry.ts");
    expect(a.json).toBe(false);
    expect(a.depth).toBeUndefined();
    expect(a.service).toBeUndefined();
  });

  test("recognises --json flag", () => {
    const a = parseImpactArgs(["src/x.ts", "--json"]);
    expect(a.json).toBe(true);
  });

  test("parses --depth as integer in 1..5", () => {
    expect(parseImpactArgs(["x", "--depth", "3"]).depth).toBe(3);
  });

  test("rejects --depth out of range", () => {
    expect(() => parseImpactArgs(["x", "--depth", "0"])).toThrow();
    expect(() => parseImpactArgs(["x", "--depth", "6"])).toThrow();
    expect(() => parseImpactArgs(["x", "--depth", "abc"])).toThrow();
  });

  test("parses --service", () => {
    expect(parseImpactArgs(["x", "--service", "github"]).service).toBe("github");
  });

  test("requires non-empty fileOrPrUrl", () => {
    expect(() => parseImpactArgs([])).toThrow();
    expect(() => parseImpactArgs(["--json"])).toThrow();
  });

  test("joins multiple positionals with spaces (PR URLs are single tokens, but topics may have spaces)", () => {
    expect(parseImpactArgs(["foo", "bar", "--json"]).fileOrPrUrl).toBe("foo bar");
  });
});
