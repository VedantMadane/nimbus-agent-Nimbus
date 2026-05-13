# Review: Sub-project C — Community Pack Design

## Overall Impressions
The specification is comprehensive, meticulously planned, and very well structured. The phased three-PR train correctly identifies dependencies and isolates the GitHub operations from the file changes. The focus on defining strict criteria for "Good First Issues" (GFI) with a mentor SLA is a high-impact initiative that will significantly improve the contributor onboarding experience.

## Suggestions & Improvements

1. **`SUPPORT.md` File Location Consistency:**
   - **Current Design:** Places `SUPPORT.md` in `.github/SUPPORT.md`.
   - **Suggestion:** Section 2, Decision #6 explicitly locked the decision to leave `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` in `docs/` because GitHub auto-discovers them there. To maintain consistency, consider placing `SUPPORT.md` at `docs/SUPPORT.md` instead of `.github/SUPPORT.md`. GitHub supports discovery in `docs/` for `SUPPORT.md` as well.

2. **GFI Mentor SLA (48 hours) Expectations:**
   - **Current Design:** The GFI criteria requires the mentor to respond within 48 hours.
   - **Suggestion:** Add a small clarifier in `docs/CONTRIBUTING.md` that the 48-hour SLA applies to "business days" or "excluding weekends/holidays." This sets realistic expectations for contributors and prevents maintainer burnout or feelings of guilt over weekend gaps.

3. **Absolute URLs in `config.yml` and Forks:**
   - **Current Design:** The `contact_links` in `config.yml` use absolute URLs pointing to `nimbus-agent/Nimbus`.
   - **Suggestion:** This is standard and required by GitHub's `config.yml` schema (which does not support relative URLs). However, be aware that if a user forks the repository and leaves issues enabled on the fork, the contact links on their fork will point back to the upstream `nimbus-agent/Nimbus` repository. This is usually desirable for Security and general Discussions, but it is worth noting as an expected behavior in the documentation.

4. **Issue Form `bug_report.yml` Details:**
   - **Current Design:** OS dropdown and checkboxes for Components.
   - **Suggestion:** Consider adding a short prompt or link in the `additional` textarea description encouraging users to attach their `nimbus.log` (or similar relevant log files) if applicable, as logs often provide the fastest path to resolution.

## Open Questions

1. **Issue Form / Discussion Template Schema:**
   - The design uses `validations: required: true` and `type: dropdown` for discussion templates (`q-a.yml`, `ideas.yml`). While GitHub does support YAML templates for Discussions, are we 100% certain it supports all the same advanced form elements (like dropdowns and checkboxes) as Issue Forms? (GitHub documentation indicates it does support the same `body` schema, but it's highly recommended to double-check this during the live draft test in PR 2).
   
2. **Ops Coordination for PR 3 (Seed Issues):**
   - Seeding 8-12 GFI issues with specific mentors requires coordination. Will one maintainer create all these issues, or will they be delegated? It might be useful to track this effort in the PR 3 description with a checklist of the newly created issue numbers to ensure they are all appropriately labeled and assigned.

3. **PR Template `Linked Discussion` Section:**
   - By adding `## Linked Discussion` as an optional section, is there a risk it gets ignored? Should it be coupled with a prompt like "If applicable, link the Discussion thread here to automatically close/update it upon merge"?
