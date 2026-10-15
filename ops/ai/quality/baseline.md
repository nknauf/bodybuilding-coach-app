# T05 / GitHub #11 — reproducible local quality baseline

Recorded 2026-10-14. **Completed local baseline: the ClientDay PostgreSQL check now passes; historical blocked results below are retained.** This is not production certification. No application code, schema, dependencies or configuration were changed by T05.

> Historical follow-up: [T42 / #49](T42-lint-boundaries.md) fixes the root lint failure; fresh root lint/typecheck pass and 219 tests pass (9 DB tests skipped). The original results below are retained as the historical T05 baseline. ClientDay verification was still blocked at that point; the final status below supersedes it.

## Final status — 2026-10-14

- [Real PostgreSQL 16.15 ClientDay verification](T05-clientday-postgres.md): **4/4 passed twice**, random schemas removed, unrelated sentinel unchanged; disposable server stopped.
- Fresh root lint and typecheck passed; credential-free suite **219 passed / 9 DB tests skipped**. See [lint](T05/final-lint.txt), [types](T05/final-types.txt), [tests](T05/final-tests.txt). The nine DB tests were exercised separately: five tenant cases in the earlier local adapter runs, four ClientDay cases in this final run.
- Earlier default production build and tenant verification remain valid recorded evidence, not newly rerun claims. Comparison with the 370-file build-input manifest found only the intended T42 ESLint config change; no application/schema changes since that build. T42's new tooling test is covered by fresh typecheck/tests.
- Temporary PostgreSQL tooling was explicitly approved and extracted without system installation. No application dependencies, production access, schema files, services, deployment, commit or push changed.
- T01 root selection/preservation is sufficient for this bounded local verification; its broader work ownership/release scope remains an **open release prerequisite**, not retroactively completed by #11.
- **Next: T06 / GitHub #12**, define and obtain approval for account identity-binding and recovery invariants before T07 implementation. No production or identity policy approval inferred from passing tests.

## Historical baseline snapshot (superseded by final status above)

The following results and follow-up sequence describe the initial T05 run and T42 follow-up, not current blockers.

### Revision, environment and preservation

- Root: `bodybuilding-coach-app` Git repository; HEAD `fffddf38c862d25b85da2d5a5152fc1fba14ff73` plus existing dirty work and T03/T04 changes. A clean checkout of HEAD alone does not reproduce this working tree.
- Linux WSL2 `6.6.87.2-microsoft-standard-WSL2`, x86_64; Node `22.23.3`, npm `10.9.9`; Next `16.3.0`, Vitest `4.1.10`, Prisma `7.9.1`.
- Lockfile SHA-256: `5751378e96be24f1e8be09e65693388dec838b7862077ce51f085aa0224fc1d5`.
- Dependencies and generated Prisma client restored in approved T03 verification. T05 reused them; no package installation/upgrade occurred. See [T03 evidence](T03-test-target-guard.md).
- [Build-input SHA-256 manifest](T05/source-hashes.json): 370 source/test/config/schema/generated-client files copied for build verification. Comparison after checks: **all 370 unchanged**. This is scoped preservation, not ownership attribution for the broader dirty repository.
- The nested partial project was not removed or rewritten; its source/config was included in the copied TypeScript/build input. T01's broader release-scope/ownership prerequisite remains open.
- Installed Next guides read: `01-app/02-guides/environment-variables.md`, `production-checklist.md`, `testing/vitest.md`, and `01-app/03-api-reference/06-cli/next.md` under `node_modules/next/dist/docs/`. Prisma CLI skill consulted. No framework change based on recalled APIs.

## Results

| Check | Result / evidence |
|---|---|
| `npm run lint` | **Failed, exit 1**: 10 errors / 10 warnings, all in agent skill/runtime cache files; [log](T05/lint.txt). Follow-up [T42 / #49](../issues/T42.md). |
| `npx eslint src tests prisma *.ts *.mts *.mjs` | **Passed, exit 0**; one ignored `next-env.d.ts` warning, no code errors. [Log](T05/scoped-lint.txt). This does not replace the failed root lint gate. |
| `npm run typecheck` | **Passed, exit 0**: Next typegen plus project `tsc --noEmit`. [Log](T05/types.txt). |
| `env -u RUN_DATABASE_TESTS -u DAY_TEST_DATABASE_URL npm test` | **Passed, exit 0**: 205 tests, 29 files; 9 DB tests / 2 files skipped. [Log](T05/tests.txt). |
| Credential-free isolated `npm run build` | **Passed, exit 0**: Turbopack compiled, TypeScript checked, 22/22 static pages generated. [Log](T05/build.txt). |
| Tenant DB suite with actual Prisma Neon adapter, isolated local PostgreSQL engine | **Passed twice**, 5/5 each run; no fixture leftovers, unrelated sentinel unchanged. [Log](T05/tenant.txt). |
| ClientDay PostgreSQL suite | **Initially blocked, not run** (resolved in final evidence above): neither `psql` nor `postgres` on PATH; Docker WSL integration unavailable ([diagnostic](T05/docker.txt)). Do not substitute mocks/PGlite serialization for its real concurrent `psql` checks. |
| Hosted Neon, authenticated browser/staging flows, deployment | Not performed; outside this local baseline. |

## Reproduction

From the root with the approved locked installation and generated client:

```bash
npm run lint
npx eslint src tests prisma *.ts *.mts *.mjs
npm run typecheck
env -u RUN_DATABASE_TESTS -u DAY_TEST_DATABASE_URL npm test
```

The unit command deliberately leaves database suites disabled. Vitest does not load the app's dotenv files. Never enable a DB suite with the application's connection URL.

### Credential-free build, without external networking

Next loads `.env*` automatically. Therefore the build ran in a fresh temporary copy, not the credential-bearing repository. The copy contains exactly the manifest inputs, plus installed dependencies. No `.env*`, agent/runtime cache or old `.next` output was copied. Dummy configuration is not an authentication or database integration test.

Reproduce on Linux with `unshare` user/network namespaces and `ip` available:

```bash
export FORMLYST_BUILD_DIR="$(mktemp -d /tmp/formlyst-baseline-build.XXXXXX)"
python3 - <<'PY'
import json, os, shutil
from pathlib import Path
root = Path.cwd()
target = Path(os.environ['FORMLYST_BUILD_DIR'])
manifest = json.loads(Path('ops/ai/quality/T05/source-hashes.json').read_text())
for name in manifest:
    source, destination = root / name, target / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
assert not list(target.rglob('.env*'))
PY
# Linux hardlinks reuse installed package bytes; do not install/edit packages in this copy.
cp -al node_modules "$FORMLYST_BUILD_DIR/node_modules"
cd "$FORMLYST_BUILD_DIR"
unshare -Urn sh -c 'ip link set lo up && exec env -i \
  PATH="$1" HOME="$2" NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
  DATABASE_URL="postgresql://unused:unused@127.0.0.1:1/formlyst_test_build" \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_Y2xlcmsuZXhhbXBsZS50ZXN0JA==" \
  npm run build' sh "$PATH" "$FORMLYST_BUILD_DIR"
```

The namespace has loopback only and no external interface/route. Enabling loopback is necessary for build-worker IPC. An initial attempt without loopback failed with a Turbopack PostCSS worker connection error; the cached error persisted on one retry. A **fresh temporary `.next` output with loopback enabled passed**. This is a verification-environment correction, not evidence of an application defect or a reason to change bundlers.

### Database checks

The temporary local tenant harness from [T04's reproduction artifact](T04-tenant-fixtures.md#reproduction-artifact-temporary-local-verification-harness) was rerun unchanged. It applies existing migrations only to a new in-memory PostgreSQL engine and tests the actual Neon adapter over localhost. No hosted Neon/production credentials or schema were accessed.

To unblock the missing ClientDay check, provide an approved **local disposable PostgreSQL instance and `psql`** (or enable the existing Docker WSL integration under the operator's environment policy). No new OS package, service or Docker configuration was installed/changed by this task. Then follow [the guarded ClientDay command](../../../docs/MANUAL_TESTING.md#clientday-migration-suite-local-postgresql-only), record the version and result, and verify random-schema cleanup. Never use an application/staging/production database or weaken T03 guards.

## Classification and follow-up

1. **Verified tooling defect:** root ESLint traverses `.codex/skills/.system/` and `.omx/runtime/`. [#49 / T42](https://github.com/nknauf/bodybuilding-coach-app/issues/49) captures a narrow fix, dependencies, affected files, acceptance criteria, tests and overbroad-ignore risk. No vendor/cache fixes made in T05.
2. **Historical missing prerequisite, now resolved:** ClientDay's actual PostgreSQL/`psql` concurrency/migration check was blocked at baseline capture. The approved temporary-tooling run above satisfies that required check.
3. **Open ownership decision:** T01 release scope is not resolved by a passing local build or this preservation manifest.
4. **Not proven:** hosted-service compatibility, staging behavior, production schema state, browser security and launch readiness. No new runtime defect is inferred from these gaps.

**Historical next recommendation (completed): #49 / T42**, the narrow lint-boundary fix. In parallel with operator environment provisioning if available, finish the blocked PostgreSQL check and refresh #11 evidence before closing it. Do not advance identity-binding implementation through its T05 gate by treating this partial baseline as green.

## Evidence review

Independent read-only verifier review confirmed the recorded counts, HEAD/lock hash, all 370 source hashes, local links and explicit blocked status. A minor parent-coverage index omission was corrected. Review did not independently rerun the build or database suites.

## T42 follow-up — 2026-10-14

The recommended lint-boundary fix is complete; see [T42 evidence](T42-lint-boundaries.md). At that point the next step was the disposable PostgreSQL/psql prerequisite and ClientDay verification, so #11 remained open. The final verification above now resolves that gap. No production readiness or T01 ownership decision is inferred.
