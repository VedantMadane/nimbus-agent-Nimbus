// Shared typed surface for built-in agent results.
// Versioned (`agentVersion: 1`) — any breaking change to the --json contract
// requires a deliberate bump, not silent drift.

export type Evidence = {
  itemId: string; // "github:org/repo#42" or "graph:<entity_id>"
  type:
    | "pr_authored"
    | "pr_reviewed"
    | "issue_opened"
    | "issue_resolved"
    | "incident_resolved"
    | "commit_authored"
    | "chat_mention"
    | "chat_post";
  serviceId: string; // "github" | "linear" | "slack" | ...
  title: string; // <=512 chars; matches item.title
  modifiedAt: number; // unix ms
  weight: number; // >=0 - contribution to ranking score
};

export type GapCategory =
  | "missing_entity_type"
  | "missing_relation_emit"
  | "missing_connector"
  | "missing_user_identity" // catchup-only
  | "empty_index";

export type GapNote = {
  category: GapCategory;
  detail: string;
  remediation?: string;
};

export type AgentBriefBase = {
  agentVersion: 1;
  generatedAt: number; // unix ms
  latencyMs: number; // measured at start/end; always populated
  gaps: GapNote[];
};

export type ExpertFinding = {
  personId: string; // empty string for unresolved authors
  displayName: string;
  evidence: Evidence[];
  score: number; // 0..1
  confidence: "high" | "medium" | "low";
};

export type ExpertBrief = AgentBriefBase & {
  kind: "expert";
  query: { topicOrFile: string };
  ranked: ExpertFinding[]; // already ordered, length <= 10
};

export type ImpactCategory =
  | "service"
  | "pipeline"
  | "dashboard"
  | "oncall_rotation"
  | "downstream_repo";

export type ImpactFinding = {
  category: ImpactCategory;
  affectedItemId: string;
  affectedTitle: string;
  serviceId: string;
  hops: number;
  pathSummary: string;
};

export type ImpactBrief = AgentBriefBase & {
  kind: "impact";
  query: { fileOrPrUrl: string };
  startEntityId: string | null;
  affected: ImpactFinding[];
};

export type CatchupItem = {
  itemId: string;
  title: string;
  modifiedAt: number;
  relevanceScore: number; // 0..1
  relevanceReasons: string[];
};

export type CatchupSection = {
  serviceId: string;
  totalItemsInWindow: number;
  items: CatchupItem[];
};

export type CatchupBrief = AgentBriefBase & {
  kind: "catchup";
  query: { sinceMs: number };
  selfPersonId: string | null;
  involvement: {
    ownedServices: string[];
    activeRepos: string[];
    incidentServices: string[];
    collaboratorPersonIds: string[];
  };
  sections: CatchupSection[];
};

export type AgentBrief = ExpertBrief | ImpactBrief | CatchupBrief;

export type BriefReadyPayload<B extends AgentBrief> = {
  sessionId: string;
  brief: string; // Markdown
  findings: B; // structured
};

// Lightweight runtime validators — used by the e2e tests to round-trip --json.
// Keep these as pure shape checks; they intentionally do not validate field
// values (e.g., score range) so changes there don't ripple here.

// Bracket access required by tsconfig's `noPropertyAccessFromIndexSignature: true`.
// Matches the existing pattern in packages/gateway/src/auth/pkce.ts:192-195.

export function isExpertBrief(x: unknown): x is ExpertBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "expert" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["ranked"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number" &&
    typeof b["query"] === "object" &&
    b["query"] !== null
  );
}

export function isImpactBrief(x: unknown): x is ImpactBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "impact" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["affected"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number" &&
    typeof b["query"] === "object" &&
    b["query"] !== null
  );
}

export function isCatchupBrief(x: unknown): x is CatchupBrief {
  if (x === null || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "catchup" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["sections"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number" &&
    typeof b["query"] === "object" &&
    b["query"] !== null
  );
}
