// Structural exclusion registry for the per-file coverage floor.
//
// Source of truth for the spec §"Structural Exclusions" table. Kept in sync
// with sonar-project.properties' sonar.coverage.exclusions via the parity
// check in check-exclusion-parity.ts.
//
// Patterns are matched against forward-slash repo-relative paths
// (e.g. "packages/gateway/src/vault/win32.ts"). Each entry is one of:
//   - exact path (string)
//   - directory prefix (string ending "/")  → all files under that dir
//   - basename regex (`/^pat$/`)              → matched against path.basename(p)
//   - path regex     (`/^pat$/`)              → matched against the full relPath
//
// Test files (*.test.ts, *.test.tsx) are filtered upstream by the source
// walker; they need not appear here.

export type ExclusionPattern =
  | { kind: "exact"; path: string }
  | { kind: "dirPrefix"; prefix: string }
  | { kind: "basenameRegex"; re: RegExp }
  | { kind: "pathRegex"; re: RegExp };

export const EXCLUSIONS: readonly ExclusionPattern[] = Object.freeze([
  // Platform-specific PAL implementations — only one runs per OS.
  { kind: "exact", path: "packages/gateway/src/vault/win32.ts" },
  { kind: "exact", path: "packages/gateway/src/vault/darwin.ts" },
  { kind: "exact", path: "packages/gateway/src/vault/linux.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/win32.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/darwin.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/linux.ts" },
  { kind: "exact", path: "packages/gateway/src/platform/browser.ts" },

  // Reference benches — run via `nimbus bench` interactive protocol, not bun test.
  { kind: "dirPrefix", prefix: "packages/gateway/src/perf/" },

  // SQL migration constants — one big template string per file, no executable JS.
  { kind: "pathRegex", re: /^packages\/gateway\/src\/index\/[^/]+-v\d+-sql\.ts$/ },

  // Type-only declaration files.
  { kind: "basenameRegex", re: /^types\.ts$/ },
  { kind: "basenameRegex", re: /-types\.ts$/ },

  // GitHub Actions entry points — top-level `await main()` makes in-process
  // testing impossible; helpers extracted to siblings (precedent: PR #326).
  { kind: "pathRegex", re: /^packages\/github-actions\/[^/]+\/src\/main\.ts$/ },
]);

export function isExempt(relPath: string): boolean {
  const normalized = relPath.replaceAll("\\", "/");
  const basename = normalized.split("/").pop() ?? "";
  for (const pattern of EXCLUSIONS) {
    switch (pattern.kind) {
      case "exact":
        if (normalized === pattern.path) return true;
        break;
      case "dirPrefix":
        if (normalized.startsWith(pattern.prefix)) return true;
        break;
      case "basenameRegex":
        if (pattern.re.test(basename)) return true;
        break;
      case "pathRegex":
        if (pattern.re.test(normalized)) return true;
        break;
    }
  }
  return false;
}
