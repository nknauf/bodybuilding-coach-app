# Reviewed delivery: Astra plans/reviews, Luna implements

This runbook governs the candidate, not unrelated working-tree changes. It does not
replace account permissions, human approvals, or the repository's AGENTS.md.

## Roles and authority

1. Astra writes a task packet using `ops/ai/templates/task-packet.md`.
2. Luna implements bounded changes and tests. New architecture or two failed
   attempts at the same unresolved failure return to Astra with a reproduction.
3. In an actual Astra session, invoke `$code-review`: independent code-reviewer
   and architect lanes inspect the same base/candidate diff and evidence. Neither
   lane authors the code it approves. Missing lanes block approval. A prompt label
   is not proof of model identity; select the model in the runtime.
4. Luna fixes findings; Astra reviewers validate the changed candidate. Both lanes
   must approve/clear, with no unresolved blocker, before a normal ready PR.
5. Agents may push scoped feature branches and create PRs. The owner `nknauf`
   approves merges, production operations, and traffic promotion separately. AI
   reports never impersonate human GitHub approvals.

## Source and branch discipline

Inventory `git status --short`, staged/unstaged diffs, untracked files and remote
refs. Never `git add .`, reset, force-push protected branches, or silently stash
someone else's work. Stage reviewed paths/hunks and inspect `git diff --cached`.
Never include `.env`, tokens, browser sessions, local logs or generated output.

Use dedicated branches/worktrees based on a known full SHA. Partition the current
backlog into dependent PRs: (1) root tooling/security/delivery controls,
(2) identity/tenant boundaries, (3) database/domain migrations and coupled code,
(4) UI/features, (5) documentation. Astra must inspect actual dependencies before
finalizing the stack; never publish broken intermediate migration/type states.
This is an inventory order, not permission to stage all changes in those folders.

## Local checks

Use Node from `.nvmrc` and npm from `packageManager`. Install once per worktree.
Run targeted tests during editing, then on a stable candidate:

```bash
npm ci
npm run format:check:delivery
npm run lint
npm run typecheck
npm test
npm run security:audit
# Build/start only with approved inert test placeholders or isolated test services.
npm run build
npx --no-install playwright install chromium
npm run test:e2e
```

Build placeholders are in `.github/workflows/quality.yml`; do not copy production
credentials. Build and typegen share `.next` and must be sequential. Formatting
currently gates delivery-owned files; existing application-wide formatting debt
is not silently rewritten. `npm run format:check` remains the full-tree command.
The full offline suite intentionally skips guarded service tests; skipped tests
are never evidence that database or authenticated workflows passed.

## Hosted checks and exact source identity

Required candidate checks after the workflow is proven:

- `Quality checks`: delivery formatting, lint, typecheck, offline tests.
- `Production build`: clean build with inert placeholders.
- `Dependency policy`: full and production npm audits with the narrow exception.

Public browser smoke is a separate manually-dispatched staging workflow, not a PR
required check: staging is not provisioned yet. It only covers the fictional
public demo, not authenticated persistence or tenant safety. Configure the exact
host and protect the staging environment before running it.

`Day database checks` is a future database-batch gate, not included in this foundations candidate: it depends
on the existing uncommitted day tests, target guard, and ClientDay migration. Publish
and review those together in the database PR, prove the hosted run, then enable it
on PRs and require it. `verify:github --merged` already requires its exact-SHA
evidence, so release remains blocked without it. The tooling PR must not claim
this dependent lane passed.

`Dependency policy` also runs daily and manually. `npm run security:audit` fails
closed on retrieval/schema errors, production findings, new advisories, changed
exception paths or expired approvals. The exception is only the reviewed braces
advisory, approved by the owner for 14 days; inspect `security/audit-exceptions.json`
for exact UTC dates. Never auto-renew or add broad package/severity bypasses.
A clean audit no longer needs the exception. Production findings remain blocked.

PR jobs explicitly checkout and assert the PR head SHA; these checks do not test
the synthetic merge tree. Push and dispatch jobs use their event SHA. Merge-group
runs separately validate the merge-group integration SHA. Record these identities
separately and verify each intended SHA:

```bash
npm run verify:github -- FULL_SHA
npm run verify:github -- MERGED_MAIN_SHA --merged
```

This read-only command queries live GitHub check runs, paginates, rejects skipped/
stale/wrong-SHA evidence and unexpected check producers, and uses the latest run
for each required name. It is evidence collection, NOT release authorization.
Run a fresh security audit before approval: daily expiry can invalidate yesterday's
successful PR check. Missing authenticated preview/Neon tenant evidence is still a
release blocker regardless of this command's result.

Monitor the specific PR with GitHub APIs or authenticated `gh pr checks`; inspect
failed-run logs before retrying. Code changes require new evidence and affected
review. Do not close an issue merely because local tests pass.

## Repository protection bootstrap

Read live rulesets, repository visibility, Actions permissions, account capability
and existing Vercel integration before making settings changes. Require PRs,
up-to-date source and the exact check names from GitHub Actions. Minimize bypass.
Invalidate stale reviews. A sole PR author cannot supply an independent human PR
approval: configure an achievable owner-controlled merge policy, not a fictitious
second reviewer. Changes to protections require owner authorization.

Prove enforcement with a disposable failing PR; it must be blocked, never merged.
Confirm required-check source is GitHub Actions rather than a similarly named
third-party status. No `pull_request_target`/privileged artifact execution is used.
Untrusted CI receives no staging or production secrets. Public demo CI has only
inert placeholders. No workflow in this change deploys or mutates provider settings.

Before **any merge to the production-tracked branch**, inventory Vercel automatic
deployment/promotion and pending runs. Obtain owner authorization to disable
automatic production traffic promotion and verify it is disabled. If this cannot
be established, merge is blocked: a merge itself could otherwise deploy before
the later approval gate. Do not treat a GitHub environment gate as protection
against an independent Vercel integration.

## Staging and authenticated tests: blocked until provisioned

Read-only inventory first: separate Vercel, Clerk, Neon and R2 environments,
credential scope, preview access protection, synthetic test accounts and approved
costs. Do not create billable resources or use customer data without approval.
Follow `docs/browser-verification.md`. Existing day tests use disposable local
PostgreSQL; Neon-adapter tenant tests need a separately approved compatible target.
The future database batch must include a guarded runner that fails when its explicit disposable target is absent rather
than turning skipped tests into green evidence. Respect existing hostname/database
name/isolation guards. Rehearse empty and previous-schema migrations, synthetic
fixtures, backup/restore and expand/contract compatibility before release.

## Release and post-release checklist

Use `ops/ai/templates/release-evidence.md`; do not infer approval from filled JSON
or a checkbox. Record the actual approval channel, actor, scope and timestamp.

1. Obtain owner authorization for production-affecting build/migration operations.
2. Confirm merged SHA, required checks, fresh audit, both reviews, authenticated
   staging/tenant evidence and migration/recovery readiness.
3. Reverify the pre-merge automatic-promotion control and pending deployment runs.
   GitHub environment gates cannot stop a separate Vercel Git integration.
4. Build a staged production candidate without domain assignment. Inspect immutable
   deployment ID/URL, actual Git SHA, project/environment and readiness.
5. Run approved non-customer smoke checks against that exact candidate. Preview to
   production can rebuild with different environment variables; it is not proof
   of identical artifact behavior.
6. Present deployment ID and evidence; require owner's traffic-promotion approval.
7. Promote that exact deployment, not `latest` or a mutable branch alias.
8. Verify the production alias targets it; check routes, auth redirects, synthetic
   critical paths and logs immediately, observe for 30 minutes, follow up in 24h.
   Do not claim a future observation window has completed.
9. Tenant leakage, broken auth or persistent critical-path errors stop release.
   Use the approved known-good deployment for rollback only with explicit or
   exact preauthorization. Application rollback does not undo database changes.
   Recheck automatic-promotion settings after rollback/promotion.

Where supported, protect production environment credentials with human reviewers,
branch restrictions and disabled bypass. Otherwise keep credentials out of
unattended CI and require owner-controlled promotion. Missing access means blocked,
not an instruction to invent a deployment or weaken approval.

## Status vocabulary

Report separately: implemented → locally verified → independently reviewed → pushed
→ hosted checks passed → merge approved → deployed → post-release verified.
Use `blocked` with the exact missing evidence. Never imply end-to-end assurance from
unit tests or public demos alone. Keep sanitized run URLs/results keyed to full
SHAs; retain raw artifacts outside Git and delete ephemeral data per environment
policy.
