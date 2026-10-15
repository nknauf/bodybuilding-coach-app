# Product and launch roadmap

Owner: product/conductor. Reviewed: 2026-10-13. Status: user-approved roadmap basis for task organization, not a production launch commitment. Executable slices: [GitHub issue queue](issues/README.md).

## Product direction

Current implemented value: an invitation-based bodybuilding coaching loop—coach schedules, client performs/logs, coach reviews compliance and progress. Preserve separate coach/client experiences and server-side tenant isolation.

**Recommendation, not decision:** start with a controlled invitation-only pilot rather than immediately building self-service SaaS. Billing, recurring templates, chat and advanced analytics are not automatically MVP requirements. Pilot cohort size, success metrics, budget, date and paid/free status remain owner decisions (B13/B14).

| Phase | Scope (canonical backlog) | Exit evidence |
|---|---|---|
| 0. Establish baseline | B00 documentation; B01 root/change ownership | Documentation exists; intended release scope and nested-copy policy approved |
| 1. Prove core correctness | B02 safe test baseline; B03 identity; B04 tenant matrix; B05 day migration | Fresh reproducible results; approved auth policy; isolated migration/compatibility evidence |
| 2. Make releases repeatable | B06 CI/browser; B07 environments/restore/monitoring; B08-B10 hardening | Staging checks and recovery pass; security findings resolved or explicitly accepted |
| 3. Controlled pilot | B11 brand/demo; B12 privacy/support; manual role/mobile checks | Named cohort and acceptance metrics; operational owner sign-off; no unresolved unacceptable blockers |
| 4. Commercial launch | B13 pricing/budget/payment model; approved entitlement implementation if needed | Commercial/policy readiness and cost controls; no charging before approved flow |
| 5. Evidence-led expansion | B14 scoped feature discovery | Customer evidence and approved feature-level requirements |

## Top five next tasks

1. **B01:** establish canonical root and preserve/review the existing change set.
2. **B02:** make integration tests fail closed on unsafe targets and produce a trustworthy local baseline.
3. **B03:** decide and test identity-binding recovery; prevent unintended replacement under approved policy.
4. **B04:** verify tenant isolation through real service/action/API boundaries.
5. **B05:** rehearse ClientDay backfill, release compatibility and recovery on disposable data.

**First code implementation recommendation: T03 ([GitHub #9](https://github.com/nknauf/bodybuilding-coach-app/issues/9)), the fail-closed test-target slice of B02**, after T01's ownership/root check and required tooling approval. Safe verification infrastructure is a prerequisite for confidently fixing identity and tenant-sensitive behavior. Run planning and implementation sequentially; bounded parallel review is optional only when it offers a concrete advantage.

## Demo-first UI gate

Preserve the user-confirmed approach: prototype each UI feature in the isolated demo, collect desktop/mobile/keyboard evidence and explicit review, then promote only the approved slice to real coach/client experiences with persisted-workflow and tenant regression tests. T31/T32 cover the initial branding slice. Do not redesign authenticated workspaces first. Production-critical defects, tenant isolation, staging readiness and reproduced broken workflows precede cosmetic UI work.

No dates are promised without an executable baseline and approved scope. Launch authority remains with the business owner; [launch blockers](launch-blockers.md) governs readiness evidence.

## Execution update — 2026-10-14

T03 / #9 guard verification and T04 / #10 isolated fixtures are complete locally. See [T04 evidence](quality/T04-tenant-fixtures.md). The next task is T05 / #11, the reproducible quality baseline; broad release ownership (T01) remains open. This supersedes the initial first-implementation recommendation above, not the roadmap or launch gates. No deployment or production certification.

### T05 baseline update — 2026-10-14

[Baseline captured](quality/baseline.md): 205 tests, typecheck, scoped lint, network-isolated build and repeated tenant tests pass. Root lint fails on agent caches; [T42 / #49](issues/T42.md) is the next narrow fix. T05 stays open for the required ClientDay PostgreSQL check (missing local PostgreSQL/psql; Docker WSL unavailable). Do not bypass T05 for identity implementation or release approval.

### T42 lint follow-up — 2026-10-14

[T42 / #49](issues/T42.md) completed: narrow cache exclusions, 14 boundary regressions, passing root lint/typecheck and 219 passing tests. The next step is the remaining T05 disposable PostgreSQL/psql verification, not a new application feature. #11 and broader T01 ownership remain open.

### T05 completion — 2026-10-14

Approved temporary PostgreSQL tooling enabled the final ClientDay checks: 4/4 passed twice, schema cleanup and sentinel preservation confirmed, server stopped. Fresh lint/typecheck and 219 default tests pass. [Final evidence](quality/T05-clientday-postgres.md). This supersedes T05 blocked status above. Next: T06 / #12 identity-binding and recovery policy; T01 broad release ownership and production/staging gates remain open.
