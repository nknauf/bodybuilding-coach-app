# Formlyst implementation issue queue

Updated: 2026-10-14. T03 / #9 is verified and closed. T04 / #10 is verified and closed; see [fixture evidence](../quality/T04-tenant-fixtures.md). T42 / #49 and T05 / #11 are verified complete; other tasks remain open.

GitHub access and issue creation succeeded. These files are issue-body snapshots; GitHub is the live status/discussion surface. Preserve stable T IDs when syncing changes. Subsequent T03 work changed test infrastructure only; no application runtime implementation or deployment occurred.

## Execution rules

- Reuse the existing architecture, findings and B01-B14 roadmap; this is decomposition, not a new discovery pass.
- P0: production-critical correctness/tenant assurance and safe verification. P1: broken-workflow/staging/operational readiness. P2: conditional commercial/expansion planning. P3: cosmetic UI.
- Execute one bounded task at a time by default. Dependencies block implementation, not discussion. Do not bypass policy, installation, credential or destructive-operation approvals.
- Validate the specific code path when implementing; do not repeat whole-repository discovery.
- A reproduced broken workflow precedes cosmetics: create a minimal reproduction issue and assign P0/P1 by impact. Unverified workflows are not confirmed defects.
- UI features follow demo prototype -> explicit review -> authenticated-workspace promotion with regression/tenant tests. T31/T32 illustrate the gate; later UI features need equivalent slices.
- Every completed task needs the completion report below, evidence attached, and synchronized GitHub/local status. Creating an issue is not completing it.
- No production deployment. Public issues omit exploit narratives, secrets and customer data; sensitive reproduction evidence belongs in an approved private channel.

## Next implementation recommendation

**[T06 / #12](https://github.com/nknauf/bodybuilding-coach-app/issues/12) — specify account identity-binding and recovery invariants.** Draft policy and synthetic tests are prepared; [owner choices remain pending](../requirements/T06-identity-policy.md). Do not begin #13 until #12 is approved and finalized. T05 is complete: root lint/typecheck, 219 default tests, isolated production build and both guarded database suites have passing evidence. [ClientDay final evidence](../quality/T05-clientday-postgres.md) includes real PostgreSQL concurrency and cleanup checks.

Sequence: T06 policy/owner approval -> T07 implementation -> tenant-boundary tasks. T01 broader release ownership remains open. Local verification does not authorize production deployment or policy changes.

## Tasks (dependency-respecting priority order)

| Task | Priority | Parent | GitHub | Dependencies |
|---|---|---|---|---|
| [T01 — Confirm canonical project root and preserve the release baseline](T01.md) | P0 | B01 | [#8](https://github.com/nknauf/bodybuilding-coach-app/issues/8) | None |
| [T03 — Fail closed before database tests can connect to an unsafe target](T03.md) | P0 | B02 | [#9](https://github.com/nknauf/bodybuilding-coach-app/issues/9) | [T01](T01.md) |
| [T04 — Provide deterministic isolated tenant fixtures and cleanup](T04.md) | P0 | B02 | [#10](https://github.com/nknauf/bodybuilding-coach-app/issues/10) | [T03](T03.md) |
| [T42 — Keep agent runtime caches out of the application lint gate](T42.md) | P1 | B02 | [#49](https://github.com/nknauf/bodybuilding-coach-app/issues/49) | T05 evidence; T01 broader ownership |
| [T05 — Record a reproducible local quality baseline](T05.md) | P0 | B02 | [#11](https://github.com/nknauf/bodybuilding-coach-app/issues/11) | [T01](T01.md), [T03](T03.md), [T04](T04.md) |
| [T06 — Specify account identity binding and recovery invariants](T06.md) | P0 | B03 | [#12](https://github.com/nknauf/bodybuilding-coach-app/issues/12) | [T03](T03.md) |
| [T07 — Enforce approved identity-binding invariants](T07.md) | P0 | B03 | [#13](https://github.com/nknauf/bodybuilding-coach-app/issues/13) | [T06](T06.md), [T05](T05.md) |
| [T08 — Test coach scheduling and editing authorization boundaries](T08.md) | P0 | B04 | [#14](https://github.com/nknauf/bodybuilding-coach-app/issues/14) | [T04](T04.md), [T07](T07.md) |
| [T09 — Test calendar, day and report tenant read boundaries](T09.md) | P0 | B04 | [#15](https://github.com/nknauf/bodybuilding-coach-app/issues/15) | [T04](T04.md), [T07](T07.md) |
| [T10 — Test private-media authorization across the full request lifecycle](T10.md) | P0 | B04 | [#16](https://github.com/nknauf/bodybuilding-coach-app/issues/16) | [T04](T04.md), [T07](T07.md) |
| [T12 — Rehearse ClientDay backfill with representative edge cases](T12.md) | P0 | B05 | [#17](https://github.com/nknauf/bodybuilding-coach-app/issues/17) | [T04](T04.md), [T05](T05.md) |
| [T13 — Document and test compatible day-release recovery](T13.md) | P0 | B05 | [#18](https://github.com/nknauf/bodybuilding-coach-app/issues/18) | [T12](T12.md) |
| [T39 — Test client workout logging and finalization authorization](T39.md) | P0 | B04 | [#19](https://github.com/nknauf/bodybuilding-coach-app/issues/19) | [T04](T04.md), [T07](T07.md) |
| [T40 — Test meal and supplement completion authorization](T40.md) | P0 | B04 | [#20](https://github.com/nknauf/bodybuilding-coach-app/issues/20) | [T04](T04.md), [T07](T07.md) |
| [T41 — Test one-time rescheduling and day membership authorization](T41.md) | P0 | B04 | [#21](https://github.com/nknauf/bodybuilding-coach-app/issues/21) | [T04](T04.md), [T07](T07.md) |
| [T11 — Test disabled, archived and reassigned account boundaries](T11.md) | P0 | B04 | [#22](https://github.com/nknauf/bodybuilding-coach-app/issues/22) | [T08](T08.md), [T09](T09.md), [T10](T10.md), [T39](T39.md), [T40](T40.md), [T41](T41.md) |
| [T02 — Resolve nested source and duplicated tooling scope](T02.md) | P1 | B01 | [#23](https://github.com/nknauf/bodybuilding-coach-app/issues/23) | [T01](T01.md) |
| [T14 — Add isolated mandatory CI quality checks](T14.md) | P1 | B06 | [#24](https://github.com/nknauf/bodybuilding-coach-app/issues/24) | [T02](T02.md), [T05](T05.md) |
| [T15 — Add browser smoke tests for existing critical workflows](T15.md) | P1 | B06 | [#25](https://github.com/nknauf/bodybuilding-coach-app/issues/25) | [T05](T05.md), [T07](T07.md), [T08](T08.md), [T09](T09.md), [T39](T39.md), [T40](T40.md), [T41](T41.md) |
| [T16 — Define and verify non-production environment boundaries](T16.md) | P1 | B07 | [#26](https://github.com/nknauf/bodybuilding-coach-app/issues/26) | [T01](T01.md), [T03](T03.md) |
| [T18 — Verify staging private-media configuration](T18.md) | P1 | B07 | [#27](https://github.com/nknauf/bodybuilding-coach-app/issues/27) | [T16](T16.md), [T10](T10.md) |
| [T19 — Rehearse staging backup restoration](T19.md) | P1 | B07 | [#28](https://github.com/nknauf/bodybuilding-coach-app/issues/28) | [T16](T16.md), [T13](T13.md) |
| [T20 — Define staging monitoring and rehearse alert response](T20.md) | P1 | B07 | [#29](https://github.com/nknauf/bodybuilding-coach-app/issues/29) | [T16](T16.md) |
| [T21 — Decide event reconciliation scheduling and validate protection](T21.md) | P1 | B07 | [#30](https://github.com/nknauf/bodybuilding-coach-app/issues/30) | [T16](T16.md), [T05](T05.md) |
| [T22 — Validate security-header policy in staging](T22.md) | P1 | B07 | [#31](https://github.com/nknauf/bodybuilding-coach-app/issues/31) | [T16](T16.md), [T18](T18.md), [T15](T15.md) |
| [T23 — Decide invitation expiry versus durable provisioning semantics](T23.md) | P1 | B08 | [#32](https://github.com/nknauf/bodybuilding-coach-app/issues/32) | [T06](T06.md) |
| [T24 — Align invitation activation with the approved lifecycle](T24.md) | P1 | B08 | [#33](https://github.com/nknauf/bodybuilding-coach-app/issues/33) | [T23](T23.md), [T07](T07.md) |
| [T17 — Verify staging identity, invitations and account lifecycle](T17.md) | P1 | B07 | [#34](https://github.com/nknauf/bodybuilding-coach-app/issues/34) | [T16](T16.md), [T07](T07.md), [T24](T24.md) |
| [T25 — Make invitation creation and retry throttling consistent](T25.md) | P1 | B08 | [#35](https://github.com/nknauf/bodybuilding-coach-app/issues/35) | [T05](T05.md), [T24](T24.md) |
| [T29 — Sanitize unexpected Server Action errors](T29.md) | P1 | B10 | [#36](https://github.com/nknauf/bodybuilding-coach-app/issues/36) | [T05](T05.md) |
| [T30 — Correct demo and invitation-only documentation](T30.md) | P1 | B11 | [#37](https://github.com/nknauf/bodybuilding-coach-app/issues/37) | [T01](T01.md) |
| [T33 — Approve data retention, deletion and support-access requirements](T33.md) | P1 | B12 | [#38](https://github.com/nknauf/bodybuilding-coach-app/issues/38) | [T16](T16.md) |
| [T26 — Define and enforce per-client media budgets](T26.md) | P1 | B09 | [#39](https://github.com/nknauf/bodybuilding-coach-app/issues/39) | [T10](T10.md), [T16](T16.md), [T33](T33.md) |
| [T27 — Decide and test residual signed-media access](T27.md) | P1 | B09 | [#40](https://github.com/nknauf/bodybuilding-coach-app/issues/40) | [T10](T10.md), [T33](T33.md) |
| [T28 — Build reference-safe orphan-media cleanup in dry-run mode](T28.md) | P1 | B09 | [#41](https://github.com/nknauf/bodybuilding-coach-app/issues/41) | [T18](T18.md), [T33](T33.md) |
| [T34 — Write onboarding/support playbooks and run an incident tabletop](T34.md) | P1 | B12 | [#42](https://github.com/nknauf/bodybuilding-coach-app/issues/42) | [T20](T20.md), [T23](T23.md), [T33](T33.md) |
| [T35 — Build a sourced operating-cost and sensitivity model](T35.md) | P2 | B13 | [#43](https://github.com/nknauf/bodybuilding-coach-app/issues/43) | [T16](T16.md) |
| [T36 — Decide pilot pricing, payment collection and entitlement scope](T36.md) | P2 | B13 | [#44](https://github.com/nknauf/bodybuilding-coach-app/issues/44) | [T35](T35.md), [T33](T33.md) |
| [T37 — Prepare accurate Formlyst pilot positioning and launch checklist](T37.md) | P2 | B13 | [#45](https://github.com/nknauf/bodybuilding-coach-app/issues/45) | [T30](T30.md), [T34](T34.md), [T36](T36.md) |
| [T38 — Convert pilot feedback into demo-first feature slices](T38.md) | P2 | B14 | [#46](https://github.com/nknauf/bodybuilding-coach-app/issues/46) | [T34](T34.md), [T37](T37.md) |
| [T31 — Prototype Formlyst branding and approved UI changes in demo first](T31.md) | P3 | B11 | [#47](https://github.com/nknauf/bodybuilding-coach-app/issues/47) | [T30](T30.md), [T15](T15.md) |
| [T32 — Promote the approved demo branding slice to real workspaces](T32.md) | P3 | B11 | [#48](https://github.com/nknauf/bodybuilding-coach-app/issues/48) | [T31](T31.md), [T08](T08.md), [T09](T09.md), [T10](T10.md), [T15](T15.md) |

## Parent coverage

B00 documentation remains complete. Every unresolved parent maps to slices below; one completed slice does not automatically close its parent. Policy-dependent follow-up implementation must be scoped as a new issue, not silently added to a decision-only task.

- **B01:** [T01](T01.md), [T02](T02.md)
- **B02:** [T03](T03.md), [T04](T04.md), [T05](T05.md), [T42](T42.md)
- **B03:** [T06](T06.md), [T07](T07.md)
- **B04:** [T08](T08.md), [T09](T09.md), [T10](T10.md), [T39](T39.md), [T40](T40.md), [T41](T41.md), [T11](T11.md)
- **B05:** [T12](T12.md), [T13](T13.md)
- **B06:** [T14](T14.md), [T15](T15.md)
- **B07:** [T16](T16.md), [T18](T18.md), [T19](T19.md), [T20](T20.md), [T21](T21.md), [T22](T22.md), [T17](T17.md)
- **B08:** [T23](T23.md), [T24](T24.md), [T25](T25.md)
- **B09:** [T26](T26.md), [T27](T27.md), [T28](T28.md)
- **B10:** [T29](T29.md)
- **B11:** [T30](T30.md), [T31](T31.md), [T32](T32.md)
- **B12:** [T33](T33.md), [T34](T34.md)
- **B13:** [T35](T35.md), [T36](T36.md), [T37](T37.md)
- **B14:** [T38](T38.md)

## Completion report template

```text
Task: Txx / #issue — Done or Blocked
Changes: bounded file/behavior summary
Verification: exact checks, revision/environment, results and evidence links
Remaining risks: unresolved gaps or explicit accepted risk (owner/date)
Next recommended task: Txx / #issue, with dependency readiness
Production deployment: none
```

## Planning verification

- 41 issue-creation receipts succeeded; IDs/URLs are persisted in github-map.json.
- Each task contains scope, dependencies, likely files, acceptance, tests, risk and definition of done.
- Validation passed: all 41 contracts have required fields; all 14 unresolved parents are covered; the dependency graph is acyclic; local Markdown links and whitespace checks pass.
- Preservation check passed: 209 application/configuration files, including AGENTS.md, match the pre-task content baseline. No application tests were run for this planning-only task.
- GitHub issues #9 and #48 were read back successfully to verify the first implementation contract and demo-promotion dependency gate; all 41 creations have successful receipts.
- Local snapshots are repository-visible; no application staging/commit/push performed.
