# Phase 14 — Agent Evolution / AI v2 (Design)

**Status:** Approved 2026-05-10
**Author:** Asaf Golombek (with Claude assistance)
**Scope:** Add a new final phase (Phase 14) after Desktop Distribution. Long-horizon capability frontier; structured as Core / Stretch so the phase remains shippable even if the most research-adjacent capabilities slip.

---

## Motivation

By the time Phases 1–13 complete, Nimbus is a deeply-connected, multi-agent, sovereign, enterprise-deployable, distribution-ready local-first AI platform. What Phase 14 adds is a different axis: **what the agent is capable of doing at all**, independent of how many connectors it has or how many users share it.

The capabilities here are at the 2026-era capability frontier — computer use, code execution sandboxing, multimodal understanding, on-device fine-tuning, and runtime tool generation. None of them are infrastructural in the same sense as Phases 1–13; they are agent-power expansions. Bundling them as a final phase keeps them clearly distinct from the "ship the platform" arc and admits that some are research-adjacent.

## New Phase 14 — Agent Evolution / AI v2

**Goal:** Expand Nimbus's intrinsic agent capabilities along four dimensions — multimodal I/O, isolated code execution, computer use, and runtime tool generation. Land Core (Multimodal + Code Exec) as productizable; ship Stretch (Computer Use + Tool Gen) as research-mode that gates per-capability HITL with no standing-approval support by default.

**Risk profile:** This is the highest-risk-blast-radius phase. Computer use and code execution operate against arbitrary system surfaces; tool generation creates code paths the user has not reviewed in advance. Every Core and Stretch item ships with HITL gating that **cannot be bypassed by standing approvals** in this phase — that lift is itself a Phase 14.x follow-up after operational confidence accrues.

> **Composes with Phase 10 (Autonomous Agent):** Phase 10's standing approvals are intentionally **not** extended to Phase 14 capabilities by default. The Autonomous Agent's incident correlation engine can however invoke Phase 14 capabilities under HITL when the user explicitly approves a multi-step remediation that includes (e.g.) a code-execution step.

> **Composes with Phase 12 (Enterprise post-shift):** Enterprise policy-as-code (`nimbus.policy.toml`) is extended to allow disabling Phase 14 capabilities entirely at the org level. A regulated organisation can run Nimbus through Phase 13 with Phase 14 capabilities locked off.

> **Composes with Phase 9 (AI Engineering Loop):** Fine-tuning training runs are indexed as `ml_model` items via Phase 9's connectors when the fine-tune target is registered with MLflow / SageMaker / Vertex AI. Local fine-tune output (Phase 14 Stretch) emits the same shape into the local index.

### Dependencies

- Phase 4 LLM router + multi-agent orchestration
- Phase 4 Plugin API v1
- Phase 10 standing approvals (Phase 14 explicitly **opts out** of standing approvals at the executor; the dependency is to confirm the gate exists, not to extend it)
- Phase 12 Enterprise policy-as-code (org-level disable mechanism)
- All prior platform phases stable — this phase inherits, never overrides

### Structure — Core / Stretch Split

**Core gates phase completion.** **Stretch does not.** This split mirrors Phase 10 (Autonomous Agent) where SRE-loop and LoRA fine-tuning are explicitly stretch.

### Core — Multimodal I/O

Adds image / video / audio understanding beyond the Phase 4 voice baseline.

- [ ] **Image input — vision-model OCR + scene understanding** — indexed screenshots, design-file thumbnails, whiteboard photos passed to a local or remote VLM (Pixtral, Llama 3.2 Vision, Claude Sonnet / Opus, GPT-4o); structured caption + entity extraction stored as `image_understanding` rows; HITL only when image content triggers a write
- [ ] **Video input — local STT + frame captioning** — Loom / Vidyard / meeting recordings indexed via `whisper-cli` STT + periodic frame caption (every N seconds, configurable); `video_understanding` rows with `transcript_text`, `frame_captions[]`, `speaker_diarization`
- [ ] **Audio input beyond Phase 4 voice** — long-form transcription with diarization, summary extraction, action-item identification (matches Phase 10 incident-brief shape for meeting recordings)
- [ ] **Image output via local SD/Flux** — `nimbus diagram <description>` produces a draft diagram via a locally-installed Stable Diffusion or Flux model; HITL on save-to-file; opt-in
- [ ] **Multimodal MCP tools** — `searchLocalIndexImages`, `summarizeVideo`, `extractActionItemsFromAudio`; wrapped via `wrapToolOutput` per invariant `I11`

### Core — Code Execution Sandbox

Adds an isolated runtime for agent-written scripts.

- [ ] **Local sandbox runner** — Bun + Deno (`--no-net` by default) inside `bwrap` (Linux) / `sandbox-exec` (macOS) / AppContainer (Windows) for per-execution isolation; capability flags configurable per session (`--allow-net`, `--allow-fs <path>`, `--allow-env <var>`)
- [ ] **Optional remote sandbox adapters** — pluggable adapters for E2B, Modal, Daytona, fly.io machines; enabled only via explicit `[code_execution.remote_sandbox]` config; `enforce_air_gap = true` blocks remote sandboxes regardless of config
- [ ] **HITL on every execution by default** — consent dialog shows: code body, declared capability flags, expected runtime budget; rejection is logged; **standing approvals are explicitly NOT supported in this phase** for code execution
- [ ] **Output capture and feed-back** — stdout/stderr/exit-code/runtime returned to the LLM via `wrapToolOutput`; binary outputs (files written, processes spawned) are recorded in audit log
- [ ] **`nimbus exec --interactive`** — REPL mode where each agent-emitted code block individually requires Enter-to-approve; useful for live coding sessions

### Stretch — Computer Use (browser / terminal / screen)

Highest-risk capability. Ships only with the most conservative defaults.

- [ ] **Browser automation** — Playwright-driven, screenshot-grounded; agent emits click / type / navigate actions; **per-action HITL by default**; sandboxed Chromium profile with no shared cookies / no shared history; opt-in per-session; reference: Claude Computer Use, ChatGPT Operator
- [ ] **Terminal automation** — PTY-grounded; agent emits keystrokes against a sandboxed shell; per-command HITL by default; no access to the user's primary shell history or environment
- [ ] **Screen capture + click** — desktop OS-level click + keystroke; per-action HITL; sandboxed application target only (cannot drive the Nimbus UI itself, cannot click outside the target window); same opt-in posture as browser
- [ ] **Action-stream audit** — every emitted action recorded in audit log with screenshot before/after for screen capture, DOM snapshot before/after for browser; supports post-incident replay

### Stretch — Tool Generation & Fine-Tuning

- [ ] **Runtime tool generation** — agent writes its own MCP tool stub (TypeScript), Nimbus runs the contract test from `@nimbus-dev/sdk`; if tests pass, tool registers ephemerally for that session only (not persisted across sessions); HITL per tool registration; standing approvals explicitly not supported
- [ ] **Tool persistence** — `nimbus tool save <session-tool-id>` promotes an ephemeral tool to a named installed extension after manual review; ships through the standard extension manifest path with SHA-256 verification
- [ ] **Local instruction fine-tuning** — full-precision instruction-tune of small models (3B–7B) on the user's tool-use traces + writing samples; output as a GGUF in the local model directory; `nimbus model train --instruction-tune` background job; air-gap-compatible
- [ ] **Tool-use trace dataset builder** — `nimbus dataset build --from-audit --kind tool-use` produces a JSONL dataset of (intent, tool-call, observed-result) tuples from the audit log, ready for the fine-tuner; user reviews + edits before train start
- [ ] **Adapter rollback safety** — every fine-tune output is rollback-safe; the previous adapter is retained until the user explicitly promotes the new one

### Schema Migrations

Continuing from the last migration before Phase 14:

| # | Objects added | Section |
|---|---|---|
| M+1 | `image_understanding` + `video_understanding` + `audio_understanding` tables | Core: Multimodal |
| M+2 | `code_execution_run` + `sandbox_capability_grant` tables | Core: Code Exec |
| M+3 | `computer_use_action` table (event-sourced; replay-capable) | Stretch: Computer Use |
| M+4 | `generated_tool` + `tool_use_dataset` tables | Stretch: Tool Gen |
| M+5 | `local_finetune_run` + `local_finetune_artifact` tables | Stretch: Fine-tuning |

All append-only, single-transaction, pre-migration backup, per `nimbus-db-migrations` skill.

### Acceptance Criteria — Core (gates phase)

- A 5-minute Loom recording indexed via local STT + frame captioning produces a `video_understanding` row with non-empty `transcript_text` and at least one `frame_captions` entry; verified e2e on Windows + macOS + Linux
- `nimbus ask "what did I demo in the recording from yesterday?"` returns a coherent answer derived from the `video_understanding` row alone (no live re-processing)
- `nimbus exec` runs an agent-written 5-line Python script in the local sandbox with `--allow-fs /tmp` capability; HITL fired before execution; output captured; audit log records: code body, capability grant, exit code, stdout/stderr digest
- A code execution attempting to write outside `/tmp` (capability boundary breach) fails closed; the agent is told the operation was denied
- `enforce_air_gap = true` blocks the remote sandbox adapter even when configured; verified by integration test
- Privacy contract: no image / video / audio body data leaves the machine without explicit user opt-in for that artifact; the contract test pipes a known-fingerprint audio file and asserts no outbound network connection during indexing

### Acceptance Criteria — Stretch (does not gate phase)

- Browser automation completes a 3-step task (login → search → screenshot) against a sandboxed Chromium profile with HITL on every action; verified manually on Windows + macOS + Linux
- An agent-generated MCP tool passes the `@nimbus-dev/sdk` contract test and registers ephemerally for the session; the tool is unavailable in a fresh session unless promoted via `nimbus tool save`
- A local instruction fine-tune of a 3B model on a 1k-row tool-use dataset completes in under 30 minutes on a mid-range GPU; the resulting GGUF appears in `llm.listModels`; rollback to the previous adapter via `nimbus model rollback` works without restart
- Computer use, code execution, and tool generation share a single audit-log fingerprint format that lets `nimbus audit replay <session-id>` deterministically reconstruct what the agent did

### Org-Level Lockoff

- [ ] **Capability disable via Enterprise policy** — `nimbus.policy.toml` honours `[capabilities.ai_v2]` block: `multimodal_input = false`, `code_execution = false`, `computer_use = false`, `tool_generation = false`, `local_finetuning = false`. Each false value disables the corresponding capability at gateway startup; users on the affected machine see a structured "disabled by policy" error if they try to invoke it. Required by regulated industries.

### Stretch Beyond — long-horizon items

These do not appear in Phase 14 scope but are tracked here so the next phase has a starting list:

- Cooperative agents — multiple Nimbus instances negotiating across organisations on a shared problem (extension of Phase 11 federation across org boundaries)
- Embodied / physical agent (robotics, IoT) — out of stated audience scope today
- Public knowledge-graph contribution — community-curated relationship-graph fragments published as signed deltas
- LLM training (full-precision) on user data — much higher resource bar; deferred indefinitely

## Open Questions

- **Standing-approval lift for Phase 14 capabilities** — explicitly out of scope for this phase. After 6 months of operational data on Core capabilities, a follow-up spec can decide whether code execution under specific capability boundaries is safe to standing-approve.
- **Vision-model selection** — the spec lists VLM candidates without committing; selection deferred to phase implementation. Local-first preference: Llama 3.2 Vision (Ollama) or Pixtral; remote fallback Claude / GPT-4o.
- **Computer use sandboxing on Linux** — `bwrap` + a separate Xvfb instance is the proposed isolation primitive; tested in implementation phase
- **Adapter format** — fine-tuning produces full GGUF (not LoRA) per the choice to go beyond Phase 10's LoRA stretch; storage cost grows linearly with adapter count

## Approval

User confirmed via brainstorming session 2026-05-10:
- Capabilities: all four (Computer Use · Code Exec · Multimodal · Tool Generation + Fine-Tuning)
- Risk structure: Core / Stretch split (Multimodal + Code Exec gating; Computer Use + Tool Gen as stretch)
- Placement: Final phase, after Desktop Distribution (Phase 14 in the renumbered scheme)
