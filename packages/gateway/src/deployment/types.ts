/**
 * Phase 5 T4 PR 3b — Post-deploy annotation types.
 *
 * Surface: HTTP POST /v1/deployments, IPC deployment.annotate,
 * CLI nimbus deploy annotate. NOT LLM-facing — see invariant I11 for
 * envelope rules at the LLM boundary.
 */

export type DeploymentConclusion = "success" | "failure" | "cancelled" | "in_progress";

export type DeploymentProvider =
  | "github-actions"
  | "gitlab"
  | "jenkins"
  | "circleci"
  | "bitbucket"
  | "other";

export interface DeploymentAnnotateInput {
  readonly service: string;
  readonly provider: DeploymentProvider;
  readonly environment: string;
  readonly sha: string;
  readonly ref: string;
  readonly status: DeploymentConclusion;
  readonly started_at_ms: number;
  readonly finished_at_ms?: number;
  readonly workflow_url?: string;
  readonly run_id?: string;
  readonly job_id?: string;
}

export interface DeploymentAnnotateResult {
  readonly external_id: string;
  readonly service: string;
  readonly stored_at_ms: number;
  readonly is_new: boolean;
  readonly dora_eligible: boolean;
}
