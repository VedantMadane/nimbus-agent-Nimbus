import { describe, expect, it } from "bun:test";
import { parseDeployPreflightArgs } from "./deploy.ts";

describe("nimbus deploy preflight arg parser", () => {
  it("parses service + target-ref + json", () => {
    const out = parseDeployPreflightArgs([
      "--service",
      "payment-service",
      "--target-ref",
      "main",
      "--json",
    ]);
    expect(out.service).toBe("payment-service");
    expect(out.targetRef).toBe("main");
    expect(out.json).toBe(true);
    expect(out.mode).toBe("warn");
  });

  it("defaults mode to 'warn' and json to false", () => {
    const out = parseDeployPreflightArgs(["--service", "x", "--target-ref", "main"]);
    expect(out.mode).toBe("warn");
    expect(out.json).toBe(false);
  });

  it("accepts --mode block", () => {
    const out = parseDeployPreflightArgs([
      "--service",
      "x",
      "--target-ref",
      "main",
      "--mode",
      "block",
    ]);
    expect(out.mode).toBe("block");
  });

  it("accepts --mode off", () => {
    const out = parseDeployPreflightArgs([
      "--service",
      "x",
      "--target-ref",
      "main",
      "--mode",
      "off",
    ]);
    expect(out.mode).toBe("off");
  });

  it("rejects unknown --mode value", () => {
    expect(() =>
      parseDeployPreflightArgs(["--service", "x", "--target-ref", "main", "--mode", "explode"]),
    ).toThrow(/--mode/);
  });

  it("throws on missing --service", () => {
    expect(() => parseDeployPreflightArgs(["--target-ref", "main"])).toThrow(/--service/);
  });

  it("throws on missing --target-ref", () => {
    expect(() => parseDeployPreflightArgs(["--service", "x"])).toThrow(/--target-ref/);
  });
});
