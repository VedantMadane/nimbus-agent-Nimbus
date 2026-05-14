import { describe, expect, test } from "bun:test";
import {
  type MetricRowInput,
  parseMetricsDoraArgs,
  renderMetricRow,
  renderMixedSourceHint,
} from "./metrics.ts";

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

const WARN_PREFIX = "\x1b[33m⚠\x1b[0m";

function mixedSourceRow(): MetricRowInput {
  return {
    label: "Deployment Frequency",
    value: 1.5,
    unit: "per_day",
    sample: 42,
    gap: "mixed_source",
  };
}

describe("renderMetricRow", () => {
  test("prepends yellow ⚠ for mixed_source when tty and color enabled", () => {
    const out = renderMetricRow(mixedSourceRow(), { tty: true, noColor: false });
    expect(out).toContain(WARN_PREFIX);
  });

  test("omits ⚠ when noColor is true (NO_COLOR set)", () => {
    const out = renderMetricRow(mixedSourceRow(), { tty: true, noColor: true });
    expect(out).not.toContain(WARN_PREFIX);
    expect(out).not.toContain("\x1b[");
  });

  test("omits ⚠ when tty is false (output piped)", () => {
    const out = renderMetricRow(mixedSourceRow(), { tty: false, noColor: false });
    expect(out).not.toContain(WARN_PREFIX);
    expect(out).not.toContain("\x1b[");
  });

  test("does not prepend ⚠ for non-mixed_source gaps even on a colour TTY", () => {
    const row: MetricRowInput = {
      label: "Lead Time",
      value: 2.0,
      unit: "hours",
      sample: 5,
      gap: "low_sample",
    };
    const out = renderMetricRow(row, { tty: true, noColor: false });
    expect(out).not.toContain(WARN_PREFIX);
    // The gap bracket is still coloured, but the leading ⚠ icon is reserved
    // for mixed_source only.
    expect(out).toContain("[low_sample]");
  });

  test("does not prepend ⚠ when gap is null", () => {
    const row: MetricRowInput = {
      label: "MTTR",
      value: 0.5,
      unit: "hours",
      sample: 10,
      gap: null,
    };
    const out = renderMetricRow(row, { tty: true, noColor: false });
    expect(out).not.toContain(WARN_PREFIX);
  });
});

describe("renderMixedSourceHint", () => {
  test("returns a non-empty string", () => {
    const hint = renderMixedSourceHint();
    expect(hint.length).toBeGreaterThan(0);
  });

  test("mentions both deployment and ci_run data sources", () => {
    const hint = renderMixedSourceHint();
    expect(hint).toContain("deployment");
    expect(hint).toContain("ci_run");
  });

  test("includes the actionable guidance phrase", () => {
    const hint = renderMixedSourceHint();
    expect(hint).toContain("Annotate consistently");
  });
});
