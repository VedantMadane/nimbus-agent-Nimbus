/**
 * Applies the open dependabot version bumps to package.json files in this
 * workspace. Run once, then `bun install` regenerates a single bun.lock.
 *
 * Filesystem access is attempt-and-recover (try `readFileSync`, treat ENOENT
 * as "skip") rather than `existsSync`-then-read, so there's no TOCTOU window
 * between the check and the use.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function tryReadJson(file: string): PackageJson | null {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
  return JSON.parse(raw) as PackageJson;
}

const bumps: Array<{ file: string; dep: string; ver: string }> = [
  // root
  { file: "package.json", dep: "@biomejs/biome", ver: "2.4.14" },
  // cli
  { file: "packages/cli/package.json", dep: "yaml", ver: "2.8.4" },
  { file: "packages/cli/package.json", dep: "@clack/prompts", ver: "1.3.0" },
  // ui — tauri-js group
  { file: "packages/ui/package.json", dep: "@tauri-apps/api", ver: "2.11.0" },
  { file: "packages/ui/package.json", dep: "@tauri-apps/cli", ver: "2.11.0" },
  { file: "packages/ui/package.json", dep: "jsdom", ver: "29.1.1" },
  // docs
  { file: "packages/docs/package.json", dep: "astro", ver: "6.2.1" },
  // vscode-extension
  { file: "packages/vscode-extension/package.json", dep: "jsdom", ver: "29.1.1" },
  { file: "packages/vscode-extension/package.json", dep: "@types/node", ver: "25.6.0" },
  { file: "packages/vscode-extension/package.json", dep: "esbuild", ver: "0.28.0" },
  { file: "packages/vscode-extension/package.json", dep: "marked", ver: "18.0.3" },
];

// zod 4.4.2 across gateway + every mcp connector. The mcp-connectors loop
// drives off `readdirSync` rather than a glob, so each candidate path may or
// may not contain a package.json — `tryReadJson` handles the missing case
// without a separate existence check.
bumps.push({ file: "packages/gateway/package.json", dep: "zod", ver: "4.4.2" });
for (const d of readdirSync("packages/mcp-connectors")) {
  bumps.push({
    file: `packages/mcp-connectors/${d}/package.json`,
    dep: "zod",
    ver: "4.4.2",
  });
}

let touched = 0;
for (const { file, dep, ver } of bumps) {
  const pkg = tryReadJson(file);
  if (pkg === null) {
    console.warn(`  skip (missing): ${file}`);
    continue;
  }
  let changed = false;
  for (const section of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const block = pkg[section];
    if (block && Object.hasOwn(block, dep)) {
      const cur = block[dep] as string;
      const prefix = /^[~^]/.test(cur) ? (cur[0] as string) : "";
      const next = prefix + ver;
      if (cur !== next) {
        block[dep] = next;
        changed = true;
      }
    }
  }
  if (changed) {
    writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`  bumped ${dep} → ${ver} in ${file}`);
    touched++;
  }
}

console.log("---");
console.log(`total bumps applied: ${String(touched)}`);
