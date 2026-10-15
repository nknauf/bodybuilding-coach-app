# T03 / GitHub #9 — database-test target guard

Date: 2026-10-13. Status: completed; subsequent actual-toolchain verification passed. Earlier blocked results below are retained as history.

## Scope and prerequisite

The user requested the first implementation. `pwd` and `git rev-parse --show-toplevel`
agree on the documented root. Pre-task HEAD was
`fffddf38c862d25b85da2d5a5152fc1fba14ff73`; the working tree was already dirty.
Existing work remains user-controlled, with no authorship inferred. Only the T03
test harness and related instructions are in this change's scope. The nested
partial project, application source, schema, AGENTS.md and unrelated changes
were left untouched. T01's broader release-baseline/ownership decisions remain
open; root selection and preservation were established for this bounded change.

## Changes

- Added `tests/integration/database-test-target.ts`: explicit opt-in, dedicated
  `formlyst_test_*` name, disposable acknowledgement, exact approved tenant host,
  local-only day tests, restricted connection parameters and redacted failures.
- Rejects exported application/direct target reuse, including encoded names,
  pooled/direct aliases, trailing DNS dots and equivalent numeric ports.
- Tenant suite no longer loads dotenv/application URL; adapter/client imports
  and construction are deferred until a validated enabled suite's setup hook.
- Day suite validates before setup; inherited libpq `PG*` settings are removed
  before psql invocation so they cannot override the approved target.
- Added `tests/integration/test-database-target.test.ts` with 39 offline cases.
- Updated `.env.example`, README and the manual testing guide. No packages,
  runtime application code, migrations or deployment configuration changed.

## Verification

| Check | Result |
|---|---|
| Guard assertions through Node's built-in test runner | **39 passed, 0 failed**, no database/network |
| Independent scoped code review | No remaining blocker; original encoded-name comparison finding fixed and independently retested |
| Vitest CLI | Blocked: installed Vitest cannot resolve `pathe` |
| ESLint availability | Blocked: `eslint` command missing; no lint pass claimed |
| Typecheck | Blocked: `next` command missing; no typecheck pass claimed |
| Live database suites | Not run: no approved disposable target/toolchain; fixtures remain T04 work |
| Preservation | 205 of 209 snapshotted source/test/schema/root-config files unchanged; four existing files changed within scope; manual guide separately snapshotted and intentionally updated |
| Whitespace | Scoped diff passed with CRLF-aware settings; `.env.example` retained its existing CRLF; new test files checked separately |

The fallback executes the same checked-in assertion bodies, replacing only the
Vitest `describe`/`it` import with `node:test` and resolving the helper import.
It is **not** a claim that Vitest collection, full integration, lint or TypeScript
checking passed. Reproduce from the root with existing Node 22.23.3:

```bash
python3 - <<'PY'
from pathlib import Path
from tempfile import mkdtemp
p = Path('tests/integration/test-database-target.test.ts')
s = p.read_text().replace('from "vitest"', 'from "node:test"')
s = s.replace('"./database-test-target"',
              '"' + (p.parent / 'database-test-target.ts').resolve().as_uri() + '"')
target = Path(mkdtemp(prefix='formlyst-guard-')) / 'guard.test.mts'
target.write_text(s)
print(target)
PY
# Run the printed file path (without --test):
node --experimental-strip-types /tmp/formlyst-guard-EXAMPLE/guard.test.mts
```

## Remaining risks / next step

- No URI guard can prove data is disposable. Operator acknowledgement and
  separate test-only credentials remain required. Undisclosed production URLs,
  tunnels or DNS changes cannot be inferred from a string.
- Ordinary local PostgreSQL is supported by the day suite; the tenant suite's
  Neon transport is unchanged and needs compatible infrastructure.
- The tenant suite still relies on fixed seed IDs; do not mistake empty-fixture
  denial for valid isolation coverage. T04 / #10 is the next implementation.
- First restore existing locked dependencies with approval, run the actual
  targeted Vitest test plus lint/typecheck, and address failures before marking
  T03 done. No dependency install or additional package is authorized implicitly.
- No database connection, production access, schema operation, deployment,
  commit or push was performed. GitHub issue #9 remains open for verification.

## Verification completed after dependency restoration

The owner approved npm ci and a minimal repair of missing lockfile entries. Added
four transitive @emnapi entries; all existing entries/versions and top-level
dependencies preserved. Normal npm ci installed 826 packages; the final minimal
lock also passed npm ci --dry-run --ignore-scripts --offline. No application DB
connection was made by Prisma generation.

Actual Vitest guard tests: 39/39. Full credential-free suite: 199 passed, 7 DB
tests skipped. Project typecheck, scoped ESLint and Prettier checks passed.
Typecheck caught and prompted correction of the subprocess ProcessEnv return
type (NODE_ENV is explicitly test). GitHub #9 is closed; #10 fixtures follows.
No commit, push, schema change or production deployment.
