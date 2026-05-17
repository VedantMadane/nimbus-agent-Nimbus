import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import {
  decideExitCode,
  type Envelope,
  type PreflightMode,
  renderAnnotations,
  renderJobSummary,
} from "./render.ts";

// -----------------------------------------------------------------------
// Sanitization barriers for Gateway-derived data.
//
// CodeQL's js/http-to-file-access flags the appendFileSync sinks below
// because their content originates from `fetch()`. The operator runs
// their own local Gateway, so the real risk is bounded — but breaking
// the dataflow cleanly is cheap and removes the alert.
//
// String fields are passed through a character allowlist
// (`.replace(/<deny-class>/g, "")`) plus a length cap; numeric fields
// are coerced through `Number()` + `Math.trunc()`; enum fields are
// narrowed to literal string constants. CodeQL recognises each of these
// as a taint barrier for the `js/http-to-file-access` rule.
// -----------------------------------------------------------------------

// Conservative print-safe character class. Strips C0 control chars
// below 0x20 except tab/LF/CR plus DEL 0x7F. Keeps printable ASCII
// and UTF-8 multi-byte sequences. Used as the sanitizer barrier on
// strings flowing into file-write sinks. The hex-escape form keeps the
// source ASCII-only; the rule below is the explicit intent of this
// barrier, not an accident.
// biome-ignore lint/suspicious/noControlCharactersInRegex: explicit byte ranges define the sanitizer barrier
const DENY_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function safeString(raw: unknown, maxLen: number): string {
  const s = typeof raw === "string" ? raw : "";
  return s.replace(DENY_CHARS, "").slice(0, maxLen);
}

function safeInt(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function safeVerdict(raw: unknown): "ok" | "warn" {
  return raw === "warn" ? "warn" : "ok";
}

type SanitizedFinding = {
  id: string;
  title: string;
  url: string | null;
};

function safeFindings(
  raw: readonly { id: string; title: string; url?: string | null }[],
): SanitizedFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => ({
    id: safeString(f.id, 256),
    title: safeString(f.title, 512),
    url: typeof f.url === "string" && f.url.length > 0 ? safeString(f.url, 2048) : null,
  }));
}

function sanitizeEnvelope(raw: Envelope): Envelope {
  return {
    service: safeString(raw.service, 128),
    target_ref: safeString(raw.target_ref, 256),
    computed_at: safeString(raw.computed_at, 64),
    verdict: safeVerdict(raw.verdict),
    checks: {
      active_p1_incidents: {
        count: safeInt(raw.checks.active_p1_incidents.count),
        findings: safeFindings(raw.checks.active_p1_incidents.findings),
        gap:
          typeof raw.checks.active_p1_incidents.gap === "string"
            ? safeString(raw.checks.active_p1_incidents.gap, 64)
            : null,
      },
      failing_ci_runs: {
        count: safeInt(raw.checks.failing_ci_runs.count),
        findings: safeFindings(raw.checks.failing_ci_runs.findings),
        gap:
          typeof raw.checks.failing_ci_runs.gap === "string"
            ? safeString(raw.checks.failing_ci_runs.gap, 64)
            : null,
      },
      merge_conflicts: {
        count: safeInt(raw.checks.merge_conflicts.count),
        findings: safeFindings(raw.checks.merge_conflicts.findings),
        gap:
          typeof raw.checks.merge_conflicts.gap === "string"
            ? safeString(raw.checks.merge_conflicts.gap, 64)
            : null,
      },
    },
  };
}

function getInput(name: string): string {
  // GitHub Actions inputs land in env as INPUT_<NAME> with hyphens → underscores.
  const envName = `INPUT_${name.toUpperCase().replaceAll("-", "_")}`;
  return process.env[envName] ?? "";
}

function getBooleanInput(name: string): boolean {
  const raw = getInput(name).toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function getIntInput(name: string, fallback: number): number {
  const raw = getInput(name);
  if (raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : fallback;
}

// Hardcoded allowlist of output names this Action declares in action.yml.
// Any other name is rejected — guards against an attacker-controlled call
// site smuggling a new output key into GITHUB_OUTPUT.
const ALLOWED_OUTPUT_NAMES: ReadonlySet<string> = new Set([
  "verdict",
  "incident-count",
  "failing-ci-count",
  "merge-conflict-count",
  "result-json",
]);

function setOutput(name: string, value: string): void {
  if (!ALLOWED_OUTPUT_NAMES.has(name)) {
    throw new Error(`refusing to set unknown output: ${name}`);
  }
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile === undefined) return;
  // Loop until the random delimiter is collision-free with the (possibly
  // tainted) value, matching @actions/core's prepareKeyValueMessage. The
  // collision probability is astronomically low, but the loop turns a
  // dataflow risk into a structural guarantee that the heredoc parser
  // cannot be escaped by adversarial output content.
  let delim: string;
  do {
    delim = `EOF_${randomUUID().replaceAll("-", "")}`;
  } while (value.includes(delim));
  appendFileSync(outFile, `${name}<<${delim}\n${value}\n${delim}\n`);
}

// Cap on bytes written to GITHUB_STEP_SUMMARY per Action run. GitHub's
// own limit is 1 MiB; this is a tighter bound that also serves as a DoS
// guard against an adversarial Gateway returning a multi-gigabyte body.
const STEP_SUMMARY_MAX_BYTES = 64 * 1024;

function writeJobSummary(md: string): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file === undefined) return;
  // Truncate before write. The summary is rendered as markdown through
  // GitHub's HTML sanitizer (raw <script>, event handlers, etc. are
  // stripped server-side), so the remaining risk is markdown-injection
  // phishing only — capped length prevents flooding.
  const safe = md.length > STEP_SUMMARY_MAX_BYTES ? md.slice(0, STEP_SUMMARY_MAX_BYTES) : md;
  appendFileSync(file, `${safe}\n`);
}

function emitAnnotation(level: "warning" | "error", message: string): void {
  // GitHub Actions workflow-command format.
  process.stdout.write(`::${level}::${message}\n`);
}

function parseMode(raw: string): PreflightMode {
  if (raw === "block" || raw === "off") return raw;
  return "warn";
}

async function fetchEnvelope(
  gatewayUrl: string,
  service: string,
  targetRef: string,
  maxFindings: number,
  timeoutMs: number,
): Promise<{ status: "ok"; envelope: Envelope } | { status: "unreachable" }> {
  const url = new URL("/v1/preflight/deploy", gatewayUrl);
  url.searchParams.set("service", service);
  url.searchParams.set("target_ref", targetRef);
  url.searchParams.set("max_findings", String(maxFindings));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      // 4xx/5xx from the Gateway → treat as unreachable for exit-code purposes.
      // (A real misconfiguration would be a 400; users still want a clear log.)
      const body = await res.text();
      emitAnnotation(
        "warning",
        `Gateway returned ${res.status} for /v1/preflight/deploy: ${body.slice(0, 200)}`,
      );
      return { status: "unreachable" };
    }
    const envelope = (await res.json()) as Envelope;
    return { status: "ok", envelope };
  } catch (e) {
    emitAnnotation(
      "warning",
      `Nimbus Gateway unreachable at ${gatewayUrl}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return { status: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function main(): Promise<void> {
  const service = getInput("service");
  if (service === "") {
    emitAnnotation("error", "missing required input: service");
    process.exit(1);
  }
  const targetRef = getInput("target-ref");
  if (targetRef === "") {
    emitAnnotation("error", "missing required input: target-ref");
    process.exit(1);
  }
  const gatewayUrl = getInput("gateway-url") || "http://localhost:7474";
  const mode = parseMode(getInput("mode"));
  const maxFindings = getIntInput("max-findings", 10);
  const timeoutMs = getIntInput("timeout-ms", 10_000);
  const allowGatewayFailure = getBooleanInput("allow-gateway-failure");

  const fetched = await fetchEnvelope(gatewayUrl, service, targetRef, maxFindings, timeoutMs);

  if (fetched.status === "unreachable") {
    const code = decideExitCode({
      verdict: "ok",
      mode,
      unreachable: true,
      allowGatewayFailure,
    });
    setOutput("verdict", code === 1 ? "block" : mode === "off" ? "ok" : "warn");
    setOutput("result-json", "{}");
    process.exit(code);
  }

  // Sanitize once. From here on, every value flowing into a file-write
  // sink (setOutput → GITHUB_OUTPUT, writeJobSummary → GITHUB_STEP_SUMMARY)
  // is a primitive (number) or a regex-allowlisted+length-capped string,
  // with verdict narrowed to a literal enum. This breaks the
  // js/http-to-file-access taint flow at a single explicit boundary.
  const env = sanitizeEnvelope(fetched.envelope);
  writeJobSummary(renderJobSummary(env));
  for (const ann of renderAnnotations(env, mode)) {
    const msg = ann.url ? `${ann.message} — ${ann.url}` : ann.message;
    emitAnnotation(ann.level, msg);
  }

  setOutput("verdict", env.verdict === "warn" && mode === "block" ? "block" : env.verdict);
  setOutput("incident-count", String(env.checks.active_p1_incidents.count));
  setOutput("failing-ci-count", String(env.checks.failing_ci_runs.count));
  setOutput("merge-conflict-count", String(env.checks.merge_conflicts.count));
  setOutput("result-json", JSON.stringify(env));

  const code = decideExitCode({
    verdict: env.verdict,
    mode,
    unreachable: false,
    allowGatewayFailure,
  });
  process.exit(code);
}

await main();
