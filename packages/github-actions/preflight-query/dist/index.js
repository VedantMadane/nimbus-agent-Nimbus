// src/main.ts
import { appendFileSync } from "node:fs";

// src/render.ts
var CHECK_LABELS = {
  active_p1_incidents: "Active P1 incidents",
  failing_ci_runs: "Failing CI runs",
  merge_conflicts: "Merge conflicts"
};
var CHECK_ORDER = ["active_p1_incidents", "failing_ci_runs", "merge_conflicts"];
function renderJobSummary(env) {
  const lines = [];
  lines.push(`### Nimbus pre-deploy preflight — ${env.service} @ \`${env.target_ref}\``);
  lines.push("");
  lines.push(`**Verdict:** \`${env.verdict}\``);
  lines.push(`**Computed at:** ${env.computed_at}`);
  lines.push("");
  lines.push("| Check | Count | Gap |");
  lines.push("|---|---:|---|");
  for (const key of CHECK_ORDER) {
    const m = env.checks[key];
    const gap = m.gap === null ? "" : `\`${m.gap}\``;
    lines.push(`| ${CHECK_LABELS[key]} | ${m.count} | ${gap} |`);
  }
  for (const key of CHECK_ORDER) {
    const m = env.checks[key];
    if (m.findings.length === 0)
      continue;
    lines.push("");
    lines.push(`<details><summary>${CHECK_LABELS[key]} (${m.count})</summary>`);
    lines.push("");
    for (const f of m.findings) {
      const linkPart = f.url ? ` — ${f.url}` : "";
      lines.push(`- \`${f.id}\` — ${f.title}${linkPart}`);
    }
    lines.push("</details>");
  }
  return lines.join(`
`);
}
function renderAnnotations(env, mode) {
  if (env.verdict === "ok")
    return [];
  const level = mode === "block" ? "error" : "warning";
  const out = [];
  for (const key of CHECK_ORDER) {
    const m = env.checks[key];
    for (const f of m.findings) {
      out.push({
        level,
        message: `[${CHECK_LABELS[key]}] ${f.title} (${f.id})`,
        url: f.url ?? null
      });
    }
  }
  return out;
}
function decideExitCode(args) {
  if (args.unreachable) {
    if (args.allowGatewayFailure)
      return 0;
    return args.mode === "block" ? 1 : 0;
  }
  if (args.mode === "block" && args.verdict === "warn")
    return 1;
  return 0;
}

// src/main.ts
function getInput(name) {
  const envName = `INPUT_${name.toUpperCase().replaceAll("-", "_")}`;
  return process.env[envName] ?? "";
}
function getBooleanInput(name) {
  const raw = getInput(name).toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
function getIntInput(name, fallback) {
  const raw = getInput(name);
  if (raw === "")
    return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : fallback;
}
function setOutput(name, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile === undefined)
    return;
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(outFile, `${name}<<${delim}
${value}
${delim}
`);
}
function writeJobSummary(md) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file === undefined)
    return;
  appendFileSync(file, `${md}
`);
}
function emitAnnotation(level, message) {
  process.stdout.write(`::${level}::${message}
`);
}
function parseMode(raw) {
  if (raw === "block" || raw === "off")
    return raw;
  return "warn";
}
async function fetchEnvelope(gatewayUrl, service, targetRef, maxFindings, timeoutMs) {
  const url = new URL("/v1/preflight/deploy", gatewayUrl);
  url.searchParams.set("service", service);
  url.searchParams.set("target_ref", targetRef);
  url.searchParams.set("max_findings", String(maxFindings));
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text();
      emitAnnotation("warning", `Gateway returned ${res.status} for /v1/preflight/deploy: ${body.slice(0, 200)}`);
      return { status: "unreachable" };
    }
    const envelope = await res.json();
    return { status: "ok", envelope };
  } catch (e) {
    emitAnnotation("warning", `Nimbus Gateway unreachable at ${gatewayUrl}: ${e instanceof Error ? e.message : String(e)}`);
    return { status: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
async function main() {
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
  const timeoutMs = getIntInput("timeout-ms", 1e4);
  const allowGatewayFailure = getBooleanInput("allow-gateway-failure");
  const fetched = await fetchEnvelope(gatewayUrl, service, targetRef, maxFindings, timeoutMs);
  if (fetched.status === "unreachable") {
    const code2 = decideExitCode({
      verdict: "ok",
      mode,
      unreachable: true,
      allowGatewayFailure
    });
    setOutput("verdict", code2 === 1 ? "block" : "warn");
    setOutput("result-json", "{}");
    process.exit(code2);
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
    allowGatewayFailure
  });
  process.exit(code);
}
await main();
export {
  main
};
