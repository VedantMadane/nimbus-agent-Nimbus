import { createHash } from "node:crypto";
import { basename } from "node:path";

/**
 * Stable, deterministic id for a vault, derived from the absolute root path.
 * Moving a vault re-issues all `obsidian_note` ids — that is by design (see
 * the plan's "Known limitations" §1).
 */
export function vaultIdFromAbsolutePath(absolutePath: string): string {
  return createHash("sha256").update(absolutePath).digest("hex").slice(0, 12);
}

/** Vault display name: basename of the vault root directory. */
export function formatVaultName(absolutePath: string): string {
  const trimmed = absolutePath.replace(/[/\\]+$/, "");
  return basename(trimmed);
}
