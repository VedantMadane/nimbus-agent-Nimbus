import { appendFileSync } from "node:fs";
import {
  decideExitCode,
  type Envelope,
  type PreflightMode,
  renderAnnotations,
  renderJobSummary,
} from "./render.ts";

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

function setOutput(name: string, value: string): void {
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile === undefined) return;
  // Use the delimiter form so multi-line values (result-json) work.
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(outFile, `${name}<<${delim}\n${value}\n${delim}\n`);
}

function writeJobSummary(md: string): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file === undefined) return;
  appendFileSync(file, `${md}\n`);
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
    setOutput("verdict", code === 1 ? "block" : "warn");
    setOutput("result-json", "{}");
    process.exit(code);
  }

  const env = fetched.envelope;
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
