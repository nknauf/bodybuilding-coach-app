# Decision and approval register

Owner: conductor; business owner approves scope/product/production decisions. Reviewed: 2026-10-13.

Only explicit user instructions are recorded as approved. Source-observed architecture is not retroactively presented as a business-approved ADR. No inferred authorization from agent plans or local runtime state.

| ID | Status | Decision / basis | Consequence |
|---|---|---|---|
| D01 | Approved constraint | User requires preservation of architecture, tenant isolation, existing AGENTS.md and configurations; initial assessment is read-only. | No redesign, schema or production action from assessment. |
| D02 | Approved and completed documentation scope | User's 2026-10-13 request authorizes permanent repository docs for architecture, bugs, backlog, roadmap, blockers, operations and decisions. | B00 adds documentation under existing `ops/ai/`; no application changes, installation, deployment or automatic commit. |
| D03 | Owner-specified identity; migration pending | User identifies business as Formlyst. Source still says More Sore. | Documentation uses Formlyst; application rename remains proposed B11, not completed. |
| D04 | Observed architecture, not new approval | Clerk identity + database roles + application scopes; composite ownership/day constraints; no RLS. | Preserve current model; RLS or organization tenancy would require a separate ADR. |
| D05 | Observed implementation | Public demo stores sample state separately; real workspaces use authenticated database records. | Do not call demo role switching production impersonation. Public demo policy/docs reconciliation remains B11. |
| D06 | Proposed | Prefer invitation-only controlled pilot before self-service commercialization. | Await business model/cohort/success criteria approval (B13/B14). |
| D07 | Proposed | Reuse existing OMX roles and `ops/ai/` as durable project context, not another orchestrator. | No role/config install authorized; responsibilities documented in business operations. |
| D08 | Open | Canonical root/nested partial copy and pre-existing work ownership. | B01 must resolve before cleanup or release scoping; nothing may be discarded by inference. |
| D09 | Open | Initial identity linking versus replacement/recovery; invitation expiry versus durable allowlist. | B03/B08 require explicit behavior decisions and regression tests. |
| D10 | Open | Day migration rollout and recovery strategy; live applied schema unknown. | B05/B07 require isolated rehearsal and separate production approval. |
| D11 | Open | Media quotas/retention, signed-link residual access, deletion/export/support privacy policy. | B09/B12 define requirements before destructive or customer-facing commitments. |
| D12 | Open | Pricing, payment collection, entitlements, launch budget/date and expansion priorities. | B13/B14 discovery only; no billing implementation or paid services approved. |
| D13 | Approved planning direction, 2026-10-13 | User identifies the existing roadmap as approved and requests small issue-based tasks; use GitHub when available; prioritize defects, isolation, staging and broken workflows over cosmetics. | B01-B14 decomposed into T01-T41; no new discovery pass or production deployment. Specific open policies remain open. |
| D14 | Approved UI workflow, 2026-10-13 | User confirms demo-first redesign; planning and implementation run sequentially unless bounded parallel work has a concrete advantage. | Demo prototype -> explicit review -> real-workspace promotion. T31/T32 embody this gate. |
| D15 | Approved reporting requirement, 2026-10-13 | After each completed task report changes, verification, remaining risks and next recommended task. | Required completion template in each issue and local queue; no task is done merely because its issue exists. |
| D16 | Approved bounded implementation, 2026-10-13 | User requests the first implementation. Active Git root matches the documented root; existing unrelated work stays user-controlled and untouched. | T03 test-target safety implemented locally. No package installation or production action inferred. Full-toolchain verification remains blocked; issue #9 stays open. |

| D17 | Approved follow-up | User requested finishing verification, continuing with #10, and explicitly approved minimal lockfile repair. | Restore missing transitive entries only; preserve existing locked versions and top-level dependencies. T03 verification supersedes D16's blocked status. |
| D18 | Implemented test design, not production policy | T04 uses unique fixture IDs, fixed dates and rollback-only interactive transactions. | No broad seed/delete cleanup; tests must use the supplied transaction client. Separate-connection/browser tests need a separately reviewed fixture design. |

## Completion record

- Prior conversation: source/configuration assessment completed; no runtime or production certification.
- 2026-10-13: documentation baseline B00 authored from that assessment. Technical implementation backlog remains open.
- Documentation validation: eight Markdown files; all 15 backlog entries contain the required planning fields; local document links and backlog references resolve. Independent read-only verifier review passed with no substantive issues.
- Preservation validation: content hashes of 40,007 pre-existing Git-listed tracked/unignored files outside `ops/ai/` were unchanged by the documentation work. This is file-preservation evidence, not application correctness evidence.
- Git inclusion: the new files are not ignored and are available for the normal repository review/commit workflow. They have not been staged or committed by this task; existing unrelated changes remain untouched.
- No security finding is recorded as fixed, no external configuration as verified, no launch as approved, and no risk as accepted.
- Subsequent task organization: GitHub access succeeded for the public project repository; 41 sanitized issues created and linked in `ops/ai/issues/README.md`. Task implementation remains pending. The local index and bodies are new uncommitted documentation, not proof that application work shipped.

## Future decision record format

For each decision record: ID/date; owner/approver; proposed/approved/rejected/superseded status; context and evidence; alternatives; selected outcome; affected backlog IDs/files; acceptance/test consequences; production risk; review trigger. Add separate ADR files only when detail warrants it and link them here. Preserve prior decisions when superseding them.

## Implementation follow-up — 2026-10-14

T03 / #9 verified and closed; T04 / #10 implemented with repeated isolated database verification. See [T04 evidence](quality/T04-tenant-fixtures.md). Added only four missing lock entries; structural comparison confirms all 945 pre-existing HEAD entries and root lock metadata unchanged. No application implementation, schema-file change, commit, push or production deployment. Earlier assessment/planning-only status above is historical; open product/policy decisions remain open.

## Temporary verification tooling approval — 2026-10-14

Owner explicitly approved downloading/extracting PostgreSQL into a temporary directory and running a disposable local database, with no system-wide installation, application dependency changes or production access. Executed with PostgreSQL 16.15; ClientDay tests passed twice, cleanup verified and server stopped. [Evidence](quality/T05-clientday-postgres.md). This closes T05’s local database prerequisite only; no production schema, identity policy, staging configuration or release approval is implied.

## T06 policy preparation — 2026-10-15

After Autopilot was blocked by its runtime question gate, the owner requested continuation of #12 with full execution permissions. Work continued as bounded policy/test preparation, not #13 runtime implementation or approval of identity-transfer tradeoffs. [Draft policy](requirements/T06-identity-policy.md) records recommendations and alternatives; replacement, initial-binding eligibility and disabled-write choices remain pending explicit answers. D09 remains open. No production access or runtime authentication changes.
