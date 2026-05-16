import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { insertWatcher } from "../../../src/automation/watcher-store.ts";
import { transitionHealth } from "../../../src/connectors/health.ts";
import { appendAuditEntry } from "../../../src/db/audit-chain.ts";
import { DiskFullError } from "../../../src/db/write.ts";
import { SqliteEmbeddingPipeline } from "../../../src/embedding/pipeline.ts";
import { upsertIndexedItem } from "../../../src/index/item-store.ts";
import { runIndexedSchemaMigrations } from "../../../src/index/migrations/runner.ts";
import { insertPerson } from "../../../src/people/person-store.ts";
import { upsertSchedulerRegistration } from "../../../src/sync/scheduler-store.ts";

/**
 * Build a DB that is "full" — no new pages can be allocated.
 *
 * Strategy:
 *   1. Run all migrations so the schema is complete.
 *   2. VACUUM to compact the DB (all pages are densely packed after migration).
 *   3. Set max_page_count = current page_count so no new pages can be allocated.
 *   4. Fill remaining slack inside existing B-tree pages by inserting into the
 *      tables that the tests target, using raw db.run() (bypassing dbRun so
 *      the fill itself does NOT produce DiskFullError).
 *
 * Because each B-tree table manages its own page slots, we must fill the
 * relevant tables explicitly.  After the fill, any INSERT that needs a new
 * page or page-split will fail with SQLITE_FULL, which dbRun/dbExec/dbStmtRun
 * convert to DiskFullError.
 *
 * Note: pure in-place UPDATEs to small fixed-size columns (INTEGER fields)
 * never need new pages, so they cannot be tested with this approach.  Those
 * call sites are tested indirectly via the INSERT paths of the same subsystem.
 */
function makeTinyDb(): { db: Database; cleanup: () => void; cap: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "nimbus-diskfull-"));
  const dbPath = join(dir, "nimbus.db");
  const db = new Database(dbPath);
  runIndexedSchemaMigrations(db, 30);
  return {
    db,
    cap: () => {
      db.exec("VACUUM");
      const row = db.query("PRAGMA page_count").get() as { page_count: number };
      db.exec(`PRAGMA max_page_count = ${String(row.page_count)}`);
      // Fill every B-tree that the tests target.  Each fill runs until
      // SQLITE_FULL fires 5 consecutive times, ensuring not just that no new
      // page can be allocated but also that the final partially-filled leaf page
      // has no remaining slot slack.  Rows are given unique IDs (appending `:i`)
      // so UNIQUE constraints never fire before SQLITE_FULL does.
      //
      // Per-table param factories (not anonymous so TypeScript is happy):
      const tableFills: Array<() => void> = [
        // audit_log — no unique constraint on any column
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO audit_log (action_type, hitl_status, action_json, timestamp) VALUES (?, ?, ?, ?)",
                ["_fill", "not_required", "{}", i],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // connector_health_history — connector_id not unique; vary it anyway to spread rows
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO connector_health_history (connector_id, from_state, to_state, reason, occurred_at) VALUES (?, ?, ?, ?, ?)",
                [`_fill:${String(i)}`, "healthy", "healthy", null, i],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // item — UNIQUE(service, external_id); vary external_id
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO item (id, service, type, external_id, title, modified_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [`_fill:${String(i)}`, "_fill", "_fill", `ext:${String(i)}`, "_fill", 0, 0],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // graph_entity — UNIQUE(type, external_id); vary both
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO graph_entity (id, type, external_id, label, service, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                [`_fill:${String(i)}`, "_fill", `ext:${String(i)}`, "_fill", "_fill", "{}"],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // sub_task_results — vary session_id and parent_id
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO sub_task_results (session_id, parent_id, task_index, task_type, status, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [`sess:${String(i)}`, `par:${String(i)}`, i, "_fill", "done", 0, 0],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // person — UNIQUE(id); correct column names; vary id
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO person (id, display_name, canonical_email, github_login, gitlab_login, slack_handle, linear_member_id, jira_account_id, notion_user_id, bitbucket_uuid, microsoft_user_id, discord_user_id, linked, metadata) VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, ?)",
                [`_fill:${String(i)}`, "name", "{}"],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // watcher — UNIQUE(id); vary id
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO watcher (id, name, enabled, condition_type, condition_json, action_type, action_json, created_at, graph_predicate_json) VALUES (?, ?, 1, ?, ?, ?, ?, ?, NULL)",
                [`_fill:${String(i)}`, "w", "always", "{}", "noop", "{}", 0],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
        // scheduler_state — UNIQUE(service_id); vary service_id; status must be 'ok'|'backoff'|'error'
        () => {
          let consecutive = 0;
          for (let i = 0; i < 200_000 && consecutive < 5; i++) {
            try {
              db.run(
                "INSERT INTO scheduler_state (service_id, cursor, interval_ms, last_sync_at, next_sync_at, status, error_msg, consecutive_failures, paused) VALUES (?, NULL, ?, NULL, ?, 'ok', NULL, 0, 0)",
                [`_fill:${String(i)}`, 60_000, 0],
              );
              consecutive = 0;
            } catch {
              consecutive++;
            }
          }
        },
      ];
      for (const fill of tableFills) {
        fill();
      }
    },
    cleanup: () => {
      db.close();
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* Windows file-handle race; harmless */
      }
    },
  };
}

describe("disk-full propagation through migrated stores", () => {
  test("audit-chain: appendAuditEntry throws DiskFullError when disk is full", () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      cap();
      expect(() =>
        appendAuditEntry(db, {
          actionType: "test.action",
          hitlStatus: "not_required",
          actionJson: "{}",
          timestamp: Date.now(),
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("sync: upsertSchedulerRegistration INSERT throws DiskFullError when disk is full", () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      // cap() fills scheduler_state pages; the INSERT path in
      // upsertSchedulerRegistration (new service → INSERT) must fail.
      cap();
      expect(() => upsertSchedulerRegistration(db, "new-svc", 60000, Date.now(), false)).toThrow(
        DiskFullError,
      );
    } finally {
      cleanup();
    }
  });

  test("people: insertPerson throws DiskFullError when disk is full", () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      cap();
      expect(() =>
        insertPerson(db, {
          id: "p:test",
          displayName: "test",
          canonicalEmail: null,
          githubLogin: null,
          gitlabLogin: null,
          slackHandle: null,
          linearMemberId: null,
          jiraAccountId: null,
          notionUserId: null,
          linked: false,
          metadata: {},
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("automation: insertWatcher throws DiskFullError when disk is full", () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      // cap() fills watcher pages; a new insertWatcher call must fail.
      cap();
      expect(() =>
        insertWatcher(db, {
          name: "new-watcher",
          enabled: 1,
          condition_type: "always",
          condition_json: "{}",
          action_type: "noop",
          action_json: "{}",
          created_at: Date.now(),
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("connectors: transitionHealth/appendHistory throws DiskFullError when disk is full", () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      // cap() fills both sync_state-adjacent and connector_health_history pages.
      // transitionHealth on an unknown connector does INSERT OR IGNORE into
      // sync_state, then INSERT into connector_health_history — both need new
      // pages and fail.
      cap();
      expect(() => transitionHealth(db, "github", { type: "sync_success" })).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("engine: dbRun INSERT into sub_task_results throws DiskFullError when disk is full (validates lastInsertRowid path)", async () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      cap();
      // tryPersistStart catches errors silently by design, so we can't rely on
      // its public surface to throw. Instead, exercise dbRun directly on the
      // same INSERT shape — the disk-full propagation through dbRun is what
      // I14 guarantees, and tryPersistStart's swallow behaviour is preserved.
      const { dbRun } = await import("../../../src/db/write.ts");
      expect(() =>
        dbRun(
          db,
          `INSERT INTO sub_task_results
           (session_id, parent_id, task_index, task_type, status, started_at, created_at)
           VALUES (?, ?, ?, ?, 'running', ?, ?)`,
          ["s", "p", 0, "test", Date.now(), Date.now()],
        ),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });

  test("embedding: embedItem (via dbStmtRun on insertVec/insertChunk) throws when disk is full", async () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      cap();
      // Minimal fake embedder — returns one 384-dim zero vector per chunk.
      const fakeEmbedder = {
        model: "test-model",
        dims: 384,
        async embed(texts: string[]): Promise<Float32Array[]> {
          return texts.map(() => new Float32Array(384));
        },
      };
      const pipeline = new SqliteEmbeddingPipeline({ db, embedder: fakeEmbedder });
      // sqlite-vec wraps SQLITE_FULL in its own error object (errno=1, no sqlite
      // error code), so the error propagates as a plain Error rather than
      // DiskFullError. Accept either — the important thing is that the error
      // propagates and does not get swallowed.
      await expect(
        pipeline.embedItem({
          id: "item:test",
          service: "test",
          type: "doc",
          title: "test-title",
          body_preview: "test-body",
        }),
      ).rejects.toThrow();
    } finally {
      cleanup();
    }
  });

  test("index: upsertIndexedItem throws DiskFullError when disk is full", () => {
    const { db, cleanup, cap } = makeTinyDb();
    try {
      cap();
      expect(() =>
        upsertIndexedItem(db, {
          service: "github",
          type: "pr",
          externalId: "test-999",
          title: "test",
          modifiedAt: Date.now(),
          syncedAt: Date.now(),
        }),
      ).toThrow(DiskFullError);
    } finally {
      cleanup();
    }
  });
});
