/**
 * Applies the open dependabot version bumps to package.json files in this
 * workspace. Run once, then `bun install` regenerates a single bun.lock.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const bumps: ReadonlyArray<{ file: string; dep: string; ver: string }> = [
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

// zod 4.4.2 across gateway + every mcp connector
const zodFiles = ["packages/gateway/package.json"];
for (const d of readdirSync("packages/mcp-connectors")) {
  const p = `packages/mcp-connectors/${d}/package.json`;
  if (existsSync(p)) zodFiles.push(p);
}
for (const f of zodFiles) {
  (bumps as Array<{ file: string; dep: string; ver: string }>).push({
    file: f,
    dep: "zod",
    ver: "4.4.2",
  });
}

let touched = 0;
for (const { file, dep, ver } of bumps) {
  if (!existsSync(file)) {
    console.warn(`  skip (missing): ${file}`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(file, "utf8")) as PackageJson;
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
