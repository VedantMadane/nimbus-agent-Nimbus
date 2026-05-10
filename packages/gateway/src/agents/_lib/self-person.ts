import type { Database } from "bun:sqlite";
import {
  findPersonByCanonicalEmail,
  findPersonByGithubLogin,
  normalizeEmail,
} from "../../people/person-store.ts";

/**
 * Self-person resolution chain for `nimbus catchup`.
 *
 * Tiers (in order):
 *   1. `[user] me_person_id` from the active profile's nimbus.toml.
 *      Used verbatim — not validated against the index. If the override
 *      is wrong, downstream sub-agents return zero evidence and emit gaps,
 *      which is the correct user-facing signal.
 *   2. `git config user.email` — looked up via person.canonical_email after
 *      `normalizeEmail` (lowercase + trim). Common case: the user is a
 *      git user and their indexed person row already carries the same
 *      canonical email.
 *   3. OS username (`os.userInfo().username`) — looked up via
 *      person.github_login (the most common convention: dev's local user
 *      matches their github handle). We do NOT fan out to every per-service
 *      handle column because the false-match rate climbs quickly and the
 *      gap-note path is preferable to a wrong identity.
 *
 * If all three miss, returns `{ personId: null, source: "unresolved" }`. The
 * caller emits a `missing_user_identity` gap note pointing at
 * `nimbus config set user.me_person_id <id>`.
 */

export type SelfPersonSource = "override" | "git" | "os" | "unresolved";

export type SelfPersonResolution = {
  personId: string | null;
  source: SelfPersonSource;
};

export type GitRunner = () => Promise<string | null>;

export type ResolveSelfPersonInput = {
  override?: string;
  runGit?: GitRunner;
  osUsername?: string;
};

export async function defaultRunGitConfigUserEmail(): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", "config", "user.email"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) return null;
    return out;
  } catch {
    return null;
  }
}

export async function resolveByGitEmail(
  db: Database,
  deps: { runGit: GitRunner },
): Promise<string | null> {
  const raw = await deps.runGit();
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const email = normalizeEmail(trimmed);
  const person = findPersonByCanonicalEmail(db, email);
  return person?.id ?? null;
}

export function resolveByOsUsername(db: Database, deps: { osUsername: string }): string | null {
  const u = deps.osUsername.trim();
  if (u.length === 0) return null;
  const person = findPersonByGithubLogin(db, u);
  return person?.id ?? null;
}

export async function resolveSelfPerson(
  db: Database,
  input: ResolveSelfPersonInput,
): Promise<SelfPersonResolution> {
  if (input.override !== undefined && input.override.length > 0) {
    return { personId: input.override, source: "override" };
  }
  const runGit = input.runGit ?? defaultRunGitConfigUserEmail;
  const fromGit = await resolveByGitEmail(db, { runGit });
  if (fromGit !== null) return { personId: fromGit, source: "git" };
  const osUsername = input.osUsername ?? "";
  const fromOs = resolveByOsUsername(db, { osUsername });
  if (fromOs !== null) return { personId: fromOs, source: "os" };
  return { personId: null, source: "unresolved" };
}
