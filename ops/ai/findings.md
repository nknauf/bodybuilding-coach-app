# Findings and discovered problems

Owner: engineering/security/QA. Reviewed: 2026-10-13. Status: static assessment, no runtime reproduction.

No cross-tenant exploit was demonstrated. Priority and resolution contracts live in [backlog](backlog.md); this register distinguishes facts from implications.

| ID | Classification | Finding and evidence | Disposition |
|---|---|---|---|
| F01 | Verified observation; release risk | Extensive pre-existing tracked changes and untracked day features; nested `bodybuilding-coach-app/` partial copy. Root `tsconfig.json:25-33` includes recursive TS sources and excludes only node_modules; nested code enters tooling scope. Ownership/intent unknown. | B01; preserve, do not delete/reset |
| F02 | Verified documentation/product inconsistencies | `src/app/layout.tsx:7-8` and `src/app/page.tsx:124` say More Sore, not owner-specified Formlyst. `docs/MANUAL_TESTING.md:108` denies demo routes while `src/app/demo/` and `src/demo/demo-provider.tsx:14-42` implement them. Demo role switching is sample-data-only, not observed production impersonation. | B11 |
| F03 | Verified code behavior; suspected security problem | `sync-clerk-identity.ts:44-55,74-111` can replace an existing non-null Clerk binding when an unknown incoming ID has the same verified email. Collision handling rejects only when both lookups return different rows. Exploitability depends on Clerk/email lifecycle and recovery policy. | B03; investigate, do not label confirmed takeover |
| F04 | Verified assurance gap | `tests/auth/tenant-scopes.test.ts:55-65` names workflows but repeats a scope helper; `tests/media/media-authorization.test.ts:35-72` similarly checks helpers. This does not establish actual boundary failures, but leaves route/service behavior insufficiently demonstrated. | B04, B06 |
| F05 | Verified unsafe test-target selection | `tests/integration/tenant-database.test.ts:7-16,34-55` loads `.env.local`, uses `DATABASE_URL`, and performs transactional writes. No dedicated disposable-target proof. The day suite separately requires a local target (`client-days-postgres.test.ts:7-16`). | B02; never run against an unknown target |
| F06 | Verified compatibility constraint; deployment unknown | `prisma/migrations/20261006120000_client_days/migration.sql:25-45` adds/backfills required day links; older writers cannot supply them (`README.md:72-77`). The migration and related files were untracked in the assessed working tree. | B05; coordinate release and restore strategy |
| F07 | Suspected policy inconsistency | Join landing enforces expiry (`src/app/join/[token]/page.tsx:14-23`); account synchronization activates matching invited users without a live-invite predicate (`sync-clerk-identity.ts:101-137`). Could be intended durable provisioning. | B08; choose semantics first |
| F08 | Verified hardening gap; proposed improvement | New invitation limit counts audit records non-atomically; retries lack an equivalent limit (`coach.ts:33-45,173-204`). No demonstrated abuse incident. | B08 |
| F09 | Verified hardening gap; proposed improvement | Per-file media limits exist but inspected path lacks aggregate quotas/cleanup (`media.ts:79-104`; `README.md:129-130`). Signed view links remain bearer-accessible until expiry, not immediately revoked by application access changes. | B09; define acceptable residual access |
| F10 | Suspected disclosure risk | `src/app/actions/state.ts:20-33` returns arbitrary short exception messages. Exposure depends on thrown messages; no secret disclosure reproduced. | B10 |
| F11 | Verified repository gaps; external state unknown | No checked-in CI/browser E2E, no cron schedule in `vercel.json`, no custom headers in `next.config.ts`. Hosting protections, backups, monitoring, vendor settings and migrations were not inspected. | B06, B07; absence locally does not prove absence in hosting |
| F12 | Verified capability/documentation gaps | No billing/entitlement models or legal routes found; no operational retention/incident/finance playbooks found before this task. Root README defers recurrence/chat/analytics/export work. | B12-B14; business decisions required |
| F13 | Verified observation; tooling unknown | Root Next package/binaries/guides absent; AI tool surfaces exist in `.codex`, `.agents`, `.claude`, `.windsurf`, plus nested copies. Some overlap may be intentional. | B01, B02; inventory rather than replacing tooling |

## Not established

Current passing test count, production uptime, dependency vulnerability status, installed schema, account security settings, object-store policies, actual vendor bills, market demand and applicable legal obligations are unknown. A checked-in test or runbook is not evidence it has been successfully executed.

## Updating findings

Attach a minimal reproduction or policy decision before changing a suspected problem to confirmed. Record the environment, commit, test result and independent verification when closing it. Preserve the distinction between a control implemented in code and an externally configured control verified in deployment.
