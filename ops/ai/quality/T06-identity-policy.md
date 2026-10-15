# T06 / #12 — draft policy and synthetic regression evidence

Recorded 2026-10-15. **In progress, not complete:** owner policy answers remain pending. [Draft requirements](../requirements/T06-identity-policy.md). Full execution permissions were not treated as approval of security/recovery tradeoffs. Autopilot remains recorded as blocked; this bounded follow-up is ordinary edit/test work, not a completed Autopilot run.

## Changes

- `tests/auth/clerk-identity.test.ts`: replaced person-specific fixture values with synthetic identities; three source-input characterization cases for the existing binding replacement behavior; same-ID email update and idempotent retry preserve role/ownership; rejection assertions prohibit identity/client/invite writes.
- `tests/auth/current-user-recovery.test.ts`: reset mocks per test; synthetic fixtures; denied synchronization outcomes, signed-out/unverified/unknown accounts, already-linked disabled/archived/deleted denial, post-sync status and missing-record checks.
- Draft policy, decision register, issue/index and this evidence. No runtime authentication, schema, UI or dependency changes. No live accounts, network identity calls, production services, deployment, commit or push.

## Verification

Node 22.23.3; Vitest 4.1.10; existing working tree at HEAD `fffddf38c862d25b85da2d5a5152fc1fba14ff73` plus previously recorded changes.

| Command | Final result |
|---|---|
| `npx vitest run tests/auth/clerk-identity.test.ts tests/auth/current-user-recovery.test.ts` | 27 passed; independently rerun by reviewer |
| `env -u RUN_DATABASE_TESTS -u DAY_TEST_DATABASE_URL npm test` | 235 passed, 9 guarded DB tests skipped |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; after final assertion edits, scoped ESLint also passed |
| `npx prettier --check tests/auth/clerk-identity.test.ts tests/auth/current-user-recovery.test.ts ops/ai/requirements/T06-identity-policy.md` | Passed |

Logs: [targeted](T06/targeted.txt), [full suite](T06/final-tests.txt), [types](T06/final-types.txt), [root lint](T06/lint.txt), [final scoped lint](T06/final-scoped-lint.txt), [format](T06/final-format.txt).

During iteration, a no-write assertion was misplaced in the successful email-update case; targeted/full tests caught it. It was moved to the archived/deleted rejection case, then checks were rerun successfully. No failed verification was suppressed. Independent review found no remaining issues but correctly retained owner approval as the completion gate.

A comparison against T05 hashes confirms all 160 captured `src/` and `prisma/` files unchanged. Mocked tests are not provider security, concurrency/transaction, signed-webhook or real tenant-isolation verification. The three replacement characterization cases intentionally pass on current behavior; **they are not a remediation test or policy approval** and must be converted to the approved transition assertions in #13.

## Remaining gate / next task

Obtain explicit choices on replacement, initial-binding/invitation eligibility and disabled-account writes; pressure-test legitimate account recovery and revocation consequences; finalize the owner-approved transition matrix and any additional policy regressions. Keep #12 open and do not start #13 until that is complete. No production risk has been accepted by drafting this document.
