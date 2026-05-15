/**
 * README hero cast renderer.
 *
 * The cast at `docs/demos/incident-response.cast` is a faithful capture from
 * the cast-driver harness — its event timestamps are `Date.now()` deltas of a
 * fake-gateway test run, which means there are no reading pauses between
 * events. Rendered as-is, every event lands within ~232 ms of t=0 and
 * `svg-term-cli` / `termsvg` produce a SVG that visibly blinks.
 *
 * This script:
 *   1. Reads the canonical cast (does NOT modify it).
 *   2. Re-maps each event's timestamp to a watchable schedule with multi-second
 *      reading dwells between the four text blocks. Total run is ~21 s with a
 *      final pad before the animation loops.
 *   3. Writes the stretched cast to a temp file.
 *   4. Invokes `termsvg export` twice — once with the solarized-light palette,
 *      once with solarized-dark — writing the result into `docs/assets/`.
 *
 * The canonical `.cast` is left alone so `bun run record-casts` and the cast-
 * tripwire (which hashes the transcript content, not the timestamps) remain
 * unaffected.
 *
 * Renderer prerequisite: `termsvg` v0.10+ on PATH. Install via release binary
 * or `go install github.com/mrmarble/termsvg/cmd/termsvg@latest`. See
 * `docs/assets/README.md`.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CAST_INPUT = "docs/demos/incident-response.cast";
const LIGHT_OUT = "docs/assets/hero-cast-light.svg";
const DARK_OUT = "docs/assets/hero-cast-dark.svg";

// Target schedule (seconds). Each entry is the absolute timestamp at which the
// Nth event from the source cast should be shown. The last entry is a trailing
// pad — termsvg holds the final frame until the loop point.
//
// Tuned for "unfamiliar reader" pacing: the longest block (Investigation
// findings) gets the most dwell; consent + posted lines get tighter
// turnarounds because they're short and the consent line is meant to feel
// snappy.
const SCHEDULE_SECONDS: ReadonlyArray<number> = [
  0.5, //  0: "## Investigation\n\n…rose from 120ms to 380ms…" (the big block)
  7.0, //  1: "Drafting incident summary for #ops..."
  12.0, // 2: "[consent.request] Post to Slack #ops requires consent"
  17.0, // 3: "Posted to #ops."
];
const TRAILING_PAD_SECONDS = 4; // hold final frame this long before loop

interface AsciinemaHeader {
  readonly version: 2;
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
  readonly env?: Record<string, string>;
}

type AsciinemaEvent = readonly [number, "o" | "i", string];

function parseCast(path: string): { header: AsciinemaHeader; events: AsciinemaEvent[] } {
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter((l: string) => l.length > 0);
  if (lines.length === 0) throw new Error(`${path}: empty cast`);
  const header = JSON.parse(lines[0] ?? "") as AsciinemaHeader;
  if (header.version !== 2) throw new Error(`${path}: only asciinema v2 supported`);
  const events: AsciinemaEvent[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined) continue;
    events.push(JSON.parse(line) as AsciinemaEvent);
  }
  return { header, events };
}

function stretchCast(input: { header: AsciinemaHeader; events: AsciinemaEvent[] }): string {
  if (input.events.length !== SCHEDULE_SECONDS.length) {
    throw new Error(
      `Cast has ${input.events.length} events but SCHEDULE_SECONDS has ${SCHEDULE_SECONDS.length} entries — update the schedule when adding/removing cast events.`,
    );
  }
  const headerLine = JSON.stringify(input.header);
  const eventLines = input.events.map((event, idx) => {
    const tSeconds = SCHEDULE_SECONDS[idx] ?? 0;
    return JSON.stringify([tSeconds, event[1], event[2]]);
  });
  // Trailing dwell — terminate with an empty-data event so the renderer treats
  // the final frame as held until t = lastSchedule + TRAILING_PAD_SECONDS.
  const lastT = SCHEDULE_SECONDS[SCHEDULE_SECONDS.length - 1] ?? 0;
  eventLines.push(JSON.stringify([lastT + TRAILING_PAD_SECONDS, "o", ""]));
  return `${[headerLine, ...eventLines].join("\n")}\n`;
}

function render(stretchedCastPath: string, outputPath: string, bg: string, fg: string): void {
  // `termsvg export` is silent on success and prints to stderr on failure.
  // Inherit stdio so any failure is visible to the caller.
  execFileSync(
    "termsvg",
    [
      "export",
      "--output",
      outputPath,
      "--background-color",
      bg,
      "--text-color",
      fg,
      stretchedCastPath,
    ],
    { stdio: "inherit" },
  );
}

function main(): void {
  const cast = parseCast(CAST_INPUT);
  const stretched = stretchCast(cast);

  const workDir = mkdtempSync(join(tmpdir(), "nimbus-hero-cast-"));
  const stretchedPath = join(workDir, "incident-response.stretched.cast");
  writeFileSync(stretchedPath, stretched, "utf8");
  try {
    render(stretchedPath, LIGHT_OUT, "#fdf6e3", "#586e75"); // solarized-light
    render(stretchedPath, DARK_OUT, "#002b36", "#93a1a1"); //  solarized-dark
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
  console.log(`Rendered ${LIGHT_OUT} and ${DARK_OUT} from ${CAST_INPUT} with stretched schedule.`);
}

main();
