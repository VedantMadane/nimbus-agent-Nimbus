/**
 * Cast-driver normalization pipeline. Order is load-bearing — UUID rule
 * must run before SHA rule so the SHA pattern does not consume UUID hex
 * segments. See spec §3.3.
 */

export interface NormalizationContext {
  /** Runner's temp-dir prefix (e.g. /tmp/cast-driver-xyz). Substituted with <TMP>. */
  readonly tmpDirPrefix: string;
  /** User's home prefix (e.g. /home/runner). Substituted with <HOME>. */
  readonly homePrefix: string;
}

export interface Rule {
  readonly name: string;
  readonly apply: (text: string, ctx: NormalizationContext) => string;
}

const ANSI_CSI = /\x1b\[[?]?[0-9;]*[A-Za-z]/g;
const ANSI_OSC = /\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g;
const ISO_8601 = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g;
const EPOCH_MS = /\b\d{13}\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
const ULID = /\b[0-9A-HJKMNP-TV-Z]{26}\b/g;
const LABELLED_ID = /\b(session_id|streamId|stream_id|sessionId|pid|PID)\s*[=:]?\s*([\w-]+)\b/g;
const VERSION = /\b(nimbus|Bun|Node)\s+v\d+\.\d+\.\d+(?:[-+.][\w.-]+)?\b/g;
// Git SHA: Match either (a) labeled SHA: sha=, commit=, etc. followed by 7-40 hex,
// OR (b) very long hex (20+ chars) that's clearly not a typo or number.
// Does NOT match bare short hex like "deadbeef" or pure decimals.
const GIT_SHA = /(?:sha=|commit=|SHA=|COMMIT=)([0-9a-f]{7,40})\b|\b[0-9a-f]{20,40}\b/g;

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const NORMALIZATION_RULES: ReadonlyArray<Rule> = [
  {
    name: "ansi-strip",
    apply: (t) => t.replace(ANSI_CSI, "").replace(ANSI_OSC, ""),
  },
  {
    name: "crlf-to-lf",
    apply: (t) => t.replace(/\r\n/g, "\n"),
  },
  {
    name: "cr-resolution",
    apply: (t) => {
      // (a) Replace \r\n with \n
      let text = t.replace(/\r\n/g, "\n");
      // (c) Lone trailing \r at EOF becomes \n
      if (text.endsWith("\r")) {
        text = text.slice(0, -1) + "\n";
      }
      // (b) Within each line, keep only substring after last \r
      const lines = text.split("\n");
      const resolved = lines.map((line) => {
        const lastCr = line.lastIndexOf("\r");
        return lastCr === -1 ? line : line.slice(lastCr + 1);
      });
      return resolved.join("\n");
    },
  },
  {
    name: "trailing-whitespace",
    apply: (t) =>
      t
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/, ""))
        .join("\n"),
  },
  {
    name: "tmp-prefix",
    apply: (t, ctx) => {
      if (ctx.tmpDirPrefix.length === 0) return t;
      return t.replace(new RegExp(escapeForRegex(ctx.tmpDirPrefix), "g"), "<TMP>");
    },
  },
  {
    name: "home-prefix",
    apply: (t, ctx) => {
      if (ctx.homePrefix.length === 0) return t;
      return t.replace(new RegExp(escapeForRegex(ctx.homePrefix), "g"), "<HOME>");
    },
  },
  {
    name: "iso-8601",
    apply: (t) => t.replace(ISO_8601, "<TS>"),
  },
  {
    name: "epoch-ms",
    apply: (t) => t.replace(EPOCH_MS, "<TS>"),
  },
  {
    name: "uuid",
    apply: (t) => t.replace(UUID, "<ID>"),
  },
  {
    name: "ulid",
    apply: (t) => t.replace(ULID, "<ID>"),
  },
  {
    name: "labelled-id",
    apply: (t) =>
      t.replace(LABELLED_ID, (match, label: string) => {
        const sep = match.includes("=") ? "=" : " ";
        return `${label}${sep}<ID>`;
      }),
  },
  {
    name: "version",
    apply: (t) => t.replace(VERSION, (_m, name: string) => `${name} <VERSION>`),
  },
  {
    name: "git-sha",
    apply: (t) =>
      t.replace(GIT_SHA, (match) => {
        // If it's a labeled SHA (sha=abc123), replace just the hex part
        const labelMatch = match.match(/^(sha=|commit=|SHA=|COMMIT=)/i);
        if (labelMatch) {
          return labelMatch[1] + "<SHA>";
        }
        // Otherwise it's a bare long hex, replace entirely
        return "<SHA>";
      }),
  },
];

export function applyNormalization(bytes: Uint8Array, ctx: NormalizationContext): string {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  let result = text;
  for (const rule of NORMALIZATION_RULES) {
    result = rule.apply(result, ctx);
  }
  return result;
}
