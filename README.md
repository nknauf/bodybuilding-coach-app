# Forge Coach

Forge Coach is a production-minded MVP for multi-tenant bodybuilding coaching.
Its vertical slice covers administrator coach provisioning, coach-owned clients,
dated workout/meal/supplement assignments, client logging, deterministic event
states, weighted compliance, bodyweight trends, and mutation audit records.

The application uses Next.js 16 App Router, strict TypeScript, React 19,
Tailwind CSS 4, shadcn/ui, Clerk, Prisma ORM 7 (the current generally available
release, not Prisma Next), Neon PostgreSQL, Zod, date-fns/date-fns-tz, Recharts,
Vitest, npm, and Vercel.

In simple terms, this is a working private-demo MVP rather than a blank
scaffold. The main admin, coach, and client workflows use real authentication
and database records, and the production build succeeds. The remaining work is
primarily deployment configuration and the product hardening listed below.

## What is implemented

- Clerk sign-in/sign-up, Next 16 `proxy.ts`, and verified Clerk webhook sync.
- Database-backed `ADMIN`, `COACH`, and `CLIENT` roles and account states.
- Admin coach provisioning, confirmed enable/disable controls, client
  reassignment management, platform counts, and an audit viewer.
- Coach client provisioning with Clerk email invitations and a secure manual
  link fallback, invitation status/retry controls, archive/deactivate/reactivate
  controls, a global/private exercise catalog, and an invitation throttle (20
  per coach/hour).
- A multi-exercise workout builder with ordering, multiple assigned sets, and
  dated workouts with assigned reps and exercise-name
  snapshots, set logging, skipped sets, visibly extra sets, partial saves,
  notes, and immutable finalized workouts.
- Dated meals with editable ingredient rows and optional expected/actual
  calories and macros; blank actuals mean expected values are assumed.
- Dated supplements with dosage, coach notes, and one-way completion.
- Client Monday-Sunday calendar with blue workout, green meal, and red
  supplement events; a client can securely move an unfinished event once.
- Pure effective-state derivation (`SCHEDULED`, `COMPLETED`, `OVERDUE`,
  `MISSED`) plus an idempotent Vercel Cron-compatible reconciliation endpoint.
- Daily, weekly, 30-day, and 90-day compliance views. Workout compliance is
  completed assigned sets / expected assigned sets; extra sets never increase
  it. Overall compliance uses 50/35/15 weights normalized across only assigned
  categories.
- Daily, weekly, workout, meal, and overall streak calculations surfaced in
  client and coach progress views.
- Multiple bodyweight entries per day, client-local daily selection (marked
  morning entry, otherwise earliest), 7/30/90/365-day charts, latest value, and
  rate-of-change domain calculation.
- Transactional audit logging for important mutations.
- Seeded cross-tenant demo data and direct negative authorization tests.

Compliance includes every assignment inside the selected period, including
future scheduled events in that period. An entirely unassigned category is
`not applicable`, not 0%, and the overall weights are renormalized.

## Architecture

```text
prisma/
  schema.prisma       normalized model and ownership paths
  migrations/         reviewed PostgreSQL migration and database constraints
  seed.ts             deterministic, idempotent demo data
src/app/
  admin|coach|client  role-specific Server Component routes
  actions/            validated, re-authorized Server Actions
  api/                Clerk webhook and protected cron route
src/server/
  auth/               current actor, role guards, tenant scopes
  audit/              transaction-scoped audit writer
  db/                 Neon-adapted Prisma singleton
  domain/             pure clock, status, compliance, streak, time, weight logic
  services/           transactional application workflows and reports
  validation/         bounded Zod inputs
tests/
  auth/               role/status/cross-tenant negative tests
  domain/             table-driven compliance, DST, status, streak, weight tests
```

Authorization is enforced in the service/data-access layer on every operation.
Clerk proves identity only. The application user row supplies role, status,
soft-deletion state, coach profile, and client profile. Coach reads and
mutations include the authenticated coach profile in their Prisma filter;
unknown and cross-tenant IDs both produce the same safe not-found result.

This MVP does **not** enable PostgreSQL row-level security, so it does not claim
RLS or database-level tenant isolation. It uses centralized Prisma scopes plus
foreign keys, a composite `(clientId, coachId)` foreign key on scheduled events,
unique constraints, checks, and indexes to reduce ownership mistakes.

## Prerequisites

- Node.js 20.19+, 22.12+, or 24+
- npm
- A Neon PostgreSQL project/branch
- A Clerk application
- A Vercel account for deployment

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in:

   - `DATABASE_URL`: Neon pooled runtime URL (hostname usually contains
     `-pooler`).
   - `DIRECT_URL`: Neon direct URL for Prisma Migrate.
   - Clerk publishable and secret keys.
   - `CLERK_WEBHOOK_SECRET` when testing webhook sync.
   - a random `CRON_SECRET` of at least 16 characters to test reconciliation.

   Future R2, Stream, PostHog, and Upstash variables may remain blank.

3. Generate Prisma Client and apply the checked-in migrations:

   ```bash
   npm run db:generate
   npm run db:migrate:deploy
   ```

   Use `npm run db:migrate -- --name DESCRIPTION` only while developing a new
   schema change. Do not use `prisma db push` as the normal migration workflow.

4. Choose one initial-user workflow:

   - For a clean setup, bootstrap only the first administrator:

   ```bash
   npm run db:bootstrap-admin -- --email you@example.com --first-name Your --last-name Name --timezone America/New_York
   ```

   - For local sample data, run `npm run db:seed` instead. The demo seed is
     idempotent but creates five sample users and associated coaching records.

   Bootstrap is idempotent for an existing, non-deleted administrator. It
   refuses to overwrite a coach/client account or revive a deleted user.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

On Windows PowerShell systems where script execution blocks `npm.ps1`, use
`npm.cmd` in place of `npm` without changing the machine execution policy.

## Clerk setup and user mapping

Configure these Clerk paths:

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in/sign-up fallback: `/app`

Create a Clerk webhook pointing to:

```text
https://YOUR_DOMAIN/api/webhooks/clerk
```

Subscribe to `user.created`, `user.updated`, and `user.deleted`, then put its
signing secret in `CLERK_WEBHOOK_SECRET`.

Neither bootstrap nor the database seed can fabricate authenticated Clerk
accounts. Bootstrap provisions the supplied admin email with no `clerkUserId`.
Sign up in Clerk with that exact email; the webhook attaches the Clerk ID and
activates the account.

The optional demo seed provisions these application users:

| Role     | Email                       |
| -------- | --------------------------- |
| Admin    | `admin@example.test`        |
| Coach A  | `coach.alex@example.test`   |
| Coach B  | `coach.blair@example.test`  |
| Client A | `client.casey@example.test` |
| Client B | `client.drew@example.test`  |

In Clerk development, create a user with one of those exact emails. Delivery of
the `user.created` webhook attaches the Clerk ID to the pre-provisioned row and
activates invitations. The webhook deliberately does not create a database user
for an arbitrary public signup, so a user can never self-select a role.

For local webhook delivery, expose the local server with a trusted HTTPS tunnel
and use its `/api/webhooks/clerk` URL in Clerk. Replaying an authentic
`user.updated` event is a safe way to re-run mapping.

## Quality commands

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run db:generate
npm run db:migrate
npm run db:bootstrap-admin -- --email you@example.com --first-name Your --last-name Name --timezone America/New_York
npm run db:seed
npm run db:studio
```

Tests use fixed timestamps and explicit IANA zones, including a US DST
transition. Database-independent domain and authorization tests run without
credentials.

To also verify Coach A/Coach B isolation and the composite tenant foreign key
against the configured Neon development branch:

```bash
# PowerShell
$env:RUN_DATABASE_TESTS="1"; npm test
```

## Vercel deployment

The checked-in Vercel configuration intentionally has no Cron schedule so a
basic deployment works on the Hobby plan. The protected reconciliation route
remains available for a later daily Hobby schedule or hourly Pro schedule.

1. Push the intended commit to a Git provider, import the repository from
   Vercel's **New Project** screen, and keep the detected Next.js settings and
   repository root.
2. In Vercel **Settings > Environment Variables**, add all required values from
   `.env.example` to Preview and Production.
   Never expose database, Clerk secret, cron, or service secrets with a
   `NEXT_PUBLIC_` prefix.
3. Set `DATABASE_URL` to Neon's pooled production URL and `DIRECT_URL` to the
   direct production URL. Add the Clerk keys and four Clerk path/redirect
   values. Initially omit the deferred services, `CLERK_WEBHOOK_SECRET`, and
   `CRON_SECRET`.
4. Before promoting the application, apply reviewed migrations from a trusted
   CI/deployment job:

   ```bash
   npm ci
   npm run db:generate
   npm run db:migrate:deploy
   npm run db:bootstrap-admin -- --email you@example.com --first-name Your --last-name Name --timezone America/New_York
   ```

   Skip `db:seed` when you want only the bootstrapped administrator. Running
   bootstrap against a database with demo data preserves the existing records.

5. Deploy to obtain the stable `https://YOUR_PROJECT.vercel.app` URL. Add it as
   `APP_URL` in Preview and Production, then redeploy.
6. In Clerk, add
   `https://YOUR_PROJECT.vercel.app/api/webhooks/clerk` as a webhook, subscribe
   to `user.created`, `user.updated`, and `user.deleted`, and put its signing
   secret in Vercel as `CLERK_WEBHOOK_SECRET`. Redeploy once more.
7. Sign up with the exact bootstrapped email and confirm `/app` redirects to
   `/admin`. Then smoke-test admin coach creation, coach client invitation,
   client registration, scheduling, and client logging.
8. Inspect Vercel build/function logs. With cron disabled, leave `CRON_SECRET`
   unset and confirm `/api/cron/events` returns 404.

To enable reconciliation later, set a random `CRON_SECRET` of at least 16
characters and add a Vercel Cron entry for `/api/cron/events`. Hobby supports a
once-daily schedule; an hourly schedule requires Vercel Pro.

Never run `prisma migrate reset`, a destructive migration, or `db push` against
production. Back up the database and review generated SQL before deploy.

## Known limitations and deferred boundaries

- Clerk invitation email requires a configured Clerk secret key and enabled
  delivery. When unavailable, the coach must copy the one-time manual link shown
  after creation or regeneration. The client must still sign up with the exact
  pre-provisioned email.
- Scheduling creates dated assignments rather than reusable templates or a full
  recurrence editor.
- Compliance range selection uses the implemented day/week/30/90-day options;
  it is not an arbitrary date-picker report.
- No PostgreSQL RLS is configured. Isolation is application-scoped as described
  above.
- R2 photos, Stream Chat, PostHog, Upstash Redis, production email delivery,
  admin impersonation, exports, advanced analytics, recurrence editing,
  background-job infrastructure, drag-and-drop, and advanced exercise analytics
  are deferred. Their environment variables are inert.
- The application is pinned to patched stable Next.js 16.3.0. The production
  dependency audit is expected to remain clear; rerun it during deployment.
