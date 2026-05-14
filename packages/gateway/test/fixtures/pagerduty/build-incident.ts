/**
 * Builder for synthetic PagerDuty REST API `GET /incidents` row payloads.
 *
 * Used by integration-test fixtures so each indexed incident flows through
 * the production parser (`syncPagerdutyIncidentItems`) instead of being
 * hand-shaped at the SQL boundary. Keeping the shape in one helper means a
 * single edit picks up new fields when the parser learns to read them.
 */

export type PagerdutyIncidentSeed = {
  id: string;
  title?: string;
  /** ISO-8601 instant. Falsy values are forwarded verbatim to exercise edge cases. */
  createdAt: string;
  /** ISO-8601 instant; defaults to `createdAt` when not provided. */
  updatedAt?: string;
  status: "triggered" | "acknowledged" | "resolved";
  htmlUrl?: string;
  /** PagerDuty priority name — typically "P1", "P2". `null` for unprioritised. */
  priorityName?: string | null;
  /** PagerDuty service id — `null` to omit the entire `service` object. */
  serviceId?: string | null;
};

export function buildPagerdutyIncident(seed: PagerdutyIncidentSeed): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: seed.id,
    title: seed.title ?? `Incident ${seed.id}`,
    created_at: seed.createdAt,
    updated_at: seed.updatedAt ?? seed.createdAt,
    status: seed.status,
  };
  if (seed.htmlUrl !== undefined) {
    row.html_url = seed.htmlUrl;
  }
  if (seed.priorityName === null) {
    row.priority = null;
  } else if (seed.priorityName !== undefined) {
    row.priority = { id: `pri_${seed.priorityName}`, name: seed.priorityName };
  }
  if (seed.serviceId !== null && seed.serviceId !== undefined) {
    row.service = { id: seed.serviceId, summary: `Service ${seed.serviceId}` };
  }
  return row;
}
