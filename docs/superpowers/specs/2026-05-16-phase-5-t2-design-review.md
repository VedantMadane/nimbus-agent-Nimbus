# Review of Phase 5 T2 — Sandbox + Marketplace v2 — Sequencing Design

**Date:** 2026-05-16
**Status:** Review Feedback

The Phase 5 T2 plan-of-plans is well-structured and provides a strong logical progression, prioritizing security (Sandbox first) while leaving the smallest user-facing feature (Ratings) for last. The boundary definitions and invariant interactions are particularly solid.

Here are a few suggestions and open questions for consideration when moving to the per-PR specs:

### PR 1 — Sandbox PAL + 3-OS isolation
*   **Question (macOS Sandboxing):** Apple has deprecated `sandbox-exec` in favor of applying sandbox profiles during the app signing process, and it can sometimes be flaky in newer macOS versions (e.g., Sonoma/Sequoia) when dealing with complex networking. 
    *   **Suggestion:** For PR 1's per-PR spec, explicitly research or test the viability of `sandbox-exec` for the expected workload (Bun child processes making network requests). If `sandbox-exec` proves problematic, an alternative might be a minimal `EndpointSecurity` or macOS native wrapper, though that's much higher effort.
*   **Question (Win32 AppContainer):** Creating an AppContainer dynamically requires setting up the profile and managing SIDs.
    *   **Suggestion:** Ensure the per-PR spec details how AppContainer profiles will be cleaned up if the extension crashes or is uninstalled, to avoid leaking profile SIDs in the Windows registry over time.

### PR 2 — Verified publisher
*   **Observation:** Relying purely on the `openpgp` JS library is a good choice for avoiding external CLI dependencies.
*   **Suggestion:** In the per-PR spec, clarify how key rotation or expiration is handled. If a publisher's key expires (a common occurrence with GPG keys), will the extension immediately fail to start up, or is there a grace period?

### PR 3 — Auto-update with per-bump HITL
*   **Observation:** Auto-update polling defaults to 24 hours.
*   **Suggestion:** Consider if there needs to be a mechanism to force a poll manually (e.g., via the CLI `nimbus extension update [<id>] --check`). The design implies this CLI command, but explicitly stating that it bypasses the 24-hour cache will clarify the implementation.

### PR 4 — Dependency resolution (SAT solver)
*   **Observation:** The design notes a strong preference for reusing an existing SAT solver.
*   **Suggestion:** Ensure the per-PR spec defines the failure behavior if a user tries to install an extension but the registry is offline (or air-gapped without all dependencies available locally). The solver needs to fail gracefully with a specific error (e.g., `OfflineDependencyResolutionError`).

### PR 5 — Community ratings
*   **Question:** The design relies on an Ed25519 signing key generated on first use.
*   **Suggestion:** In the per-PR spec, lock down whether this key is synced or backed up. If the user moves to a new machine and generates a new key, will they lose the ability to manage their previous ratings? (The design explicitly states "edit/delete reviews" are out of scope, so this might be acceptable, but it's worth documenting the accepted limitation).

### General Formatting
*   The document's structure matches the excellent T6 spec, ensuring clear boundaries and exit criteria. The "Out of scope" lists are especially useful for keeping PRs focused.