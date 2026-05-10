import { describe, expect, test } from "bun:test";
import { parseCatchupArgs } from "./catchup.ts";

describe("parseCatchupArgs", () => {
  test("defaults to sinceMs = 3 days when no flag given", () => {
    const a = parseCatchupArgs([]);
    expect(a.sinceMs).toBe(3 * 24 * 60 * 60 * 1000);
    expect(a.json).toBe(false);
    expect(a.service).toBeUndefined();
  });

  test("parses --since with weeks suffix", () => {
    const a = parseCatchupArgs(["--since", "2w"]);
    expect(a.sinceMs).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  test("parses --since with days suffix", () => {
    const a = parseCatchupArgs(["--since", "7d"]);
    expect(a.sinceMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test("rejects --since with invalid syntax", () => {
    expect(() => parseCatchupArgs(["--since", "blah"])).toThrow();
    expect(() => parseCatchupArgs(["--since"])).toThrow();
  });

  test("recognises --json flag", () => {
    const a = parseCatchupArgs(["--json"]);
    expect(a.json).toBe(true);
  });

  test("parses --service", () => {
    const a = parseCatchupArgs(["--service", "github"]);
    expect(a.service).toBe("github");
  });

  test("rejects unknown positional arguments to avoid silent typos", () => {
    expect(() => parseCatchupArgs(["something"])).toThrow();
  });

  test("clamps sinceMs at 90 days", () => {
    expect(() => parseCatchupArgs(["--since", "365d"])).toThrow(/90 days/);
  });
});
