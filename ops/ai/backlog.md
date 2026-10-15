# Prioritized change backlog

Owner: conductor; per-item specialist indicated below. Reviewed: 2026-10-13.

The user has approved this roadmap as the planning basis and requested issue decomposition. B00 is complete; B01-B14 remain unresolved. Detailed execution slices and dependencies live in [the issue queue](issues/README.md). Issue creation is not implementation approval for policy-dependent, credential-gated, destructive or production actions. Paths are relative to repository root; `(new)` means a proposed artifact. Acceptance criteria define completion, not current behavior. No new package is pre-approved.

## B00 — Persist the project assessment
- **Priority/status/owner:** P0; completed documentation scope; conductor.
- **Affected files:** `ops/ai/{README,architecture,findings,backlog,roadmap,launch-blockers,business-operations,decisions}.md`.
- **Dependencies:** user's 2026-10-13 documentation request; prior static assessment.
- **Acceptance:** evidence labels, approved/proposed decisions, actionable backlog and launch gates; no application/configuration changes.
- **Tests:** local Markdown link/structure checks; verify content hashes outside `ops/ai/`; documentation review. Application tests not required for this docs-only change.
- **Production risk:** none directly; stale documentation can mislead. No deployment or commit implied.

## B01 — Establish canonical repository and reviewed baseline
- **Priority/owner:** P0; conductor/git-master.
- **Affected files:** nested `bodybuilding-coach-app/`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `.prettierignore`, `.codex/` and other tool surfaces (inventory first); `ops/ai/decisions.md`.
- **Dependencies:** identify ownership of pre-existing changes; approve any exclusion/removal separately. Preserve root `AGENTS.md`.
- **Acceptance:** canonical root and release commit scope recorded; nested copy disposition approved; duplicate tooling classified as intentional or stale; no unrelated edits lost.
- **Tests:** compare Git inventory and file preservation; after B02, confirm typecheck/lint target intended files.
- **Production risk:** medium if wrong tree is released or user work removed; begin read-only, no blanket cleanup/reset.

## B02 — Make test targeting safe and establish executable baseline
- **Priority/owner:** P0; test-engineer/executor.
- **Affected files:** `tests/integration/tenant-database.test.ts`, `tests/integration/client-days-postgres.test.ts`, `vitest.config.mts`, `package.json`, `.env.example`, `docs/MANUAL_TESTING.md`; new isolated fixture/helper only if needed.
- **Dependencies:** B01 target scope; explicit dependency-install approval; approved disposable database; available PostgreSQL/psql for day tests. Read installed Next guides before code edits.
- **Acceptance:** no implicit `.env.local`/runtime DB fallback for mutating tests; explicit test-only URL and fail-closed guard; reproducible fixtures; wrong/missing target rejected before connecting; document fresh lint/typecheck/unit/build/database results or exact blockers.
- **Tests:** guard tests for absent, malformed and disallowed targets; prove no connection attempt on rejection; isolated integration suites and cleanup; inspect fixture existence before negative assertions.
- **Production risk:** high if mis-targeted; use no production credentials and never run existing DB suite casually. Installation can run Prisma generation.

## B03 — Define and protect Clerk identity-binding recovery
- **Priority/owner:** P0; security architect/executor.
- **Affected files:** `src/server/auth/sync-clerk-identity.ts`, `current-user.ts`, `src/server/admin/link-clerk-user.ts` if recovery policy requires it; `tests/auth/{clerk-identity,current-user-recovery,production-account-flow}.test.ts`; `ops/ai/decisions.md`.
- **Dependencies:** B02 safe regression baseline; explicit policy distinguishing initial linking from replacement/recovery.
- **Acceptance:** mismatched existing non-null binding cannot silently transfer under default policy; approved recovery remains explicit/auditable; legitimate first link and repeat sync still work; unverified/archived/collision cases reject without mutation.
- **Tests:** unknown new Clerk ID + already-bound email, same binding idempotency, two-row collision, verified first link, disabled/deleted accounts, webhook/session parity and concurrency behavior.
- **Production risk:** high: overly strict behavior can lock out legitimate accounts; do not mass-rebind users or change deployed identities during implementation.

## B04 — Prove tenant isolation at actual boundaries
- **Priority/owner:** P0; test-engineer with independent security review.
- **Affected files:** `tests/auth/tenant-scopes.test.ts`, `tests/media/media-authorization.test.ts`, `tests/integration/`; relevant `src/app/actions/`, `src/app/api/media/`, `src/server/services/` only for reproduced fixes.
- **Dependencies:** B02; B03 identity policy; disposable two-coach/two-client fixtures.
- **Acceptance:** reads/writes deny foreign IDs across actual workflows; no foreign changes or disclosure; own-record success still works; reassignment removes prior coach access; status changes enforced; no reliance on helper tests alone.
- **Tests:** role × owner × active/disabled/archived matrix; nested set/workout/media IDs; calendar/day/report paths; guessed IDs; concurrent authorization/reassignment races.
- **Production risk:** high if changing scopes; preserve current tenant architecture and composite constraints. No blanket RLS rewrite.

## B05 — Rehearse ClientDay migration and compatible release
- **Priority/owner:** P0; architecture/infrastructure.
- **Affected files:** `prisma/migrations/20261006120000_client_days/migration.sql`, `prisma/schema.prisma` (review, not authorized mutation); `tests/integration/client-days-postgres.test.ts`; `src/server/services/{client-days,client-calendar,day-revalidation}.ts`; proposed `ops/ai/playbooks/deployment.md` and `rollback-and-restore.md`.
- **Dependencies:** B01/B02; known baseline schema; approved disposable representative dataset; B07 before any real deployment.
- **Acceptance:** existing rows/timestamps preserved; all day links owned correctly; timezone/DST/legacy media cases correct; locking/duration measured; compatible deployment order and recovery selected; no claim that old app rollback works after NOT NULL migration.
- **Tests:** migration replay, backfill/constraint checks, old/new writer compatibility, day rescheduling and display regressions, restore rehearsal in isolation.
- **Production risk:** high: locks, incompatible writers, invalid backfill. No production migration in this task or without release approval; do not edit already-applied historical migrations.

## B06 — Add reproducible CI and browser release checks
- **Priority/owner:** P1; test-engineer/verifier.
- **Affected files:** `.github/workflows/` (new if chosen provider), `package.json`, `vitest.config.mts`, browser test configuration/tests (new), `docs/MANUAL_TESTING.md`.
- **Dependencies:** B01-B04; chosen CI provider; approval before adding browser/coverage dependencies; isolated test accounts and data.
- **Acceptance:** PR checks run lint/typecheck/unit/build and isolated integration gates; browser tests exercise real coach/client/admin flows; desktop/mobile and keyboard checks documented; failed mandatory gates prevent release.
- **Tests:** deliberate failing-check trial; account onboarding, assignment/logging, tenant denial, media and day pages; no production secrets available to untrusted PRs.
- **Production risk:** medium: CI credential leakage, flaky gates, external account mutations. Keep fixtures/environment isolated.

## B07 — Establish deployment, observability and recovery operations
- **Priority/owner:** P1; infrastructure/verifier.
- **Affected files:** `vercel.json`, `next.config.ts`, `.env.example`, `prisma.config.ts` as justified; proposed `ops/ai/playbooks/{deployment,rollback-and-restore,incident-response}.md`, `ops/ai/vendor/service-inventory.md`.
- **Dependencies:** B01/B02; vendor ownership and separate approval for account inspection/configuration; B05 for day release.
- **Acceptance:** test/staging/production isolated; secret owners/rotation defined; Clerk webhooks and R2 privacy/CORS verified in approved environment; migration job explicit; restore drill, alerts and escalation owners recorded; decide cron need/cadence and security-header policy rather than enabling blindly.
- **Tests:** staged role/webhook/media smoke tests; restore drill; alert delivery; unauthorized cron rejection; header/CSP compatibility with Clerk/media; no secrets in logs/docs.
- **Production risk:** high for credentials, CORS, CSP, schedules and migrations; changes can block access or generate cost. No vendor access is currently approved.

## B08 — Resolve invitation expiry and abuse-control policy
- **Priority/owner:** P1; product/security/executor.
- **Affected files:** `src/app/join/[token]/page.tsx`, `src/server/auth/sync-clerk-identity.ts`, `src/server/services/coach.ts`, related auth/service tests; `ops/ai/decisions.md`.
- **Dependencies:** B02/B03; owner chooses durable provisioning versus expiring admission; no Redis dependency assumed.
- **Acceptance:** join and activation semantics agree with approved policy; retries and new invitations have consistent race-aware limits; legitimate retry path retains safe manual fallback.
- **Tests:** expired/revoked/pending/accepted invitations, direct signup/session recovery, repeat delivery, concurrent limit checks and limit reset.
- **Production risk:** medium/high: accidental lockouts or duplicate emails; external email tests use approved test identities only.

## B09 — Bound media cost and lifecycle exposure
- **Priority/owner:** P1; security/infrastructure.
- **Affected files:** `src/server/services/{media,media-policy,r2}.ts`, media routes/tests; proposed `ops/ai/security/data-lifecycle.md`; cleanup job/config only after design approval.
- **Dependencies:** B02/B04/B07; approved quotas/retention and signed-link residual-access policy; B12 privacy decision.
- **Acceptance:** quotas/rate limits defined and enforced; abandoned objects handled with a dry-run/reference-safe cleanup design; current private access retained; acceptable signed-URL expiry documented; no referenced object deleted by cleanup.
- **Tests:** quota boundaries/concurrency, interrupted upload, repeated finalize/delete, reassignment/disable with issued URLs, cleanup dry-run and reference protection.
- **Production risk:** high: irreversible photo/video loss and storage cost; destructive cleanup needs separate approval and recovery consideration.

## B10 — Bound user-facing error disclosure
- **Priority/owner:** P1; security/executor.
- **Affected files:** `src/app/actions/state.ts`, callers if needed; action error regression tests (new).
- **Dependencies:** B02; defined expected public validation/auth errors and safe logging policy.
- **Acceptance:** expected user errors stay useful; unexpected exceptions return generic feedback with safe correlation; internal messages/secrets are not sent to clients.
- **Tests:** short/long unexpected errors, simulated DB/vendor messages, known validation/authorization errors, no-sensitive-data logging assertions.
- **Production risk:** low/medium: obscured support diagnostics or broken form feedback; retain server-side actionable diagnostics without sensitive payloads.

## B11 — Reconcile Formlyst branding and demo documentation
- **Priority/owner:** P1 for inaccurate workflow documentation; P3 for cosmetic branding/UI; product/designer/writer.
- **Affected files:** `src/app/{layout,page}.tsx`, `src/app/join/[token]/page.tsx`, `src/components/{app-shell,demo/demo-shell}.tsx`, `src/demo/demo-provider.tsx` only if storage-key policy changes; `README.md`, `docs/MANUAL_TESTING.md`.
- **Dependencies:** B01; approved brand and public-demo policy. Preserve separate real/demo data boundaries. UI slices require demo prototype and explicit review before promotion (T31 -> T32); documentation correction T30 is separate.
- **Acceptance:** approved name consistent in metadata/navigation/invites/docs; public demo accurately described; invite-only signup expectations clear; existing demo storage not discarded unintentionally.
- **Tests:** brand/source checks, metadata and landing/demo browser review, persisted workspace unchanged, old demo-state behavior explicitly tested if key changes.
- **Production risk:** low/medium: broken links, SEO/copy drift or demo-state reset. No marketing publication/domain changes without approval.

## B12 — Establish privacy, support and incident policies
- **Priority/owner:** P1; business operations/security; business owner accountable.
- **Affected files:** proposed `ops/ai/security/data-lifecycle.md`, `ops/ai/playbooks/{incident-response,customer-onboarding,support}.md`; legal/consent routes and data-lifecycle implementation only after requirements approval.
- **Dependencies:** approved data inventory, jurisdictions/customer audience, qualified legal review as needed; B07 operational owners.
- **Acceptance:** retention/deletion/export/consent/support-access/audit retention decisions assigned; soft deletion distinguished from erasure; response/escalation targets and user communications approved; implementation gaps converted into scoped child tickets before development.
- **Tests:** tabletop incident and deletion-request walkthrough using synthetic records; legal/content review; any approved implementation requires tenant-negative and retention tests.
- **Production risk:** high for deletion and privacy promises; no legal compliance claim or automated erasure without review.

## B13 — Decide commercial model and operating budget
- **Priority/owner:** P2, required before paid launch; business owner with analyst/researcher.
- **Affected files:** proposed `ops/ai/finance/{assumptions.md,operating-model.csv}`, `ops/ai/marketing/{positioning,launch-plan}.md`, `ops/ai/decisions.md`; billing code/schema not yet scoped or approved.
- **Dependencies:** pilot versus self-service decision; current sourced vendor costs/customer evidence; B12 policies. Paid services/spend require explicit approval.
- **Acceptance:** pricing and payment collection model, entitlement rules, support load, cost limits and runway scenarios documented; assumptions separated from measured data; billing implementation gets a separate file-level design before approval.
- **Tests:** unit-economics arithmetic, sensitivity cases for client/storage/support growth, pricing/customer validation; no fabricated revenue or costs.
- **Production risk:** financial and customer-contract exposure; no charging, purchasing, bank access or public offer publication in planning.

## B14 — Prioritize post-pilot product expansion
- **Priority/owner:** P2; product analyst/designer.
- **Affected files:** `ops/ai/roadmap.md`, proposed `ops/ai/requirements/mvp.md` and research notes; implementation files TBD per approved feature.
- **Dependencies:** B04-B07 assurance, B11/B12 pilot readiness, actual pilot feedback; B13 if commercial entitlements affected.
- **Acceptance:** recurrence/templates, communication, exports and analytics ranked by customer value; explicit non-goals; each selected feature receives exact affected-file scope, dependencies, acceptance/tests and risk before implementation.
- **Tests:** requirements review and pilot evidence; later feature-specific regression/tenant tests. No feature is considered shipped from a roadmap entry.
- **Production risk:** scope growth, tenant leakage through new reports/exports and third-party data sharing; no automatic package or service adoption.
