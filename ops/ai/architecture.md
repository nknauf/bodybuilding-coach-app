# Current architecture

Owner: architecture/engineering. Reviewed: 2026-10-13. Status: source-observed baseline; runtime unverified.

## System map

Formlyst is the business name supplied by the owner. The current UI/metadata still use **More Sore**; renaming is proposed, not completed (B11).

The application is a Next.js App Router modular monolith with role-specific server-rendered routes, interactive React components, Server Actions, and API handlers.

```text
Browser / Clerk identity
  -> proxy and role-specific pages/actions/API routes
  -> database-backed actor resolution and authorization scopes
  -> Zod-validated transactional services
  -> Prisma with Neon adapter -> PostgreSQL

Media browser upload/download <-> private Cloudflare R2 signed URLs
Domain modules -> time, effective status, compliance, streaks, bodyweight
Public demo -> separate browser sessionStorage state
```

Declared stack (`package.json:24-64`): Next.js 16.3.0, React 19, TypeScript, Clerk 7, Prisma 7, Neon PostgreSQL adapter, Tailwind 4, Base UI/shadcn components, React Hook Form, Zod, Recharts, date-fns/date-fns-tz, AWS S3 SDK, Vitest. These are manifest declarations, not a freshness/security endorsement.

## Boundaries and source map

| Boundary | Existing implementation |
|---|---|
| Identity and entry | `src/proxy.ts`; `src/app/app/page.tsx`; `src/server/auth/current-user.ts`; Clerk webhook route |
| Role experiences | `src/app/admin/`, `src/app/coach/`, `src/app/client/`; legacy dashboard/onboarding redirect to `/app` |
| Mutations | `src/app/actions/` authenticates and delegates; `src/server/services/` validates and executes workflows |
| Authorization | `src/server/auth/authorization.ts`, `scopes.ts`; scoped ownership queries and role/status checks |
| Data | `prisma/schema.prisma`, reviewed SQL migrations, `src/server/db/client.ts`; pooled runtime connection, separate migration connection configuration |
| Domain rules | `src/server/domain/`; clock/timezone, event state, compliance, streak and bodyweight calculations |
| Media | `src/app/api/media/`, `src/server/services/media*.ts`, `r2.ts`; metadata in PostgreSQL, bytes in R2 |
| Demo | `src/app/demo/`, `src/demo/`, `src/components/demo/`; sessionStorage sample data, not persisted role impersonation |
| Audit | `src/server/audit/write-audit.ts` and transactional mutation audit records |

Representative mutation flow: `src/app/actions/coach.ts:21-38` -> `src/server/services/coach.ts:275-330`. Runtime Prisma singleton: `src/server/db/client.ts:11-25`.

## Existing product capabilities

- **Admin:** provision coaches, enable/disable, reassign clients, view counts/audit records.
- **Coach:** provision/invite clients, retry invites, manage client lifecycle, global/private exercise catalog, schedule/edit dated workouts, meals and supplements.
- **Client:** log assigned/extra sets, notes and finalization; complete nutrition/supplements; log bodyweight; reschedule eligible unfinished events once.
- **Shared:** calendars and day pages, compliance/streaks/weight reports, authorized private photo/video workflows.
- **Account mapping:** verified Clerk events and session recovery link pre-provisioned users; arbitrary signup does not assign a role.

Source anchors: `src/server/services/admin.ts:11`, `coach.ts:33`, `client.ts:22`, `client-calendar.ts:19`, `reports.ts:20`, `media.ts:79`.

## Data and tenant invariants

- Database roles are ADMIN, COACH, CLIENT. Each client has one optional assigned coach, not general organization membership (`prisma/schema.prisma:100-164`).
- Clerk proves identity; application user status, deletion state and profiles determine authorization. Preserve server-side checks even where pages/proxy already protect routes.
- Coach queries constrain ownership; client queries constrain the authenticated client's identity. Unknown and inaccessible IDs should not disclose foreign account details.
- Scheduled events have composite client/coach ownership constraints. Daily records have composite day/client constraints. These protect relational integrity, **not read isolation**.
- PostgreSQL RLS is not configured. Current isolation is application-scoped (`README.md:109-112`). Any RLS proposal requires an ADR, not an assumed rewrite.
- `ClientDay` anchors stable client/date membership. Completion on a later date does not move the original assignment; explicit rescheduling does. See `README.md:57-79`.
- Assigned sets drive workout compliance; extra sets do not inflate it. Overall weights are 50/35/15 normalized across assigned categories. Preserve current future-assignment treatment until a separate product decision changes it.

## Infrastructure and verification

- Runtime: Vercel/Next.js; database: Neon; identity: Clerk; private objects: R2.
- `vercel.json` contains no cron schedule. The protected reconciliation endpoint exists; effective status calculation also exists independently.
- `postinstall` generates Prisma; `build` does not apply migrations. Migration execution remains a distinct release operation.
- `20261006120000_client_days` backfills and requires day membership; older application writers become incompatible after migration. Applied deployment state is unknown (B05).
- 29 Vitest files were found; Node test environment, selected source/static-render UI tests, two opt-in database suites, and manual role/mobile walkthroughs. No checked-in CI or browser E2E framework was found.
- Root Next package/binaries and local framework guides were absent during assessment. Dependency installation and all runtime validation are pending (B02).

Deferred features include recurrence/templates, chat, exports and advanced analytics. Billing, entitlements, legal routes and a self-service commercial funnel were not found. See B12-B14; absence is not authorization to build them.
