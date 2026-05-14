# Review: Sub-project D — Phase 3: Output-Hash Tripwire & Headless Casts Implementation Plan

**Date:** 2026-05-14
**Target:** `2026-05-14-sub-project-D-phase-3-cast-tripwire.md`

## 1. Overall Impression

This is a phenomenal implementation plan. The decision to pivot from the design's "Real Gateway + Mock MCP + LLM Stub" approach to a `FakeGateway` that strictly serves JSON-RPC from a fixture is a massive improvement. It removes all non-determinism, sidesteps the complex LLM stubbing risks identified in the design spec, and isolates the CLI rendering perfectly. 

## 2. Suggestions & Observations

### 2.1 FakeGateway `engine.askStream` Coupling
**Observation:** In Task 7.5 (`fake-gateway.ts`), the `FakeGateway` emits the scripted notifications when it receives an `engine.askStream` message.
**Suggestion:** This works perfectly for `nimbus expert` and `nimbus ask` which use streaming responses. However, if a future script tests a CLI command that does *not* use `engine.askStream` (e.g., a purely local command or a different RPC method like `engine.runTask`), the `FakeGateway` won't emit the notifications for that step. It may be worth noting in a comment that the `FakeGateway` is currently coupled to `engine.askStream` as the trigger, so future script authors know where to look if their non-streaming commands hang.

### 2.2 Synchronous File Reading for Consent
**Observation:** In Task 2.3, `registerScriptConsentHandler` uses `readFileSync` to load all JSONL decisions into an array at registration time, rather than holding a file descriptor open.
**Feedback:** This is a fantastic implementation choice. It ensures the file descriptor doesn't leak, and failing early (during registration) if the JSONL is malformed is the safest behavior.

### 2.3 `cr-resolution` Normalization Rule
**Observation:** In Task 3.3, the `cr-resolution` rule explicitly simulates in-place terminal overwriting by keeping only the substring after the last `\r` per line.
**Feedback:** Excellent. This directly addresses the progress bar / spinner risk mentioned in the design review. It's robust and prevents the normalized transcript from blowing up in size if a loading bar emits carriage returns.

### 2.4 End-to-End Test Isolation
**Observation:** Task 11.6's E2E test runs `--check` against the committed `incident-response` snapshots.
**Feedback:** This is a clever and lightweight way to verify the entire pipeline using the actual demo artifacts as test fixtures. It ensures the tripwire works exactly as it will in the GitHub Actions job.

The plan is extremely rigorous, logically sound, and ready for execution.
