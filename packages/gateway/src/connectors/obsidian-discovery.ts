import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  "out",
  "vendor",
  ".cache",
]);

const VAULT_MARKER = ".obsidian";

function isDirectorySafe(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function readDirSafe(path: string): readonly string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/**
 * Recursively finds every directory that directly contains a `.obsidian/`
 * marker. Walks each `[[filesystem.roots]]` root.
 *
 * Stops recursion into a directory once it is identified as a vault — but
 * the spec allows nested vaults: if a sub-directory of a vault itself
 * contains `.obsidian/`, that sub-directory is also returned. The walker
 * therefore continues into sub-directories of an identified vault, but
 * skips the inner `.obsidian/` directories themselves.
 */
export function discoverVaults(roots: readonly string[]): readonly string[] {
  const out: string[] = [];
  for (const root of roots) {
    walkForVaults(root, out);
  }
  return out;
}

function walkForVaults(dir: string, out: string[]): void {
  if (!isDirectorySafe(dir)) {
    return;
  }
  const entries = readDirSafe(dir);
  if (entries.includes(VAULT_MARKER) && isDirectorySafe(join(dir, VAULT_MARKER))) {
    out.push(dir);
  }
  for (const e of entries) {
    if (e === VAULT_MARKER) {
      continue;
    }
    if (DEFAULT_IGNORED_DIR_NAMES.has(e)) {
      continue;
    }
    const sub = join(dir, e);
    let isDir = false;
    try {
      const st = statSync(sub);
      isDir = st.isDirectory() && !st.isSymbolicLink();
    } catch {
      continue;
    }
    if (isDir) {
      walkForVaults(sub, out);
    }
  }
}

/**
 * Returns paths (vault-relative, forward-slashed) of every `.md` file
 * under `vaultRoot`, excluding any `.md` inside the vault's `.obsidian/`
 * directory and inside any nested-vault sub-directory.
 */
export function discoverNotesInVault(vaultRoot: string): readonly string[] {
  const out: string[] = [];
  walkForNotes(vaultRoot, vaultRoot, out);
  return out;
}

function walkForNotes(currentDir: string, vaultRoot: string, out: string[]): void {
  if (!isDirectorySafe(currentDir)) {
    return;
  }
  const entries = readDirSafe(currentDir);
  // If this directory is itself a nested vault (and not the root), stop here.
  if (
    currentDir !== vaultRoot &&
    entries.includes(VAULT_MARKER) &&
    isDirectorySafe(join(currentDir, VAULT_MARKER))
  ) {
    return;
  }
  for (const e of entries) {
    if (e === VAULT_MARKER) {
      continue;
    }
    if (DEFAULT_IGNORED_DIR_NAMES.has(e)) {
      continue;
    }
    const full = join(currentDir, e);
    let isDir = false;
    let isFile = false;
    try {
      const st = statSync(full);
      if (st.isSymbolicLink()) {
        continue;
      }
      isDir = st.isDirectory();
      isFile = st.isFile();
    } catch {
      continue;
    }
    if (isFile && full.toLowerCase().endsWith(".md")) {
      const rel = relative(vaultRoot, full).replaceAll("\\", "/");
      out.push(rel);
    } else if (isDir) {
      walkForNotes(full, vaultRoot, out);
    }
  }
}
