/**
 * Unit tests for `parseDeployAnnotateArgs` — getopt-style flag parsing +
 * field-shape validation for `nimbus deploy annotate`.
 *
 * The CLI parser mirrors a subset of `packages/gateway/src/deployment/annotate.ts`
 * validators so usage errors fail locally (exit 2) before round-tripping
 * to IPC. Field-level semantic checks (time-window bounds, etc.) remain
 * the Gateway's job.
 */

import { describe, expect, test } from "bun:test";

import { ArgParseError, parseDeployAnnotateArgs } from "./deploy-annotate.ts";

const REQUIRED = [
  "--service",
  "payment-service",
  "--sha",
  "abc1234",
  "--target-ref",
  "refs/heads/main",
  "--env",
  "prod",
  "--status",
  "success",
  "--started-at",
  "1747142400000",
];

describe("parseDeployAnnotateArgs", () => {
  test("parses the minimal required flag set with defaults", () => {
    const parsed = parseDeployAnnotateArgs(REQUIRED);
    expect(parsed.service).toBe("payment-service");
    expect(parsed.sha).toBe("abc1234");
    expect(parsed.targetRef).toBe("refs/heads/main");
    expect(parsed.env).toBe("prod");
    expect(parsed.status).toBe("success");
    expect(parsed.startedAtMs).toBe(1747142400000);
    expect(parsed.provider).toBe("other");
    expect(parsed.json).toBe(false);
    expect(parsed.finishedAtMs).toBeUndefined();
    expect(parsed.workflowUrl).toBeUndefined();
    expect(parsed.runId).toBeUndefined();
    expect(parsed.jobId).toBeUndefined();
  });

  test("parses all optional flags including --json", () => {
    const parsed = parseDeployAnnotateArgs([
      ...REQUIRED,
      "--finished-at",
      "1747142500000",
      "--workflow-url",
      "https://github.com/o/r/actions/runs/1",
      "--provider",
      "github-actions",
      "--run-id",
      "run-42",
      "--job-id",
      "job-7",
      "--json",
    ]);
    expect(parsed.finishedAtMs).toBe(1747142500000);
    expect(parsed.workflowUrl).toBe("https://github.com/o/r/actions/runs/1");
    expect(parsed.provider).toBe("github-actions");
    expect(parsed.runId).toBe("run-42");
    expect(parsed.jobId).toBe("job-7");
    expect(parsed.json).toBe(true);
  });

  function omitFlag(flag: string): string[] {
    const idx = REQUIRED.indexOf(flag);
    if (idx === -1) return [...REQUIRED];
    return [...REQUIRED.slice(0, idx), ...REQUIRED.slice(idx + 2)];
  }

  test("rejects missing --sha with a clear error", () => {
    const args = omitFlag("--sha");
    expect(() => parseDeployAnnotateArgs(args)).toThrow(ArgParseError);
    expect(() => parseDeployAnnotateArgs(args)).toThrow(/--sha is required/);
  });

  test("rejects missing --target-ref with a clear error", () => {
    const args = omitFlag("--target-ref");
    expect(() => parseDeployAnnotateArgs(args)).toThrow(/--target-ref is required/);
  });

  test("rejects unknown --status value", () => {
    const args = [...REQUIRED];
    args[args.indexOf("--status") + 1] = "bogus";
    expect(() => parseDeployAnnotateArgs(args)).toThrow(/--status must be/);
  });

  test("rejects unknown --provider value", () => {
    expect(() => parseDeployAnnotateArgs([...REQUIRED, "--provider", "weirdci"])).toThrow(
      /--provider must be/,
    );
  });

  test("rejects malformed --sha (not lowercase hex / too short)", () => {
    const args = [...REQUIRED];
    args[args.indexOf("--sha") + 1] = "XYZ"; // not lowercase hex AND too short
    expect(() => parseDeployAnnotateArgs(args)).toThrow(/--sha must be/);
  });

  test("rejects malformed --service (uppercase)", () => {
    const args = [...REQUIRED];
    args[args.indexOf("--service") + 1] = "Payment-Service";
    expect(() => parseDeployAnnotateArgs(args)).toThrow(/--service must be/);
  });

  test("rejects non-integer --started-at", () => {
    const args = [...REQUIRED];
    args[args.indexOf("--started-at") + 1] = "not-a-number";
    expect(() => parseDeployAnnotateArgs(args)).toThrow(/--started-at must be an integer/);
  });
});
