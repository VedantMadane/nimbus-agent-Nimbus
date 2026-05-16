import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  type SandboxPermissions,
  validateAndNormalizePermissions,
} from "./permissions-validator.ts";

/** Canonical spec name; preferred when both exist. */
export const EXTENSION_MANIFEST_FILENAME = "nimbus.extension.json";

/** Legacy scaffold filename; still accepted for installs and verification. */
export const EXTENSION_MANIFEST_FILENAME_LEGACY = "nimbus-extension.json";

/** Order: canonical spec first, then legacy. */
export const EXTENSION_MANIFEST_FILENAMES = [
  EXTENSION_MANIFEST_FILENAME,
  EXTENSION_MANIFEST_FILENAME_LEGACY,
] as const;

/** First manifest file present under `dir`, or undefined. */
export function resolveExtensionManifestPath(dir: string): string | undefined {
  for (const name of EXTENSION_MANIFEST_FILENAMES) {
    const p = join(dir, name);
    if (existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

/**
 * Resolved manifest shape consumed by the rest of the Gateway. `permissions`
 * is the normalized `SandboxPermissions` envelope; legacy array-form input is
 * silently mapped to default-deny by the validator (see
 * `permissions-validator.ts`).
 */
export type ExtensionManifest = {
  id: string;
  version: string;
  name?: string;
  /** Relative path to entry file (default dist/index.js). */
  entry?: string;
  /** Sandbox permission envelope (object form; legacy array → default-deny). */
  permissions: SandboxPermissions;
};

export function parseExtensionManifestJson(text: string): ExtensionManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("extension manifest is not valid JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("extension manifest must be a JSON object");
  }
  const o = parsed as Record<string, unknown>;
  const id = typeof o["id"] === "string" ? o["id"].trim() : "";
  const version = typeof o["version"] === "string" ? o["version"].trim() : "";
  if (id === "" || version === "") {
    throw new Error("extension manifest requires non-empty id and version");
  }
  const name = typeof o["name"] === "string" ? o["name"].trim() : undefined;
  const entry =
    typeof o["entry"] === "string" ? o["entry"].trim().replaceAll("\\", "/") : undefined;
  // Manifests without an explicit `permissions` field are treated as the
  // legacy default-deny shape — `validateAndNormalizePermissions(undefined)`
  // is not called directly because the validator only accepts arrays or
  // objects; missing → explicit empty object form.
  const permissions = validateAndNormalizePermissions(
    o["permissions"] === undefined ? {} : o["permissions"],
  );
  return {
    id,
    version,
    ...(name !== undefined && name !== "" ? { name } : {}),
    ...(entry !== undefined && entry !== "" ? { entry } : {}),
    permissions,
  };
}
