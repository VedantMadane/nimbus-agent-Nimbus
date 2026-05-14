# Review: Phase 5 T4 PR 3b — Post-Deploy Annotation Design

**Reviewer:** Gemini CLI
**Date:** 2026-05-13
**Status:** Feedback provided

## Summary

The design is architecturally sound and aligns well with the Nimbus "Local-first" and "Security-first" non-negotiables. The convergence on a single IPC method (`deployment.annotate`) for all three entry points (CLI, HTTP, Action) is a strong pattern that minimizes implementation drift and simplifies testing. The introduction of the `I13` security invariant is a critical addition as Nimbus starts exposing write surfaces over HTTP.

## Questions & Clarifications

1. **External ID Determinism in Scripts (§5.3):**
   - The fallback idempotency key `"<service>:<env>:<sha>:<started_at_ms>"` includes `started_at_ms`. For shell scripts that might retry an entire deployment (generating a new start time), this will result in duplicate `deployment` items for the same logical deployment (same SHA). 
   - **Question:** Should the fallback exclude `started_at_ms` to favor `(service, env, sha)` identity, or is the intention to track every attempted execution as a separate item? If the latter, DORA frequency might be inflated by retries.

2. **`I13` Robustness (§5.9):**
   - The enforcement test uses a regex-grep to ensure no writable handles are opened elsewhere. 
   - **Question:** How will the test handle legitimate write handles in other subsystems (e.g., sync connectors, audit log)? The grep should likely be scoped to `packages/gateway/src/ipc/` to be effective without being overly broad or brittle.

3. **Status Enum Extensibility (§5.2):**
   - **Question:** Have we considered `degraded` or `partially_successful` statuses? While not common in simple "green/red" CI, blue/green or canary deployments often have intermediate states that are "finished" but not "success".

4. **Service Resolution (§5.2):**
   - The design says "Unknown service → `400 unknown_service`". 
   - **Question:** Since `ci.service.<id>` and `metrics.dora.<id>` are defined in `nimbus.toml`, does the Gateway need a config reload to recognize a new service before it can be annotated? Confirm that `nimbus config reload` (or similar) is the expected operator path if they add a service and immediately try to annotate it.

## Suggestions for Improvement

1. **Token Scoping (Future-proofing):**
   - Currently, `http_api.deployment_token` is a single global token. 
   - **Suggestion:** Consider namespacing the vault key as `http_api.tokens.deploy.global` now, even if only one token is supported. This allows for future per-service or per-environment tokens (e.g., `http_api.tokens.deploy.payment-service`) without a breaking schema change in the vault.

2. **DORA "Mixed Source" Visibility (§5.7):**
   - The `gap: "mixed_source"` is a great touch for visibility.
   - **Suggestion:** In the CLI output for `nimbus metrics dora`, highlight this gap with a specific color or icon to ensure operators realize their data source is transitioning.

3. **Validation Hints (§5.5):**
   - **Suggestion:** For the `400 unknown_service` error, include a hint in the response body if the service *id* exists in the config but hasn't been enabled for CI/DORA yet. This reduces "why is my service unknown?" friction.

4. **Rate Limit Transparency (§5.5):**
   - **Suggestion:** Ensure the `HttpWriteRateLimiter` includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. This allows the GitHub Action (or scripts) to intelligently back off before hitting the 429 wall.

5. **I11 Integration Test (§7):**
   - The plan to seed a deployment with `</tool_output>` is excellent.
   - **Suggestion:** Ensure this test is part of the `dora-deployment-source.test.ts` or a dedicated security integration suite to prevent regressions as new fields are added to the deployment schema.

## Minor Notes

- **Â§5.6 Audit Row:** The `source_ip` being `"local"` for IPC is consistent with existing patterns.
- **Â§11 Risks:** The `503 write_surface_disabled` is a safe default. Ensure the `nimbus vault set` command is clearly documented in the Action's README "Getting Started" section.

## Conclusion

The design is ready for implementation once the `external_id` fallback logic is clarified regarding its impact on DORA frequency. The security controls are robust and the testing strategy is exhaustive.
