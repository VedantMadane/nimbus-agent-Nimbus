import type { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { dirname, join, posix as posixPath, win32 as winPath } from "node:path";
import pino from "pino";
import { load as loadSqliteVec } from "sqlite-vec";

const log = pino({
  name: "sqlite-vec-load",
  level: process.env["NIMBUS_LOG_LEVEL"] ?? "info",
});

/**
 * Loads the sqlite-vec extension into this connection.
 * @returns false if the platform has no prebuilt binary or load fails (embeddings stay disabled).
 */
export function tryLoadSqliteVec(db: Database): boolean {
  try {
    loadSqliteVec(db);
    log.debug({ via: "npm" }, "sqlite-vec loaded");
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.debug({ err: msg }, "upstream sqlite-vec load failed; trying sidecar");
    return tryLoadFromSidecar(db);
  }
}

/**
 * Loads sqlite-vec or throws with a short, actionable message (Gateway / tests).
 */
export function loadSqliteVecOrThrow(db: Database): void {
  if (!tryLoadSqliteVec(db)) {
    throw new Error(
      "sqlite-vec could not be loaded. Embeddings require a supported platform (see sqlite-vec npm optionalDependencies).",
    );
  }
}

/**
 * Returns true if the sqlite-vec extension is currently loaded on this connection.
 * Useful in tests to skip vec-specific assertions on platforms where the extension
 * cannot be loaded (e.g. macOS CI without a properly signed native dylib).
 */
export function isVecLoaded(db: Database): boolean {
  try {
    db.query("SELECT vec_version()").get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures sqlite-vec is loaded on this connection when the schema includes vector tables (v6+).
 * Migrations load the extension once; reopening `nimbus.db` requires loading again per connection.
 */
export function ensureSqliteVecForConnection(db: Database, indexedUserVersion: number): boolean {
  if (indexedUserVersion < 6) {
    return true;
  }
  try {
    db.query("SELECT vec_version()").get();
    return true;
  } catch {
    return tryLoadSqliteVec(db);
  }
}

export function sidecarFilename(platform: NodeJS.Platform): string {
  if (platform === "win32") return "vec0.dll";
  if (platform === "darwin") return "vec0.dylib";
  return "vec0.so";
}

// Compiled-binary fallback path: vec0.{ext} adjacent to the running executable.
// Uses the platform-specific path module so the result is correct regardless of host OS
// (a Linux CI runner computing a Windows path must not rely on POSIX `dirname`/`join`).
export function sidecarPath(execPath: string, platform: NodeJS.Platform): string {
  const p = platform === "win32" ? winPath : posixPath;
  return p.join(p.dirname(execPath), sidecarFilename(platform));
}

export function tryLoadFromSidecar(
  db: Database,
  baseDir: string = dirname(process.execPath),
): boolean {
  const path = join(baseDir, sidecarFilename(process.platform));
  if (!existsSync(path)) {
    log.debug({ sidecar: path }, "sqlite-vec sidecar not found; semantic memory disabled");
    return false;
  }
  try {
    db.loadExtension(path);
    log.debug({ via: "sidecar", sidecar: path }, "sqlite-vec loaded");
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.debug({ sidecar: path, err: msg }, "sqlite-vec sidecar load failed");
    return false;
  }
}
