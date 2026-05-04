import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";

/**
 * Tails a gateway log file for progress display in the CLI spinner. The log
 * is a mix of plain stdout/stderr writes (e.g. `[gateway] ready ...`) and
 * pino JSON lines — `extractLatestMessage` picks a human-readable preview
 * from either.
 *
 * Partial writes are not consumed: the offset stops at the last newline so
 * a half-flushed line is picked up on the next poll once it completes.
 */
export class GatewayLogTailer {
  private offset: number;

  constructor(startOffset = 0) {
    this.offset = startOffset;
  }

  /** Returns the most recent complete line's preview, or `null` if nothing new. */
  pollLatest(logPath: string): string | null {
    if (!existsSync(logPath)) {
      return null;
    }
    const size = statSync(logPath).size;
    if (size <= this.offset) {
      return null;
    }
    const len = size - this.offset;
    const buf = Buffer.alloc(len);
    const fd = openSync(logPath, "r");
    try {
      readSync(fd, buf, 0, len, this.offset);
    } finally {
      closeSync(fd);
    }
    const text = buf.toString("utf8");
    const lastNl = text.lastIndexOf("\n");
    if (lastNl < 0) {
      return null;
    }
    this.offset += lastNl + 1;
    const lines = text.slice(0, lastNl).split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]?.trim() ?? "";
      if (line.length === 0) {
        continue;
      }
      return extractLatestMessage(line);
    }
    return null;
  }
}

export function extractLatestMessage(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === "object") {
        const msg = (parsed as Record<string, unknown>)["msg"];
        if (typeof msg === "string" && msg.length > 0) {
          return msg;
        }
      }
    } catch {
      /* not JSON, fall through */
    }
  }
  const gatewayPrefix = "[gateway] ";
  if (trimmed.startsWith(gatewayPrefix)) {
    return trimmed.slice(gatewayPrefix.length);
  }
  return trimmed;
}

export function truncatePreview(s: string, max = 80): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}
