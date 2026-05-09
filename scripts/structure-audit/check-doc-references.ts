#!/usr/bin/env bun
// Doc-reference drift detector.
//
// Verifies that file references in load-bearing docs (CLAUDE.md, GEMINI.md,
// docs/**/*.md, .claude/commands/*.md) point at files that actually exist in
// the repo, and that any `:NN` line-number suffix is within the file's bounds.
//
// Two reference shapes are scanned:
//
//   1. Markdown links — `[text](target[#anchor])`. Target is resolved relative
//      to the source doc's directory (matching how a Markdown renderer would).
//      Anchor suffix is stripped before resolution.
//
//   2. Backtick refs — `` `packages/.../file.ts[:NN]` ``. Treated as
//      repo-rooted (CLAUDE.md and the security/invariant docs write paths
//      this way). Filtered to refs whose first path segment is a known
//      repo-root entry (packages, docs, scripts, .github, .claude, plus a
//      handful of root-level config files), so the regex doesn't fire on
//      shell snippets, glob patterns, or template strings.
//
// Both shapes accept an optional trailing `:NN` line-number suffix. When
// present, the script verifies the line number is within the file's bounds.
// We deliberately do NOT match content at the line — drift between docs and
// code is too noisy at the line-of-content level, and the existence + bounds
// check catches the cases that matter (file renamed, file deleted, file
// truncated below the cited line).
//
// Modes:
//   --check (default)  exit non-zero on any broken ref; prints GitHub annotations
//   --report           list every broken ref with reason; exit non-zero if any
//
// Exit codes:
//   0  all refs resolve
//   1  at least one broken ref
//   2  usage error

import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { Glob } from "bun";
import { REPO_ROOT } from "./lib.ts";

type Mode = "check" | "report";

type Reference = {
  source: string; // doc file (repo-relative)
  sourceLine: number; // line in source doc where the reference appears
  raw: string; // raw match text inside the link/backtick (without the `:NN`)
  target: string; // resolved repo-relative path
  lineHint?: number; // `:NN` suffix if present
};

type Issue = {
  ref: Reference;
  reason: string;
};

// File extensions that count as "looks like a real file path". Anything not
// matching this list is rejected from backtick scanning to avoid noise.
// Markdown links bypass this list because their syntax is unambiguous.
const KNOWN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".toml",
  ".yml",
  ".yaml",
  ".rs",
  ".sh",
  ".ps1",
  ".py",
  ".sql",
  ".css",
  ".html",
  ".lock",
  ".properties",
  ".env",
  ".cfg",
  ".ini",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".pdf",
  ".txt",
]);

// Top-level repo entries that backtick refs are allowed to start with.
// Tighter than "anything with a slash" so the regex doesn't fire on shell
// commands and template strings. Add new entries here when adding a new
// top-level dir or root-level file to the repo that docs reference.
const REPO_ROOT_ENTRIES = new Set([
  "packages",
  "docs",
  "scripts",
  ".github",
  ".claude",
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "biome.json",
  "sonar-project.properties",
  ".dependency-cruiser.cjs",
  ".gitleaksignore",
  "CLAUDE.md",
  "GEMINI.md",
  "LICENSE",
]);

// Path-rejection chars: presence indicates a placeholder, glob, template
// literal, or shell expansion — not a real path.
const PATH_REJECT_CHARS = ["<", ">", "*", "?", "{", "}", "[", "]", "$", "(", ")", "|", " "];

// docs/roadmap.md is intentionally excluded: it describes phase-N+ files
// that don't exist yet by design. Including it would either flood the
// gate with false positives or require an allowlist that grows every
// phase. The roadmap's correctness is a separate concern from "do current
// references resolve".
const DOCS_FILES = [
  "CLAUDE.md",
  "GEMINI.md",
  "docs/architecture.md",
  "docs/SECURITY.md",
  "docs/SECURITY-INVARIANTS.md",
  "docs/security-hardening.md",
  "docs/sonar-local.md",
  "docs/cli-reference.md",
  "docs/CONTRIBUTING.md",
  "docs/CODE_OF_CONDUCT.md",
  "docs/README.md",
  "docs/install-macos-unsigned.md",
  "docs/install-windows-unsigned.md",
  "docs/verify-release-integrity.md",
  "docs/license-policy.md",
];

const DOCS_GLOBS = [".claude/commands/*.md"];

function hasRejectChar(s: string): boolean {
  for (const ch of PATH_REJECT_CHARS) if (s.includes(ch)) return true;
  return false;
}

function getExtension(s: string): string {
  const dot = s.lastIndexOf(".");
  if (dot < 0) return "";
  return s.slice(dot).toLowerCase();
}

function looksLikePathTarget(s: string): boolean {
  if (!s) return false;
  if (s.startsWith("http://") || s.startsWith("https://")) return false;
  if (s.startsWith("mailto:")) return false;
  if (s.startsWith("#")) return false;
  if (s.startsWith("@")) return false; // npm scope or Claude-skill import
  if (s.startsWith("~")) return false; // home-relative
  if (hasRejectChar(s)) return false;
  return true;
}

// Strip optional `#anchor` and `:NN` suffix.
function splitTargetParts(raw: string): { path: string; lineHint?: number } {
  const anchorIx = raw.indexOf("#");
  const noAnchor = anchorIx >= 0 ? raw.slice(0, anchorIx) : raw;
  const m = noAnchor.match(/^(.*?):(\d+)$/);
  if (m) return { path: m[1] ?? "", lineHint: Number(m[2]) };
  return { path: noAnchor };
}

function offsetToLine(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

function* extractMarkdownLinks(text: string): Generator<{ raw: string; offset: number }> {
  // Matches [text](target) or [text](target "title"). We're lenient on the
  // text part (any non-`]` chars) and tight on the target (no whitespace,
  // no close-paren until the optional title).
  const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined && m.index !== undefined) {
      yield { raw: m[1], offset: m.index };
    }
  }
}

function* extractBacktickPaths(text: string): Generator<{ raw: string; offset: number }> {
  const re = /`([^`\n]+)`/g;
  for (const m of text.matchAll(re)) {
    const inner = m[1];
    if (inner === undefined || m.index === undefined) continue;
    if (!looksLikePathTarget(inner)) continue;
    const { path } = splitTargetParts(inner);
    if (!path) continue;
    const firstSeg = path.split("/")[0] ?? "";
    if (!REPO_ROOT_ENTRIES.has(firstSeg)) continue;
    // Backticks are repo-rooted; require either a known extension or a
    // sub-path under a known root dir.
    const ext = getExtension(path);
    const isKnownFile = KNOWN_EXTENSIONS.has(ext);
    const isDirPath = path.includes("/") && ext === "";
    if (!isKnownFile && !isDirPath) continue;
    yield { raw: inner, offset: m.index + 1 };
  }
}

function resolveMarkdownTarget(rawTarget: string, sourceDoc: string): string | null {
  const { path } = splitTargetParts(rawTarget);
  if (!path) return null;
  if (!looksLikePathTarget(path)) return null;
  if (isAbsolute(path)) return null; // skip system-absolute paths
  // Markdown link extraction does not pre-filter by extension because
  // section-only links like `[X](architecture.md)` (no extension on the
  // anchor target) and image links should both be validated.
  const docDir = dirname(sourceDoc);
  const resolved = resolve(REPO_ROOT, docDir, path);
  const rel = relative(REPO_ROOT, resolved).replaceAll("\\", "/");
  // Skip links that escape the repo root via `..`. These are GitHub-flavored
  // relative links that the platform rewrites into github.com URLs (e.g.
  // `../../../security/advisories/new` for opening a new advisory, or
  // `../../discussions` for the repo's Discussions tab). They render correctly
  // on GitHub but are not file paths we can validate from the local checkout.
  if (rel.startsWith("..") || rel.startsWith("/")) return null;
  return rel;
}

async function scanDoc(docRel: string): Promise<Reference[]> {
  const abs = join(REPO_ROOT, docRel);
  if (!existsSync(abs)) return [];
  const text = await Bun.file(abs).text();
  const refs: Reference[] = [];

  for (const { raw, offset } of extractMarkdownLinks(text)) {
    const target = resolveMarkdownTarget(raw, docRel);
    if (target === null) continue;
    const { lineHint } = splitTargetParts(raw);
    refs.push({
      source: docRel,
      sourceLine: offsetToLine(text, offset),
      raw,
      target,
      lineHint,
    });
  }

  for (const { raw, offset } of extractBacktickPaths(text)) {
    const { path, lineHint } = splitTargetParts(raw);
    if (!path) continue;
    refs.push({
      source: docRel,
      sourceLine: offsetToLine(text, offset),
      raw,
      target: path,
      lineHint,
    });
  }

  return refs;
}

async function lineCount(absPath: string): Promise<number> {
  const text = await Bun.file(absPath).text();
  return text.split("\n").length;
}

// Paths that are valid runtime artefacts but not present in a fresh source
// checkout. Refs into these are skipped — the doc is correct (telling the
// reader to add the dir to PATH after building), but the static check
// against the working tree would always fail.
const RUNTIME_PATH_FRAGMENTS = ["/dist", "/build", "/node_modules", "/coverage", "/.astro"];

function isRuntimeArtifactPath(target: string): boolean {
  const slashed = `/${target}`;
  for (const frag of RUNTIME_PATH_FRAGMENTS) {
    if (slashed.includes(frag)) return true;
  }
  return false;
}

async function validate(refs: readonly Reference[]): Promise<Issue[]> {
  const issues: Issue[] = [];
  const lineCache = new Map<string, number>();
  for (const ref of refs) {
    if (isRuntimeArtifactPath(ref.target)) continue;
    const abs = join(REPO_ROOT, ref.target);
    if (!existsSync(abs)) {
      issues.push({ ref, reason: "file does not exist" });
      continue;
    }
    if (ref.lineHint === undefined) continue;
    let lc = lineCache.get(abs);
    if (lc === undefined) {
      lc = await lineCount(abs);
      lineCache.set(abs, lc);
    }
    if (ref.lineHint < 1 || ref.lineHint > lc) {
      issues.push({
        ref,
        reason: `line ${ref.lineHint} out of range (file has ${lc} lines)`,
      });
    }
  }
  return issues;
}

function parseArgs(argv: readonly string[]): { mode: Mode } {
  let mode: Mode = "check";
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") mode = "check";
    else if (a === "--report") mode = "report";
    else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return { mode };
}

async function gatherDocs(): Promise<string[]> {
  const docs: string[] = [];
  for (const d of DOCS_FILES) {
    if (existsSync(join(REPO_ROOT, d))) docs.push(d);
  }
  for (const pattern of DOCS_GLOBS) {
    for await (const rel of new Glob(pattern).scan({ cwd: REPO_ROOT })) {
      docs.push(rel.replaceAll("\\", "/"));
    }
  }
  return docs;
}

async function run(): Promise<void> {
  const { mode } = parseArgs(Bun.argv);
  const docs = await gatherDocs();
  const allRefs: Reference[] = [];
  for (const doc of docs) {
    const refs = await scanDoc(doc);
    allRefs.push(...refs);
  }
  const issues = await validate(allRefs);

  if (mode === "report") {
    console.log(`Scanned ${docs.length} docs, ${allRefs.length} refs`);
    for (const issue of issues) {
      console.log(
        `BROKEN  ${issue.ref.source}:${issue.ref.sourceLine}  → \`${issue.ref.raw}\`  (${issue.reason})`,
      );
    }
    console.log(`${issues.length} broken refs`);
    process.exit(issues.length === 0 ? 0 : 1);
  }

  // mode === "check"
  if (issues.length === 0) {
    console.log(
      `Doc-reference check: ${allRefs.length} refs across ${docs.length} docs — all resolve.`,
    );
    return;
  }
  for (const issue of issues) {
    console.error(
      `::error file=${issue.ref.source},line=${issue.ref.sourceLine}::broken doc reference \`${issue.ref.raw}\`: ${issue.reason}`,
    );
  }
  console.error(`\n${issues.length} broken doc references across ${docs.length} docs.`);
  process.exit(1);
}

await run();
