export interface AnnotateResult {
  readonly external_id: string;
  readonly is_new: boolean;
  readonly dora_eligible: boolean;
}

export function renderSummary(input: {
  service: string;
  environment: string;
  status: string;
  externalId: string;
  isNew: boolean;
  doraEligible: boolean;
}): string {
  const verb = input.isNew ? "Recorded" : "Updated";
  const eligible = input.doraEligible
    ? "✅ DORA-eligible"
    : "ℹ️ not counted in DORA deploy-frequency";
  return [
    `### ${verb} deployment — ${input.service} → ${input.environment}`,
    "",
    `- **External ID:** \`${input.externalId}\``,
    `- **Status:** \`${input.status}\``,
    `- **DORA:** ${eligible}`,
  ].join("\n");
}
