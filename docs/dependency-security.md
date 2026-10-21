# Dependency installation and security

## Remediation — 2026-10-20 UTC

The original successful installation reported 28 affected package entries:
2 critical, 20 high, and 6 moderate. Audit entries include inherited dependency
findings; they are not a count of independently exploitable application defects.

The remediation keeps the existing major versions and updates the lockfile:

- Next.js and its ESLint configuration: 16.3.8.
- Prisma CLI, client, and Neon adapter: 7.10.1.
- Sharp: 0.35.5; proxy-addr: 2.0.8.
- Compatible tooling/transitive fixes, including Vitest 4.1.12.

Node 22.23.3 and npm 11.21.1 are the tested toolchain. npm 10.9.9 crashed in
Arborist's `loadPeerSet` (`Cannot read properties of null (reading 'edgesOut')`)
while previewing and resolving updates. The temporary npm 11.21.1 runner
successfully resolved this candidate. See the
[upstream npm issue](https://github.com/npm/cli/issues/9787).

## Unresolved release blocker

The refreshed full audit reports **9 high, 0 critical, and 0 moderate** entries.
The production-only lockfile audit (`npm audit --package-lock-only --omit=dev`)
reports **zero findings**. This is not a guarantee that application code or
development environments are secure.

All remaining findings stem from
[braces stack-exhaustion denial of service](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
No patched release was available at verification time. The affected dependency
paths are:

- `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`
- `shadcn → fast-glob → micromatch → braces`
- `shadcn → @shadcn/registry → fast-glob → micromatch → braces`
- `shadcn → ts-morph → @ts-morph/common → fast-glob → micromatch → braces`

These are development-tool paths, not proof of a remotely exploitable production
endpoint. Avoid processing untrusted glob patterns with these tools. The raw full audit still fails. A subsequent owner-approved delivery-policy change
adds one 14-day, advisory-specific, dev-only exception in
`security/audit-exceptions.json`; `npm run security:audit` evaluates both audits
and fails closed on changed exposure, new findings, expired approvals, or
retrieval/schema errors. No incompatible override or forced downgrade is used.
See [the delivery workflow](delivery-workflow.md) for the current policy.

Follow-up owner: the repository dependency maintainer. Upgrade the affected
parents when a compatible fix is available, then repeat clean installation,
full/production audits, lint, typecheck, tests, and build. If an upstream fix is
unavailable, replacing tooling or accepting a time-limited security exception
requires a separate explicit decision. Do not use `npm audit fix --force` to
downgrade Next's lint configuration or shadcn solely to make the report green.

## Reproduction

Use a unique checkout without service credentials, with no other install running
against its `node_modules`. Use a writable cache rather than sudo:

```bash
nvm use
npm install --global npm@11.21.1
npm ci --cache /tmp/formlyst-npm-cache
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
```

`npm ci` runs Prisma generation but does not need database credentials. It must
not change the package manifest or lockfile. Hosted CI and deployment verification
remain separate from local snapshot verification.

## Local foundations snapshot evidence

These results describe the uncommitted foundations candidate based on
`d87e788`, not a published commit or proof of hosted CI. The delivery evidence
manifest records the exact candidate file hashes; new edits require fresh checks.

- Pinned npm 11.21.1 clean install: 819 packages, Prisma Client 7.10.1 generated.
- Lint, typecheck, delivery formatting and dependency policy: passed locally.
- Initial offline suite: 185 passed, 3 guarded skips; see the latest delivery
  report for results after provenance regression tests were added.
- Default production build: blocked by Turbopack PostCSS process/port binding
  EPERM in this environment. No default-build success is claimed; hosted CI must
  establish it for the exact published candidate.
- Raw full audit: 9 high entries in the dev-only braces chain; production audit:
  zero findings. The narrow approved exception remains time-limited.
- Independent reviews requested corrections; clearance is pending re-review.

npm 11 emitted lifecycle-script review warnings for Prisma, Prisma engines,
esbuild and unrs-resolver. Installation and generation succeeded without blanket
script approval. No hosted CI, deployment, database migration, browser execution
or database-backed test is established by this local evidence.
