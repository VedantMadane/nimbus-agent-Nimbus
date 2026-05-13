#!/usr/bin/env bun
// JS license compliance gate.
//
// Walks every `package.json` reachable under `node_modules/**` and
// `packages/**/node_modules/**`, extracts each package's declared license,
// and fails when any license is outside the explicit allowlist below.
//
// Why this exists:
//   `cargo-deny` enforces a license policy on the Rust side (Tauri).
//   Nothing equivalent exists for the JS/Bun side. Given the repo's
//   dual-license model — AGPL-3.0 for gateway/cli/connectors and MIT for
//   sdk/client — pulling in a transitive dep with an incompatible license
//   would create real distribution problems, especially after the
//   `bun build --compile` step inlines runtime deps into the headless
//   binary.
//
// Why not `license-checker`:
//   `license-checker` reads `dependencies` in the start dir's package.json
//   and walks from there. With Bun workspaces, the root package.json has
//   no `dependencies` field — the production deps live in the workspace
//   packages. Running `license-checker` per workspace would catch that,
//   but at the cost of 33+ invocations and tool-specific quirks; reading
//   `node_modules/**/package.json` directly is simpler and matches the
//   shape of the structure-audit's other drivers.
//
// Allowlist policy:
//   The list below is the intersection of:
//     (a) licenses safe to redistribute under AGPL-3.0 (gateway/cli/connectors)
//     (b) licenses safe to redistribute under MIT (sdk/client)
//   Permissive licenses + MPL-2.0 satisfy both. Anything stronger
//   (LGPL/GPL/AGPL) is rejected by default — the gateway being AGPL does
//   not make AGPL deps automatically safe to bundle into the MIT-licensed
//   SDK. Adding a license to the allowlist requires a reviewer who
//   understands the licensing implications; see docs/license-policy.md.
//
// Exit codes:
//   0  all licenses in the allowlist
//   1  at least one violation
//   2  usage error / no node_modules / read failure

import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./lib.ts";

type Mode = "check" | "report";

type Violation = {
  name: string;
  version: string;
  licenses: string[];
  path: string; // repo-relative package.json path
};

// Permissive licenses + MPL-2.0 are the safe set for both AGPL-3.0 and
// MIT redistribution. Adding to this list is a deliberate compliance
// decision — see docs/license-policy.md before extending.
const ALLOWED_LICENSES: ReadonlySet<string> = new Set([
  "MIT",
  "MIT-0",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "CC-BY-3.0",
  "CC-BY-4.0",
  "Unlicense",
  "MPL-2.0",
  "Python-2.0",
  "WTFPL",
  "Zlib",
  // Artistic-2.0 is OSI-approved permissive; appears on Bevry-maintained
  // packages (binaryextensions, editions, istextorbinary, textextensions,
  // version-range) used transitively by knip / Biome / vsce.
  "Artistic-2.0",
]);

// Per-package allowlist for transitive deps with non-SPDX or "Custom"
// licenses that have been manually reviewed. Format: "name@version"
// (version-pinned so a future upgrade re-triggers review). Each entry
// requires a comment explaining the manual review outcome.
const PACKAGE_OVERRIDES: ReadonlySet<string> = new Set([
  // Microsoft VSCE signing tooling. license field is "SEE LICENSE IN
  // LICENSE.txt"; the actual LICENSE.txt grants redistribution as part
  // of vsce-driven extension publishing. Used only by the
  // packages/vscode-extension publish step (publish-vscode.yml), not
  // bundled into the gateway binary or shipped to end users. The
  // platform-specific `@vscode/vsce-sign-<os>-<arch>` packages are
  // installed by Bun based on the runner OS — Linux variant fires in
  // CI, win32 variant fires on developer workstations. Both are
  // version-pinned so a future upgrade re-triggers review.
  "@vscode/vsce-sign@2.0.9",
  "@vscode/vsce-sign-linux-x64@2.0.6",
  "@vscode/vsce-sign-win32-x64@2.0.6",
  // libvips C library shipped as platform-specific native binaries by
  // sharp. The outer `sharp` and `@img/sharp-<os>-<arch>` packages
  // declare `Apache-2.0 OR LGPL-3.0-or-later` (the OR branch passes
  // the gate via Apache-2.0); the `@img/sharp-libvips-<os>-<arch>`
  // packages declare LGPL-3.0-or-later only because libvips itself is
  // LGPL. Accepting these binaries is consistent with already
  // accepting `sharp`, which re-distributes the same libvips bytes.
  // LGPL-3.0 dynamic-linking compliance: the gateway loads libvips
  // through sharp's FFI bindings at runtime, satisfying LGPL §4d. Not
  // adding LGPL-3.0-or-later to the global allowlist — keeping the
  // exception narrow to libvips so a stray pure-LGPL dep elsewhere
  // still trips the gate. As with vsce-sign, Bun installs only the
  // matching platform variant per OS, so other-platform variants
  // (darwin, win32) will need their own override rows if the security
  // workflow's runner matrix ever expands beyond Ubuntu.
  "@img/sharp-libvips-linux-x64@1.2.4",
  "@img/sharp-libvips-linuxmusl-x64@1.2.4",
  // Google FlatBuffers. license field is "SEE LICENSE IN LICENSE.txt";
  // the actual LICENSE.txt is Apache-2.0. Pulled in transitively by
  // @xenova/transformers' onnxruntime-node dependency. Already covered
  // by Apache-2.0 in our allowlist if the package.json field were SPDX.
  "flatbuffers@1.12.0",
  // Open VSX Registry CLI. EPL-2.0 (Eclipse Public License 2.0). Used
  // only by publish-vscode.yml to publish the VS Code extension to
  // Open VSX. Not bundled into any distributed binary, so the EPL
  // copyleft terms do not propagate to our distribution.
  "ovsx@0.10.12",
]);

type LicenseField = string | { type: string } | LicenseField[] | undefined;

type PackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  license?: LicenseField;
  licenses?: LicenseField;
};

function parseLicenseField(field: LicenseField): string[] {
  if (field === undefined || field === null) return [];
  if (typeof field === "string") {
    // Handle SPDX expressions: "(MIT OR Apache-2.0)", "MIT AND BSD-3-Clause".
    // We split conservatively on OR/AND and trim parens — this errs on the
    // side of accepting if any branch is allowed, which matches typical
    // license-compatibility analysis ("you may pick any of these").
    return field
      .replace(/[()]/g, "")
      .split(/\s+(?:OR|AND)\s+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (Array.isArray(field)) {
    return field.flatMap((entry) => parseLicenseField(entry));
  }
  if (typeof field === "object" && "type" in field && typeof field.type === "string") {
    return [field.type];
  }
  return [];
}

function isAllowed(licenses: string[], name: string, version: string): boolean {
  if (licenses.length === 0) return false;
  if (PACKAGE_OVERRIDES.has(`${name}@${version}`) || PACKAGE_OVERRIDES.has(name)) return true;
  // OR semantics: pass if any listed license is allowed. This matches npm
  // convention where:
  //   - the legacy `licenses: [{...}, {...}]` array is OR by spec
  //   - SPDX `(MIT OR Apache-2.0)` is explicit OR
  //   - SPDX `MIT AND BSD-3-Clause` is rare in practice
  // We split OR/AND uniformly into branches in `parseLicenseField` and
  // accept on any-branch-allowed. The trade-off is that a hypothetical
  // dep with `Allowed AND Disallowed` would pass — but such combinations
  // are virtually unseen in npm, and a manual review catches them via
  // PACKAGE_OVERRIDES if they ever appear.
  return licenses.some((l) => ALLOWED_LICENSES.has(l));
}

// Decode a Bun-store directory name (e.g. "@biomejs+biome@2.4.14+abc123")
// into the canonical package name ("@biomejs/biome"). Returns null for
// anything that doesn't match the expected shape.
function decodeBunStoreName(encoded: string): string | null {
  // First "@" at index > 0 is the version separator. (Index 0 is the
  // optional scope marker.)
  const versionSep = encoded.indexOf("@", 1);
  if (versionSep <= 0) return null;
  let name = encoded.slice(0, versionSep);
  if (name.startsWith("@")) {
    // Scoped: "@scope+name" → "@scope/name". Only the first "+" is the
    // separator (some package names contain hyphens but never plus).
    const plus = name.indexOf("+");
    if (plus <= 0) return null;
    name = `${name.slice(0, plus)}/${name.slice(plus + 1)}`;
  }
  return name;
}

async function* iteratePackageManifests(): AsyncGenerator<{ path: string; pkg: PackageJson }> {
  // Bun's isolated install layout puts each unique <name>@<version>+<hash>
  // entry in a directory under node_modules/.bun/, with the actual package
  // files at <encoded>/node_modules/<decoded-name>/. Top-level
  // node_modules/<name> is a symlink into this store, so the canonical
  // place to read every dep's package.json is the .bun store itself.
  // Reading via the symlink would also work but would fan out into
  // peer/transitive symlinks within each package's own node_modules,
  // multiplying the work and breaking dedup.
  const storeRoot = join(REPO_ROOT, "node_modules", ".bun");
  if (!existsSync(storeRoot)) {
    // Hoisted layout fallback (npm-compat install). Only the top-level
    // node_modules/<name>/package.json files are valid entries.
    const nm = join(REPO_ROOT, "node_modules");
    if (!existsSync(nm)) return;
    yield* iterateHoisted(nm);
    return;
  }
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(storeRoot, { withFileTypes: true });
  } catch {
    return;
  }
  const seen = new Set<string>();
  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    const decoded = decodeBunStoreName(dirent.name);
    if (decoded === null) continue;
    const pjAbs = join(storeRoot, dirent.name, "node_modules", decoded, "package.json");
    if (!existsSync(pjAbs)) continue;
    const rel = relative(REPO_ROOT, pjAbs).replaceAll("\\", "/");
    if (seen.has(rel)) continue;
    seen.add(rel);
    try {
      const pkg = (await Bun.file(pjAbs).json()) as PackageJson;
      yield { path: rel, pkg };
    } catch {
      // Malformed package.json — skip silently. Real installs shouldn't
      // produce these; the rare case is a partial/corrupted dep dir.
    }
  }
}

async function* iterateHoisted(nm: string): AsyncGenerator<{ path: string; pkg: PackageJson }> {
  const entries = await readdir(nm, { withFileTypes: true });
  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name.startsWith(".")) continue;
    if (dirent.name.startsWith("@")) {
      const scopeDir = join(nm, dirent.name);
      const sub = await readdir(scopeDir, { withFileTypes: true });
      for (const inner of sub) {
        if (!inner.isDirectory()) continue;
        const pjAbs = join(scopeDir, inner.name, "package.json");
        if (!existsSync(pjAbs)) continue;
        const rel = relative(REPO_ROOT, pjAbs).replaceAll("\\", "/");
        try {
          const pkg = (await Bun.file(pjAbs).json()) as PackageJson;
          yield { path: rel, pkg };
        } catch {
          // skip malformed
        }
      }
      continue;
    }
    const pjAbs = join(nm, dirent.name, "package.json");
    if (!existsSync(pjAbs)) continue;
    const rel = relative(REPO_ROOT, pjAbs).replaceAll("\\", "/");
    try {
      const pkg = (await Bun.file(pjAbs).json()) as PackageJson;
      yield { path: rel, pkg };
    } catch {
      // skip malformed
    }
  }
}

async function run(): Promise<void> {
  const argv = Bun.argv;
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

  if (!existsSync(join(REPO_ROOT, "node_modules"))) {
    console.error("node_modules not found — run `bun install` before this check.");
    process.exit(2);
  }

  const violations: Violation[] = [];
  let total = 0;
  let withMissingLicense = 0;
  for await (const { path, pkg } of iteratePackageManifests()) {
    if (pkg.private === true) continue; // workspace packages and other private entries
    total += 1;
    const name = pkg.name ?? "<unknown>";
    const version = pkg.version ?? "0.0.0";
    const fromLicense = parseLicenseField(pkg.license);
    const fromLicenses = parseLicenseField(pkg.licenses);
    const licenses = [...new Set([...fromLicense, ...fromLicenses])];
    if (licenses.length === 0) withMissingLicense += 1;
    if (!isAllowed(licenses, name, version)) {
      violations.push({ name, version, licenses, path });
    }
  }

  if (mode === "report") {
    console.log(`Scanned ${total} packages`);
    if (withMissingLicense > 0) {
      console.log(`  ${withMissingLicense} with missing license field (counted as violations)`);
    }
    for (const v of violations) {
      const lic = v.licenses.length === 0 ? "(none)" : v.licenses.join(", ");
      console.log(`  ${v.name}@${v.version}  [${lic}]  ${v.path}`);
    }
    console.log(`${violations.length} violation(s)`);
    process.exit(violations.length === 0 ? 0 : 1);
  }

  // mode === "check"
  if (violations.length === 0) {
    console.log(`JS license check: ${total} packages — all under the allowlist.`);
    return;
  }
  for (const v of violations) {
    const lic = v.licenses.length === 0 ? "(none declared)" : v.licenses.join(", ");
    console.error(`::error::license violation: ${v.name}@${v.version} → ${lic} (${v.path})`);
  }
  console.error(`\n${violations.length} JS license violation(s).`);
  console.error(
    `If a license is safe in context, add it to ALLOWED_LICENSES in ` +
      `scripts/structure-audit/check-js-licenses.ts and update docs/license-policy.md.`,
  );
  console.error(
    `If a single package needs an exception, add "name@version" to PACKAGE_OVERRIDES with a justifying comment.`,
  );
  process.exit(1);
}

await run();
