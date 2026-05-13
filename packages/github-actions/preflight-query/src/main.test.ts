import { describe, expect, it } from "bun:test";
import { decideExitCode } from "./render.ts";

describe("decideExitCode", () => {
  it("mode=warn, verdict=ok → 0", () => {
    expect(
      decideExitCode({
        verdict: "ok",
        mode: "warn",
        unreachable: false,
        allowGatewayFailure: false,
      }),
    ).toBe(0);
  });
  it("mode=warn, verdict=warn → 0", () => {
    expect(
      decideExitCode({
        verdict: "warn",
        mode: "warn",
        unreachable: false,
        allowGatewayFailure: false,
      }),
    ).toBe(0);
  });
  it("mode=block, verdict=ok → 0", () => {
    expect(
      decideExitCode({
        verdict: "ok",
        mode: "block",
        unreachable: false,
        allowGatewayFailure: false,
      }),
    ).toBe(0);
  });
  it("mode=block, verdict=warn → 1", () => {
    expect(
      decideExitCode({
        verdict: "warn",
        mode: "block",
        unreachable: false,
        allowGatewayFailure: false,
      }),
    ).toBe(1);
  });
  it("mode=off, verdict=warn → 0", () => {
    expect(
      decideExitCode({
        verdict: "warn",
        mode: "off",
        unreachable: false,
        allowGatewayFailure: false,
      }),
    ).toBe(0);
  });
  it("mode=block, unreachable, allow-gateway-failure=false → 1", () => {
    expect(
      decideExitCode({
        verdict: "ok",
        mode: "block",
        unreachable: true,
        allowGatewayFailure: false,
      }),
    ).toBe(1);
  });
  it("mode=block, unreachable, allow-gateway-failure=true → 0", () => {
    expect(
      decideExitCode({
        verdict: "ok",
        mode: "block",
        unreachable: true,
        allowGatewayFailure: true,
      }),
    ).toBe(0);
  });
  it("mode=warn, unreachable → 0 regardless of allow-gateway-failure", () => {
    expect(
      decideExitCode({
        verdict: "ok",
        mode: "warn",
        unreachable: true,
        allowGatewayFailure: false,
      }),
    ).toBe(0);
    expect(
      decideExitCode({ verdict: "ok", mode: "warn", unreachable: true, allowGatewayFailure: true }),
    ).toBe(0);
  });
});
