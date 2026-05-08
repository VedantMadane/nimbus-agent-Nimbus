#!/usr/bin/env bun
/**
 * BUG-005 diagnostic — figures out WHICH layer of the multi-turn memory
 * fix is broken in the user's runtime. Reads `nimbus.db` directly (no
 * gateway dependency) and reports:
 *
 *   1. Is sqlite-vec loadable on this connection? (drives `ensureReady`)
 *   2. Does the `session_memory` table have any rows for recent sessions?
 *   3. If so, what's the chronological tail look like?
 *
 * Run with: bun scripts/diagnose-bug-005.ts
 */
import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";

import { isVecLoaded, tryLoadSqliteVec } from "../packages/gateway/src/index/sqlite-vec-load.ts";

const DB_PATH = join(homedir(), "AppData", "Local", "Nimbus", "data", "nimbus.db");

console.log(`[diag] opening ${DB_PATH}`);
const db = new Database(DB_PATH, { readonly: true });

// ------------------------------------------------------------------ schema
const uvRow = db.query("PRAGMA user_version").get() as { user_version: number };
console.log(`[diag] schema user_version = ${uvRow.user_version} (need >= 10 for session memory)`);

// -------------------------------------------------------------------- vec
const vecLoadedOnOpen = isVecLoaded(db);
console.log(`[diag] sqlite-vec loaded on fresh connection: ${vecLoadedOnOpen}`);
if (!vecLoadedOnOpen) {
  const ok = tryLoadSqliteVec(db);
  console.log(`[diag] tryLoadSqliteVec(db) -> ${ok}`);
  if (ok) {
    console.log(`[diag] isVecLoaded after load: ${isVecLoaded(db)}`);
  }
}

// ------------------------------------------------------ session_memory table
let count = 0;
try {
  const r = db.query("SELECT COUNT(*) AS c FROM session_memory").get() as { c: number };
  count = r.c;
} catch (e) {
  console.log(`[diag] session_memory query failed: ${(e as Error).message}`);
}
console.log(`[diag] session_memory total rows: ${count}`);

if (count > 0) {
  const sessions = db
    .query(
      `SELECT session_id AS sessionId,
              MAX(created_at) AS lastWriteAt,
              COUNT(*) AS chunkCount
       FROM session_memory
       GROUP BY session_id
       ORDER BY lastWriteAt DESC
       LIMIT 5`,
    )
    .all() as Array<{ sessionId: string; lastWriteAt: number; chunkCount: number }>;
  console.log(`[diag] last 5 sessions (most recent first):`);
  for (const s of sessions) {
    const when = new Date(s.lastWriteAt).toISOString();
    console.log(`  - ${s.sessionId}  chunks=${s.chunkCount}  lastWrite=${when}`);
  }

  const latest = sessions[0];
  if (latest !== undefined) {
    console.log(`[diag] tail of most recent session (${latest.sessionId}):`);
    const turns = db
      .query(
        `SELECT role, chunk_text AS text, created_at AS createdAt
         FROM session_memory
         WHERE session_id = ?
         ORDER BY created_at ASC
         LIMIT 12`,
      )
      .all(latest.sessionId) as Array<{ role: string; text: string; createdAt: number }>;
    for (const t of turns) {
      const when = new Date(t.createdAt).toISOString();
      const preview = t.text.length > 80 ? `${t.text.slice(0, 80)}…` : t.text;
      console.log(`  [${when}] ${t.role}: ${preview}`);
    }
  }
}

// ------------------------------------------------------------- summary
console.log("");
console.log("[summary]");
if (uvRow.user_version < 10) {
  console.log("  ❌ Schema is too old. Memory fix can't run. Run nimbus db verify.");
} else if (!isVecLoaded(db)) {
  console.log("  ❌ sqlite-vec is NOT loadable on this machine.");
  console.log("     SessionMemoryStore.ensureReady() returns false → append() and");
  console.log("     getRecentTurns() silently no-op. This is BUG-005's failure path.");
  console.log("     Fix: investigate why sqlite-vec optionalDep isn't installed/loadable.");
} else if (count === 0) {
  console.log("  ❌ Schema OK, vec OK, but session_memory has zero rows.");
  console.log("     The runAsk auto-append code path is not firing. Probable cause:");
  console.log("     either sessionId isn't reaching runAsk, or the `if` guard fails.");
} else {
  console.log(`  ✅ session_memory has ${count} rows across recent sessions.`);
  console.log("     Memory IS being recorded. If multi-turn UX still fails, the");
  console.log("     bug is in priorTurns→Mastra agent, not in storage.");
}

db.close();
