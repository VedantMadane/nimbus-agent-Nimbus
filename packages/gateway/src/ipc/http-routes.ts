/**
 * Canonical list of read-only HTTP routes served by `startReadOnlyHttpServer`.
 * The OpenAPI drift CI gate (`scripts/structure-audit/check-openapi-drift.ts`)
 * compares this constant against `packages/gateway/openapi/v1.yaml` to ensure
 * the published schema and the running handler agree.
 *
 * Adding a route: append here AND add a `paths:` entry in `v1.yaml`.
 */
export type ReadOnlyHttpRoute = {
  readonly method: "GET";
  /** OpenAPI-style path with `{param}` placeholders. */
  readonly path: string;
};

export const READ_ONLY_HTTP_ROUTES: readonly ReadOnlyHttpRoute[] = Object.freeze([
  { method: "GET", path: "/v1/audit" },
  { method: "GET", path: "/v1/connectors" },
  { method: "GET", path: "/v1/health" },
  { method: "GET", path: "/v1/items" },
  { method: "GET", path: "/v1/items/{id}" },
  { method: "GET", path: "/v1/metrics/dora" },
  { method: "GET", path: "/v1/openapi.json" },
  { method: "GET", path: "/v1/people" },
  { method: "GET", path: "/v1/people/{id}" },
] as const);
