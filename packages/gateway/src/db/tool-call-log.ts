/**
 * Canonical helper for the `tool_call_log` audit table (V29). Owns both the
 * write side (called from the two `wrapToolOutput` wiring sites) and the
 * read side (called from the `audit.toolCalls` IPC handler).
 *
 * Mirrors the `db/audit-chain.ts` shape: pure functions over a `Database`
 * handle, no class, no module-private state.
 */

import type { Database } from "bun:sqlite";

import { dbRun } from "./write.ts";

/** Per-row envelope cap (bytes). 64 KiB; the truncation marker fits inside. */
export const MAX_ENVELOPE_BYTES = 65_536;

export interface ToolCallLogEntry {
  /** Active session, or null when no agentRequestContext.run is in scope. */
  sessionId: string | null;
  /** Mastra-namespaced tool id (e.g. "github_repo_pr_list", "searchLocalIndex"). */
  toolId: string;
  /** Connector / service id (e.g. "github", "filesystem", "local"). */
  service: string;
  /** Unix ms when the wrapped tool was invoked. */
  calledAt: number;
  /** Wall-clock ms from invocation to envelope emission. */
  durationMs: number;
  /** Full <tool_output>...</tool_output> envelope, capped at 64 KiB. */
  resultEnvelope: string;
  /** 'ok' on resolve; 'error' on throw (envelope wraps the error message). */
  status: "ok" | "error";
}

export interface ToolCallLogReadEntry extends ToolCallLogEntry {
  id: number;
}

export interface ToolCallLogFilter {
  /** Inclusive lower bound on called_at (unix ms). */
  since?: number;
  /** Inclusive upper bound on called_at (unix ms). */
  until?: number;
  /** 1..1000, default 100. */
  limit?: number;
  /**
   * sessionId='' (empty string) → ONLY rows with NULL session_id.
   * sessionId='s-x' (non-empty) → ONLY rows with that exact session.
   * Omit field entirely → no session filter.
   */
  sessionId?: string;
  /** Exact-match filter on tool_id. */
  toolId?: string;
  /** Exact-match filter on status. */
  status?: "ok" | "error";
  /** Resumption cursor from a previous nextCursor. */
  cursor?: { calledAt: number; id: number } | undefined;
}

export interface ToolCallLogReadResult {
  toolCalls: ToolCallLogReadEntry[];
  hasMore: boolean;
  nextCursor: { calledAt: number; id: number } | null;
}

/**
 * Truncate `envelope` to `MAX_ENVELOPE_BYTES` UTF-8 bytes if needed,
 * appending a grep-able `...[truncated, N bytes total]` marker.
 *
 * The marker length depends on the digit count of `total`, so the head
 * budget is computed dynamically: `head_budget = cap - marker.length`.
 * This guarantees `head + marker <= cap` for any input size.
 *
 * Mid-multi-byte cuts may emit U+FFFD at the cut point; documented as
 * expected behaviour in the spec §5.2 ("Multi-byte cut behaviour").
 */
function truncateEnvelope(envelope: string): string {
  const total = Buffer.byteLength(envelope, "utf8");
  if (total <= MAX_ENVELOPE_BYTES) return envelope;
  const marker = `...[truncated, ${String(total)} bytes total]`;
  const markerBytes = Buffer.byteLength(marker, "utf8");
  const headBudget = MAX_ENVELOPE_BYTES - markerBytes;
  const head = Buffer.from(envelope, "utf8").subarray(0, headBudget).toString("utf8");
  return `${head}${marker}`;
}

const INSERT_SQL = `
INSERT INTO tool_call_log
  (session_id, tool_id, service, called_at, duration_ms, result_envelope, status)
VALUES (?, ?, ?, ?, ?, ?, ?)
`.trim();

/**
 * Write one row into `tool_call_log`. Internal try/catch swallows
 * `DiskFullError` and constraint violations so the LLM-facing path is
 * never broken by an audit-write failure (forensic completeness is
 * best-effort; functional correctness is mandatory).
 */
export function writeToolCallLog(db: Database, entry: ToolCallLogEntry): void {
  const envelope = truncateEnvelope(entry.resultEnvelope);
  try {
    dbRun(db, INSERT_SQL, [
      entry.sessionId,
      entry.toolId,
      entry.service,
      entry.calledAt,
      entry.durationMs,
      envelope,
      entry.status,
    ]);
  } catch {
    // Best-effort. The two wiring sites are not allowed to throw because of
    // an audit-write failure — the user's tool call must still complete.
  }
}

/**
 * Read rows from `tool_call_log` with filtering + pagination.
 *
 * Pagination uses a composite (called_at, id) cursor — see spec §6.2 for
 * the rationale (bare-timestamp cursor would re-return same-millisecond
 * rows or skip them, with no way for the caller to disambiguate).
 */
export function readToolCallLog(db: Database, filter: ToolCallLogFilter): ToolCallLogReadResult {
  const limit = clampLimit(filter.limit);
  const where: string[] = [];
  const args: Array<string | number | null> = [];

  if (filter.since !== undefined) {
    where.push("called_at >= ?");
    args.push(filter.since);
  }
  if (filter.until !== undefined) {
    where.push("called_at <= ?");
    args.push(filter.until);
  }
  if (filter.sessionId !== undefined) {
    if (filter.sessionId === "") {
      where.push("session_id IS NULL");
    } else {
      where.push("session_id = ?");
      args.push(filter.sessionId);
    }
  }
  if (filter.toolId !== undefined) {
    where.push("tool_id = ?");
    args.push(filter.toolId);
  }
  if (filter.status !== undefined) {
    where.push("status = ?");
    args.push(filter.status);
  }
  if (filter.cursor !== undefined) {
    where.push("(called_at > ? OR (called_at = ? AND id > ?))");
    args.push(filter.cursor.calledAt, filter.cursor.calledAt, filter.cursor.id);
  }

  const whereClause = where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`;
  // Fetch limit+1 so we can detect hasMore without a second query.
  const sql = `
SELECT id, session_id, tool_id, service, called_at, duration_ms, result_envelope, status
FROM tool_call_log
${whereClause}
ORDER BY called_at ASC, id ASC
LIMIT ?
`.trim();

  type Row = {
    id: number;
    session_id: string | null;
    tool_id: string;
    service: string;
    called_at: number;
    duration_ms: number;
    result_envelope: string;
    status: "ok" | "error";
  };

  const rows = db.query(sql).all(...args, limit + 1) as Row[];
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  const toolCalls: ToolCallLogReadEntry[] = visible.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    toolId: r.tool_id,
    service: r.service,
    calledAt: r.called_at,
    durationMs: r.duration_ms,
    resultEnvelope: r.result_envelope,
    status: r.status,
  }));

  const last = toolCalls.at(-1);
  const nextCursor =
    hasMore && last !== undefined ? { calledAt: last.calledAt, id: last.id } : null;
  return { toolCalls, hasMore, nextCursor };
}

function clampLimit(raw: number | undefined): number {
  if (raw === undefined) return 100;
  if (!Number.isInteger(raw) || raw < 1) return 100;
  if (raw > 1_000) return 1_000;
  return raw;
}
