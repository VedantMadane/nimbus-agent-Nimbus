import { describe, expect, test } from "bun:test";
import { parseMetricsDoraArgs } from "./metrics.ts";

describe("parseMetricsDoraArgs", () => {
  test("parses service + since + json", () => {
    const out = parseMetricsDoraArgs(["--service", "payment-service", "--since", "7d", "--json"]);
    expect(out).toEqual({ service: "payment-service", since: "7d", json: true });
  });

  test("defaults since to 30d and json to false", () => {
    const out = parseMetricsDoraArgs(["--service", "x"]);
    expect(out).toEqual({ service: "x", since: "30d", json: false });
  });

  test("throws on missing --service", () => {
    expect(() => parseMetricsDoraArgs(["--since", "7d"])).toThrow(/--service/);
  });

  test("throws on malformed --since", () => {
    expect(() => parseMetricsDoraArgs(["--service", "x", "--since", "lol"])).toThrow(/--since/);
  });

  test("accepts --since 24h", () => {
    const out = parseMetricsDoraArgs(["--service", "x", "--since", "24h"]);
    expect(out.since).toBe("24h");
  });
});
