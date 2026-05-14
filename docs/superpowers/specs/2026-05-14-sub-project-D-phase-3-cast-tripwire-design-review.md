# Review: Sub-project D — Phase 3: Output-Hash Tripwire & Headless Casts Design

**Date:** 2026-05-14
**Target:** `2026-05-14-sub-project-D-phase-3-cast-tripwire-design.md`

## 1. Overall Impression

The design expertly works around the Gateway `clientId` consent scoping issue by injecting the consent source at the CLI level via `--script-consent-source`. This preserves all strict Gateway HITL invariants without requiring structural exceptions. The deterministic hashing approach with strict normalization rules is robust and avoids the flakiness commonly associated with PTY-based snapshot testing.

## 2. Suggestions & Observations

### 2.1 Cross-Platform Normalization (Slashes)
**Observation:** Normalization rule 5 replaces the runner temp dir prefix with `<TMP>` and home with `<HOME>`. Section 10 notes that `--update-snapshots` should only be run on Linux to match CI.
**Suggestion:** Even if we restrict snapshot updates to Linux, developers running macOS locally might experience spurious diffs when running `bun run record-casts --check` due to subtle path formatting differences. Consider adding a normalization rule (perhaps Rule 4.5) to convert all backslashes `\` to forward slashes `/` across the entire transcript before doing the `<TMP>` and `<HOME>` replacements. This reduces friction for local execution on Windows/macOS.

### 2.2 Progress Bars and `\r` Handling
**Observation:** Normalization rule 3 converts lone `\r` to `\n`.
**Suggestion:** Since `TERM=dumb` and `NO_COLOR=1` are used, progress spinners and bars are hopefully disabled by the CLI. However, if the CLI still emits carriage returns (`\r`) to overwrite lines (e.g., download progress), converting `\r` to `\n` will result in a massive wall of text in the normalized `<name>.txt` snapshot. If this happens, consider replacing the `\r` normalization rule with a "resolve carriage returns" rule that actually simulates the overwrite (keeping only the final state of the line), or ensure the CLI strictly disables all progress animations when `TERM=dumb`.

### 2.3 Consent JSONL Sync
**Observation:** The `--script-consent-source` consumes lines sequentially. 
**Suggestion:** If a single input step triggers multiple consent requests, they must be ordered exactly as they are requested. The design covers this perfectly. However, if the system ever introduces concurrent tool execution where the order of consent requests becomes non-deterministic, the sequential JSONL approach will fail. This isn't an issue for the current architecture, but is worth noting as an underlying assumption: consent requests for a single command must be deterministic in their sequence.

### 2.4 Artifact Organization
**Observation:** The `.cast` is a byproduct and not hashed, with a frozen timestamp of `1700000000`.
**Suggestion:** Excellent decision to freeze the `.cast` timestamp. This completely eliminates merge conflicts on the byproduct file when snapshots are updated across different PRs.

## 3. Technical Verification Note

- As noted in Section 10, the most critical implementation risk is the **LLM Stubbing**. Ensure that the stubbing mechanism uses a stable hashing function for request matching. If the Gateway passes non-deterministic IDs (like a span ID or telemetry ID) inside the LLM prompt or headers, the LLM stub's request signature generator must be taught to strip or ignore those fields to ensure consistent cache hits.

The design is sound, cleanly avoids weakening project invariants, and provides a clear, maintainable path for the tripwire implementation.
