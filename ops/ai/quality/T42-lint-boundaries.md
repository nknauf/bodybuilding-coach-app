# T42 / GitHub #49 — narrow lint cache exclusions

Date: 2026-10-14. Local tooling-only implementation; no deployment or commit.

## Change and boundaries

- `eslint.config.mjs`: added only `.codex/skills/.system/**` and `.omx/runtime/**` to existing global ignores. No rule changes or broad `.codex` / `.omx` / nested-project exclusions.
- `tests/tooling/eslint-boundaries.test.ts`: 14 assertions using the real ESLint API/config, covering two cache exclusions and 12 retained code/config paths. Includes source, tests, Prisma, root configs, nested project source and non-cache agent-directory code; retained paths must still have the TypeScript unused-variable rule.
- Cold ESLint config initialization uses a 30-second `beforeAll` hook; assertion timeouts remain unchanged. Independent review reproduced a default-timeout failure during concurrent checks before this correction.

## Verification

Baseline root lint reproduced **10 errors / 10 warnings** in agent caches ([log](T42/lint-before.txt)). Before config repair, regression tests had **2 expected failures and 12 passes** ([log](T42/regression-before.txt)). These prove the previously missing exclusions, rather than only checking configuration text.

Final commands and outcomes are recorded in the accompanying logs:

- `npx vitest run tests/tooling/eslint-boundaries.test.ts`: 14 passed.
- `npm run lint`: exit 0, no diagnostics.
- `npx eslint eslint.config.mjs tests/tooling/eslint-boundaries.test.ts`: exit 0.
- `npm run typecheck`: exit 0.
- `env -u RUN_DATABASE_TESTS -u DAY_TEST_DATABASE_URL npm test`: 219 passed, 9 database tests skipped.
- `npx prettier --check eslint.config.mjs tests/tooling/eslint-boundaries.test.ts`: passed.

See [final regression](T42/regression-after.txt), [root lint](T42/lint-after.txt), [scoped lint](T42/scoped-lint.txt), [types](T42/types.txt), [tests](T42/tests.txt), and [format](T42/format.txt). Historical T05 logs and build-input hashes remain unchanged; the intentional ESLint config edit supersedes its old config hash, not its historical preservation evidence.

## Risks and next task

- No application runtime, schema, package version, dependency or AGENTS.md changes. No production access. Build/database suites were not rerun for this lint-only change; earlier build/tenant evidence remains historical, not a new certification.
- Future installed tooling outside these two exact paths may need separately reviewed exclusions. Do not broaden ignores to hide owned-code diagnostics.
- **Next: finish T05 / #11's ClientDay PostgreSQL verification**, after an approved disposable local PostgreSQL/psql environment is available. #11 remains open; this lint fix does not resolve that missing prerequisite or T01's release ownership decisions.

Independent review approved the final config/test changes with no remaining findings; reviewer reran all 14 boundary assertions and scoped ESLint successfully.
