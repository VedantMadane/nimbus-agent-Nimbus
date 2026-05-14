import { describe, expect, test } from "bun:test";
import { renderSummary } from "./render.ts";

describe("renderSummary", () => {
  test("is_new=true emits 'Recorded'", () => {
    const md = renderSummary({
      service: "payment-service",
      environment: "prod",
      status: "success",
      externalId: "github-actions:run-12345:job-67890",
      isNew: true,
      doraEligible: true,
    });
    expect(md).toContain("### Recorded deployment");
    expect(md).toContain("DORA-eligible");
    expect(md).toContain("`github-actions:run-12345:job-67890`");
    expect(md).toContain("`success`");
  });

  test("is_new=false emits 'Updated'", () => {
    const md = renderSummary({
      service: "payment-service",
      environment: "prod",
      status: "success",
      externalId: "x",
      isNew: false,
      doraEligible: false,
    });
    expect(md).toContain("### Updated deployment");
    expect(md).toContain("not counted in DORA deploy-frequency");
  });

  test("includes service and environment in the heading", () => {
    const md = renderSummary({
      service: "auth-svc",
      environment: "staging",
      status: "failure",
      externalId: "x",
      isNew: true,
      doraEligible: false,
    });
    expect(md).toContain("auth-svc");
    expect(md).toContain("staging");
    expect(md).toContain("`failure`");
  });
});
