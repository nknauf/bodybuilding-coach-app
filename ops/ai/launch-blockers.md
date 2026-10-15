# Launch blockers and release evidence

Owner: release conductor; independent verifier reviews evidence; business owner approves launch.
Reviewed: 2026-10-13. **Current verdict: not demonstrated ready for production launch.** This is not a claim that deployed services are failing.

| Gate | Current state | Required evidence / backlog |
|---|---|---|
| Reviewed release source | Unresolved root/nested copy and extensive pre-existing changes | Canonical root, intended commit/diff, no lost work (B01) |
| Executable quality baseline | Tests/build not run; local dependencies incomplete | Fresh lint/typecheck/unit/build and safe isolated DB results, exact commit/environment (B02) |
| Identity lifecycle | Rebinding behavior confirmed; policy/exploitability unresolved | Approved policy, regression coverage and security disposition (B03) |
| Tenant isolation | Scoped architecture present; boundary coverage incomplete | Two-coach/two-client actual-boundary matrix, status/reassignment tests (B04) |
| Day migration compatibility | SQL exists; applied state and rehearsal unknown | Backfill integrity, timing/locking, deployment order, compatible recovery drill (B05) |
| Repeatable release QA | No checked-in CI/browser E2E found | Automated gates plus manual desktop/mobile/accessibility evidence (B06) |
| Operational recovery | External settings/backups/alerts unverified | Approved-environment configuration check, restore and alert evidence (B07) |
| Security hardening | Invitation/media/error findings unresolved | B08-B10 resolved or named-owner time-bounded risk acceptance; no silent deferral |
| User-facing pilot readiness | Brand/demo docs inconsistent; policies not established | Approved copy, signup expectations, privacy/support/incident ownership (B11/B12) |
| Paid launch readiness | Payment/entitlement/budget model unchosen | Approved collection model, terms and unit economics; scoped billing tests if automated (B13) |

## Evidence record required for each release

Record commit, date, reviewer, environment class (never credentials), commands/scenarios, results, artifacts, known gaps, rollback/restore choice and approver. A test file's existence, historical README claim, or planned runbook is not a pass.

Use synthetic records and dedicated identities; do not casually enable `RUN_DATABASE_TESTS=1` against `.env.local`. Do not deploy/migrate/bootstrap/seed as part of evidence collection without the relevant explicit approval.

Separate **pilot**, **paid launch**, and **expansion** gates. Recurrence/chat/advanced analytics are not currently mandatory launch blockers. RLS absence is a documented architectural boundary—not proof of a breach or a mandated prelaunch rewrite. New organization/team tenancy requires its own design.

No risks have yet been formally accepted and no release has been approved by this documentation task.
