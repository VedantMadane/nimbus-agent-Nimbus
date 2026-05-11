import { describe, expect, it } from "bun:test";
import { READ_ONLY_HTTP_ROUTES } from "./http-routes.ts";

describe("READ_ONLY_HTTP_ROUTES", () => {
  it("includes the seven existing endpoints plus /v1/openapi.json", () => {
    const paths = READ_ONLY_HTTP_ROUTES.map((r) => r.path);
    expect(paths).toEqual([
      "/v1/audit",
      "/v1/connectors",
      "/v1/health",
      "/v1/items",
      "/v1/items/{id}",
      "/v1/openapi.json",
      "/v1/people",
      "/v1/people/{id}",
    ]);
  });

  it("declares every route as GET", () => {
    for (const route of READ_ONLY_HTTP_ROUTES) {
      expect(route.method).toBe("GET");
    }
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(READ_ONLY_HTTP_ROUTES)).toBe(true);
  });
});
