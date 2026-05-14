import type { DeploymentAnnotateInput } from "./types.ts";

/**
 * Three-tier rule (Phase 5 T4 PR 3b design §5.3):
 *
 *   1. `<provider>:run-<run_id>:job-<job_id>`   — when both present (CI fine-grained)
 *   2. `<provider>:run-<run_id>`                — when only run_id present
 *   3. `<service>:<env>:<sha>`                  — fallback (CLI shell-script path)
 *
 * The fallback intentionally OMITS `started_at_ms` so a shell script
 * that retries the same logical deploy collapses onto one `deployment`
 * row. Operators wanting per-attempt granularity pass `--run-id` and
 * land on tier 2.
 */
export function computeDeploymentExternalId(input: DeploymentAnnotateInput): string {
  if (
    input.run_id !== undefined &&
    input.run_id !== "" &&
    input.job_id !== undefined &&
    input.job_id !== ""
  ) {
    return `${input.provider}:run-${input.run_id}:job-${input.job_id}`;
  }
  if (input.run_id !== undefined && input.run_id !== "") {
    return `${input.provider}:run-${input.run_id}`;
  }
  return `${input.service}:${input.environment}:${input.sha}`;
}
