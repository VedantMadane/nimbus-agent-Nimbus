import type { Database } from "bun:sqlite";
import { AgentCoordinator, type SubTask } from "../engine/coordinator.ts";
import type { GapNote, ImpactBrief, ImpactCategory, ImpactFinding } from "./_lib/findings.ts";
import {
  aggregateMissingEntityTypes,
  detectEmptyIndex,
  detectMissingConnector,
  detectMissingEntityType,
} from "./_lib/gap-notes.ts";
import { type SynthesizerLlm, synthesize } from "./_lib/synthesize.ts";

export type ImpactInput = {
  fileOrPrUrl: string;
  depth?: number;
  service?: string;
};

export type ImpactContext = {
  db: Database;
  llm?: SynthesizerLlm;
  notify: (method: string, params: unknown) => void;
  sessionId: string;
};

const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 5;

type ResolvedStart = {
  entityId: string;
  entityType: string; // "code_symbol" | "pr" | "topic"
  repoIds: string[]; // graph_entity.id values for any repo entities tied to the start
};

type SubAgentResult = {
  findings?: ImpactFinding[];
  gap?: GapNote;
};

function makeSubAgent(
  fn: (db: Database, input: ImpactInput, start: ResolvedStart | null) => Promise<SubAgentResult>,
  db: Database,
  input: ImpactInput,
  start: ResolvedStart | null,
): SubTask {
  return {
    taskType: "agent_step",
    prompt: "",
    execute: async () => {
      const out = await fn(db, input, start);
      return { text: JSON.stringify(out), tokensIn: 0, tokensOut: 0 };
    },
  };
}

export async function runImpact(input: ImpactInput, ctx: ImpactContext): Promise<ImpactBrief> {
  const start = performance.now();
  const depth = Math.min(input.depth ?? DEFAULT_DEPTH, MAX_DEPTH);
  // Today's sub-agents are fixed-shape single-hop SQL — `depth` has no effect.
  // It will start mattering once `subDownstreamCode` is rewritten as a recursive
  // CTE over `depends_on` (deferred follow-up: depends on symbol-level depends_on
  // landing in graph-populator and on a cycle-detection design — see the
  // "Deferred follow-ups" section). The CLI accepts the flag now so that future
  // change is non-breaking.
  void depth;

  const preflightGaps: GapNote[] = [];
  const empty = detectEmptyIndex(ctx.db);
  if (empty !== null) preflightGaps.push(empty);

  const resolved = resolveStartEntity(ctx.db, input.fileOrPrUrl);

  const coordinator = new AgentCoordinator({
    sessionId: ctx.sessionId,
    parentId: `impact:${ctx.sessionId}`,
    depth: 1,
    toolCallCount: { value: 0 },
  });

  const tasks: SubTask[] = [
    makeSubAgent(subDownstreamCode, ctx.db, input, resolved),
    makeSubAgent(subPipelines, ctx.db, input, resolved),
    makeSubAgent(subOncall, ctx.db, input, resolved),
    makeSubAgent(subDashboards, ctx.db, input, resolved),
    makeSubAgent(subDownstreamRepos, ctx.db, input, resolved),
  ];

  const results = await coordinator.run(tasks);

  const allFindings: ImpactFinding[] = [];
  const subAgentGaps: GapNote[] = [];
  for (const r of results) {
    if (r.status !== "done" || r.text === undefined) {
      subAgentGaps.push({
        category: "missing_connector",
        detail: `impact sub-agent #${r.taskIndex} failed${
          r.errorText === undefined ? "" : `: ${r.errorText}`
        }`,
      });
      continue;
    }
    const decoded: SubAgentResult = JSON.parse(r.text);
    if (decoded.findings !== undefined) allFindings.push(...decoded.findings);
    if (decoded.gap !== undefined) subAgentGaps.push(decoded.gap);
  }

  const filtered =
    input.service === undefined
      ? allFindings
      : allFindings.filter((f) => f.serviceId === input.service);

  const gaps = aggregateMissingEntityTypes([...preflightGaps, ...subAgentGaps]);

  return {
    kind: "impact",
    agentVersion: 1,
    generatedAt: Date.now(),
    latencyMs: Math.round(performance.now() - start),
    gaps,
    query: { fileOrPrUrl: input.fileOrPrUrl },
    startEntityId: resolved === null ? null : resolved.entityId,
    affected: filtered,
  };
}

export async function emitImpactBrief(
  input: ImpactInput,
  ctx: ImpactContext,
): Promise<{ sessionId: string }> {
  void (async () => {
    const brief = await runImpact(input, ctx);
    const markdown = await synthesize(brief, ctx.llm === undefined ? {} : { llm: ctx.llm });
    ctx.notify("impact.briefReady", {
      sessionId: ctx.sessionId,
      brief: markdown,
      findings: brief,
    });
  })().catch((err: unknown) => {
    ctx.notify("impact.briefError", {
      sessionId: ctx.sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
  return { sessionId: ctx.sessionId };
}

// ============================================================================
// Stage 1 — start-entity resolution + 5 sub-agents.
// All SQL uses the real schema (item, graph_entity, graph_relation, person).
// ============================================================================

// Maps well-known PR-hosting hostnames to the Nimbus service id used as the
// prefix in graph_entity.external_id (e.g. "github:acme/payment#501").
const HOST_TO_SERVICE: Readonly<Record<string, string>> = Object.freeze({
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
});

// Group 1 = hostname, 2 = owner, 3 = repo, 4 = PR number.
const PR_URL_RE = /^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

function resolveStartEntity(db: Database, fileOrPrUrl: string): ResolvedStart | null {
  // Branch 1 — PR URL ⇒ graph_entity{type='pr', external_id=<service:owner/repo#N>}.
  // graph-populator.ts:44 writes externalId: row.id where row.id comes from
  // itemPrimaryKey(service, externalId), so the stored external_id is always
  // service-prefixed (e.g. "github:acme/payment#501").
  const m = fileOrPrUrl.match(PR_URL_RE);
  if (m !== null) {
    // m[1..4] are guaranteed by PR_URL_RE's four capture groups.
    const [, rawHost, owner, repo, prNum] = m as [string, string, string, string, string];
    const host = rawHost.toLowerCase();
    // Fallback for self-hosted instances (e.g. "gitlab.example.com" → "gitlab").
    const hostFirstSegment = host.split(".").at(0) ?? host;
    const service = HOST_TO_SERVICE[host] ?? hostFirstSegment;
    const externalId = `${service}:${owner}/${repo}#${prNum}`;
    const row = db
      .query("SELECT id FROM graph_entity WHERE type = 'pr' AND external_id = ? LIMIT 1")
      .get(externalId) as { id?: string } | null;
    if (row?.id !== undefined) {
      return {
        entityId: row.id,
        entityType: "pr",
        // repo label in graph_entity is the unprefixed "owner/repo" value
        // (graph-populator.ts:57: label: repoFull), so repoIdsForRepoLabel
        // correctly receives the unprefixed form.
        repoIds: repoIdsForRepoLabel(db, `${owner}/${repo}`),
      };
    }
  }

  // Branch 2 — file path ⇒ best-matching `symbol` entity (the populator emits
  // type='symbol', not 'code_symbol' — see packages/gateway/src/graph/graph-populator.ts:172).
  // Two-pass for determinism: exact label first; fall back to LIKE with the
  // shortest label as a "most specific match" tiebreaker so we never depend on
  // SQLite row order.
  const exactSym = db
    .query("SELECT id FROM graph_entity WHERE type = 'symbol' AND label = ? LIMIT 1")
    .get(fileOrPrUrl) as { id?: string } | null;
  const sym =
    exactSym?.id !== undefined
      ? exactSym
      : (db
          .query(
            "SELECT id FROM graph_entity WHERE type = 'symbol' AND label LIKE '%' || ? || '%' " +
              "ORDER BY length(label) ASC, id ASC LIMIT 1",
          )
          .get(fileOrPrUrl) as { id?: string } | null);
  if (sym?.id !== undefined) {
    return { entityId: sym.id, entityType: "symbol", repoIds: [] };
  }

  // Branch 3 — topic FTS over item.title.
  const topic = db
    .query(
      "SELECT i.id AS item_id FROM item i WHERE i.title LIKE '%' || ? || '%' OR i.body_preview LIKE '%' || ? || '%' ORDER BY i.modified_at DESC LIMIT 1",
    )
    .get(fileOrPrUrl, fileOrPrUrl) as { item_id?: string } | null;
  if (topic?.item_id !== undefined) {
    return { entityId: `item:${topic.item_id}`, entityType: "topic", repoIds: [] };
  }
  return null;
}

function repoIdsForRepoLabel(db: Database, repoLabel: string): string[] {
  const rows = db
    .query("SELECT id FROM graph_entity WHERE type = 'repo' AND label = ? LIMIT 5")
    .all(repoLabel) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

async function subDownstreamCode(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // `depends_on` IS registered (graph-relation-types-v12-sql.ts) AND emitted —
  // but only at workspace→package granularity (graph-populator.ts:160). The
  // sub-agent does the reverse-traversal SQL anyway: when symbol-level
  // depends_on later lands, this lights up with no T3 edit. Until then, the
  // SQL returns 0 rows for symbol-typed starts, and we surface a granularity
  // gap so users see *why* downstream-code is empty rather than silently
  // empty (which would break the gap-coverage rule).
  if (start === null) {
    return {
      gap: {
        category: "missing_relation_emit",
        detail: "Cannot traverse `depends_on`: start entity did not resolve.",
      },
    };
  }
  const rows = db
    .query(
      `SELECT
         e.id    AS entity_id,
         e.label AS title,
         COALESCE(e.service, 'filesystem') AS service_id
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.from_id
       WHERE r.to_id = ? AND r.type = 'depends_on'
       LIMIT 50`,
    )
    .all(start.entityId) as Array<{ entity_id: string; title: string; service_id: string }>;
  if (rows.length === 0) {
    return {
      gap: {
        category: "missing_relation_emit",
        detail: "No reverse `depends_on` edges to the start entity.",
        remediation:
          "graph-populator currently emits `depends_on` only at workspace→package granularity; symbol-level `depends_on` is a populator follow-up.",
      },
    };
  }
  return {
    findings: rows.map((r) => ({
      // No `downstream_code` bucket exists in ImpactCategory; reusing
      // `downstream_repo` is the closest fit and mirrors the spec's bucket list.
      // Bucket-naming polish is tracked in the deferred-follow-ups section.
      category: "downstream_repo" as ImpactCategory,
      affectedItemId: r.entity_id,
      affectedTitle: r.title,
      serviceId: r.service_id,
      hops: 1,
      pathSummary: `(reverse) ${start.entityType} <- depends_on <- result`,
    })),
  };
}

async function subPipelines(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  if (start === null) {
    return {
      gap: {
        category: "missing_relation_emit",
        detail: "Cannot traverse `triggers`: start entity did not resolve.",
      },
    };
  }

  // `triggers` originates from repo entities in the populator (graph-populator.ts
  // does not emit triggers from `pr` or `symbol`). So when the start is a PR,
  // walk from the PR's resolved repo entities; otherwise walk from start
  // directly. This matches the spec's "From the resolved repo, walk `triggers`".
  const sourceIds = start.repoIds.length > 0 ? start.repoIds : [start.entityId];
  const placeholders = sourceIds.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT
         e.id          AS entity_id,
         e.label       AS title,
         COALESCE(e.service, 'github') AS service_id
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.to_id AND e.type IN ('ci_run', 'pipeline_run')
       WHERE r.from_id IN (${placeholders}) AND r.type = 'triggers'
       LIMIT 50`,
    )
    .all(...sourceIds) as Array<{ entity_id: string; title: string; service_id: string }>;
  if (rows.length > 0) {
    const pathSummary =
      start.repoIds.length > 0
        ? `${start.entityType} → in_repo → repo → triggers → ci_run`
        : `${start.entityType} → triggers → ci_run`;
    const hops = start.repoIds.length > 0 ? 2 : 1;
    return {
      findings: rows.map((r) => ({
        category: "pipeline" as ImpactCategory,
        affectedItemId: r.entity_id,
        affectedTitle: r.title,
        serviceId: r.service_id,
        hops,
        pathSummary,
      })),
    };
  }
  // No triggers→ci_run/pipeline_run hits — the most common reason today is that
  // the populator does not emit `triggers` and `pipeline_run` is not in the
  // dispatch table. Surface that as a gap so the user sees *why* the bucket is
  // empty, not just an empty bucket.
  const gap = detectMissingEntityType(db, "pipeline_run");
  if (gap !== null) return { gap };
  return {};
}

async function subOncall(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // PagerDuty schedules require the connector. If absent, gap; else traverse
  // service → belongs_to → oncall_rotation.
  const gap = detectMissingConnector(db, "pagerduty");
  if (gap !== null) return { gap };
  if (start === null) {
    return {
      gap: {
        category: "missing_relation_emit",
        detail: "Cannot traverse `belongs_to`: start entity did not resolve.",
      },
    };
  }

  const rows = db
    .query(
      `SELECT
         e.id   AS entity_id,
         e.label AS title
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.to_id AND e.type = 'oncall_rotation'
       WHERE r.from_id = ? AND r.type = 'belongs_to'
       LIMIT 50`,
    )
    .all(start.entityId) as Array<{ entity_id: string; title: string }>;
  if (rows.length === 0) return {};
  return {
    findings: rows.map((r) => ({
      category: "oncall_rotation" as ImpactCategory,
      affectedItemId: r.entity_id,
      affectedTitle: r.title,
      serviceId: "pagerduty",
      hops: 2,
      pathSummary: "service → belongs_to → oncall_rotation",
    })),
  };
}

async function subDashboards(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // dashboard / data_model / upstream_refs are all populator-pending. We only
  // surface ONE gap per sub-agent — `aggregateMissingEntityTypes` will fold any
  // missing-entity gaps from sibling sub-agents into a single combined note.
  const gap = detectMissingEntityType(db, "dashboard");
  if (gap !== null) return { gap };
  if (start === null) return {};

  const rows = db
    .query(
      `SELECT
         e.id   AS entity_id,
         e.label AS title,
         COALESCE(e.service, 'unknown') AS service_id
       FROM graph_relation r
       JOIN graph_entity   e ON e.id = r.to_id AND e.type = 'dashboard'
       WHERE r.from_id = ? AND r.type = 'upstream_refs'
       LIMIT 50`,
    )
    .all(start.entityId) as Array<{ entity_id: string; title: string; service_id: string }>;
  if (rows.length === 0) return {};
  const pathSummary = `${start.entityType} → upstream_refs → dashboard`;
  return {
    findings: rows.map((r) => ({
      category: "dashboard" as ImpactCategory,
      affectedItemId: r.entity_id,
      affectedTitle: r.title,
      serviceId: r.service_id,
      hops: 1,
      pathSummary,
    })),
  };
}

async function subDownstreamRepos(
  db: Database,
  _input: ImpactInput,
  start: ResolvedStart | null,
): Promise<SubAgentResult> {
  // Repos a PR / commit touches — direct service-level finding when the start
  // is itself a `pr` entity with a known repo. No graph traversal needed.
  if (start === null) {
    return {
      gap: {
        category: "missing_relation_emit",
        detail: "Cannot resolve downstream repos: start entity did not resolve.",
      },
    };
  }
  // A non-null start with no repoIds means the input is a file/topic, not a PR
  // — downstream-repo traversal is only meaningful for PRs. Silently skip.
  if (start.repoIds.length === 0) return {};
  const placeholders = start.repoIds.map(() => "?").join(",");
  const rows = db
    .query(
      `SELECT id, label, COALESCE(service, 'github') AS service_id
         FROM graph_entity
         WHERE id IN (${placeholders})`,
    )
    .all(...start.repoIds) as Array<{ id: string; label: string; service_id: string }>;
  if (rows.length === 0) return {};
  return {
    findings: rows.map((r) => ({
      category: "service" as ImpactCategory,
      affectedItemId: r.id,
      affectedTitle: r.label,
      serviceId: r.service_id,
      hops: 1,
      pathSummary: "pr → in_repo → repo",
    })),
  };
}
