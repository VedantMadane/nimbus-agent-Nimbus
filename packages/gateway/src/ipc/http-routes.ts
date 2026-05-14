/**
 * Canonical list of HTTP routes served by `startReadOnlyHttpServer`. Most
 * are read-only; one (`POST /v1/deployments`, Phase 5 T4 PR 3b) is a
 * narrowly-scoped write surface that goes through `dispatchWriteRoute`
 * (invariant I13).
 *
 * The OpenAPI drift CI gate (`scripts/structure-audit/check-openapi-drift.ts`)
 * compares this constant against `packages/gateway/openapi/v1.yaml` to ensure
 * the published schema and the running handler agree.
 *
 * Adding a route: append here AND add a `paths:` entry in `v1.yaml`. If the
 * new route is a write (non-GET), also add it to `WRITE_ROUTE_ALLOWLIST` in
 * `http-write-routes.ts` and bump the I13 count assertion.
 */
export type HttpRoute = {
  readonly method: "GET" | "POST";
  /** OpenAPI-style path with `{param}` placeholders. */
  readonly path: string;
};

export const HTTP_ROUTES: readonly HttpRoute[] = Object.freeze([
  { method: "GET", path: "/v1/audit" },
  { method: "GET", path: "/v1/connectors" },
  { method: "POST", path: "/v1/deployments" },
  { method: "GET", path: "/v1/health" },
  { method: "GET", path: "/v1/items" },
  { method: "GET", path: "/v1/items/{id}" },
  { method: "GET", path: "/v1/metrics/dora" },
  { method: "GET", path: "/v1/openapi.json" },
  { method: "GET", path: "/v1/people" },
  { method: "GET", path: "/v1/people/{id}" },
  { method: "GET", path: "/v1/preflight/deploy" },
] as const);

/**
 * Backwards-compatible alias. Phase 5 T4 PR 3a referenced the older
 * `READ_ONLY_HTTP_ROUTES` name; keep it as an alias for one release so
 * out-of-tree references compile, then remove. Internal callers should
 * import `HTTP_ROUTES` directly.
 */
export const READ_ONLY_HTTP_ROUTES = HTTP_ROUTES;

/** Back-compat type alias. */
export type ReadOnlyHttpRoute = HttpRoute;
