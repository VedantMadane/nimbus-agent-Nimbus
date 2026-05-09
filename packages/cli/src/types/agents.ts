// Slim CLI-side mirror of packages/gateway/src/agents/_lib/findings.ts.
// Kept manually in sync — runtime payload is JSON, so a divergence here
// is caught at e2e time by isExpertBrief (which the CLI re-implements
// below, also locally, to avoid cross-package imports).
//
// If this file diverges from the gateway types, the e2e --json round-trip
// test fails. Treat that signal as authoritative; sync this file forward.

export type Evidence = {
  itemId: string;
  type:
    | "pr_authored"
    | "pr_reviewed"
    | "issue_opened"
    | "issue_resolved"
    | "incident_resolved"
    | "commit_authored"
    | "chat_mention"
    | "chat_post";
  serviceId: string;
  title: string;
  modifiedAt: number;
  weight: number;
};

export type GapCategory =
  | "missing_entity_type"
  | "missing_relation_emit"
  | "missing_connector"
  | "missing_user_identity"
  | "empty_index";

export type GapNote = {
  category: GapCategory;
  detail: string;
  remediation?: string;
};

export type ExpertFinding = {
  personId: string;
  displayName: string;
  evidence: Evidence[];
  score: number;
  confidence: "high" | "medium" | "low";
};

export type ExpertBrief = {
  kind: "expert";
  agentVersion: 1;
  generatedAt: number;
  latencyMs: number;
  gaps: GapNote[];
  query: { topicOrFile: string };
  ranked: ExpertFinding[];
};

export function isExpertBrief(x: unknown): x is ExpertBrief {
  if (x === null || typeof x !== "object") return false;
  // Bracket access required by tsconfig's `noPropertyAccessFromIndexSignature: true`.
  const b = x as Record<string, unknown>;
  return (
    b["kind"] === "expert" &&
    b["agentVersion"] === 1 &&
    Array.isArray(b["gaps"]) &&
    Array.isArray(b["ranked"]) &&
    typeof b["generatedAt"] === "number" &&
    typeof b["latencyMs"] === "number"
  );
}
