/**
 * asciinema v2 NDJSON writer.
 *
 * Header `timestamp` is frozen to 1700000000 so the .cast file is byte-
 * reproducible across regenerations — keeps `git diff` clean during
 * `bun run record-casts --update-snapshots`. The .cast file is a byproduct
 * and is not part of the hash contract (spec §3.4); the constant is purely
 * for reviewer ergonomics.
 */

export interface CastChunk {
  /** Milliseconds since the input step's CLI start. */
  readonly tMs: number;
  /** The stdout bytes for this chunk, already decoded to UTF-8 string. */
  readonly data: string;
}

const FROZEN_TIMESTAMP = 1700000000;
const HEADER = {
  version: 2,
  width: 120,
  height: 40,
  timestamp: FROZEN_TIMESTAMP,
  env: { SHELL: "/bin/sh", TERM: "dumb" },
} as const;

function eventLine(chunk: CastChunk): string {
  const seconds = chunk.tMs / 1000;
  // Three decimal places match the millisecond input precision exactly.
  const rounded = Math.round(seconds * 1000) / 1000;
  return JSON.stringify([rounded, "o", chunk.data]);
}

export function writeCastBytes(chunks: ReadonlyArray<CastChunk>): Uint8Array {
  const headerLine = JSON.stringify(HEADER);
  const eventLines = chunks.map(eventLine);
  const content = [headerLine, ...eventLines, ""].join("\n");
  return new TextEncoder().encode(content);
}
