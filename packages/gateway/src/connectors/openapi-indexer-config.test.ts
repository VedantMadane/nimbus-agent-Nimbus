import { expect, test } from "bun:test";
import { DEFAULT_OPENAPI_CONFIG, parseOpenapiToml } from "./openapi-indexer-config.ts";

test("missing [openapi] block returns defaults", () => {
  expect(parseOpenapiToml("")).toEqual(DEFAULT_OPENAPI_CONFIG);
});

test("parses max_walk_depth and max_spec_bytes when set", () => {
  const cfg = parseOpenapiToml(`
[openapi]
max_walk_depth = 12
max_spec_bytes = 10485760
`);
  expect(cfg.maxWalkDepth).toBe(12);
  expect(cfg.maxSpecBytes).toBe(10485760);
});

test("parses ignore_globs as comma-separated string list", () => {
  const cfg = parseOpenapiToml(`
[openapi]
ignore_globs = "**/legacy/**, **/archived/**"
`);
  expect(cfg.ignoreGlobs).toEqual(["**/legacy/**", "**/archived/**"]);
});

test("invalid integer falls back to default value silently", () => {
  const cfg = parseOpenapiToml(`
[openapi]
max_walk_depth = "not a number"
`);
  expect(cfg.maxWalkDepth).toBe(DEFAULT_OPENAPI_CONFIG.maxWalkDepth);
});
