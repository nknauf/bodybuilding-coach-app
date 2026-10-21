# Foundations CI contract

`Quality checks` installs the lockfile with Node from `.nvmrc` and pinned npm,
then runs delivery formatting, lint, typecheck and offline tests sequentially.
`Production build` performs a separate clean installation and build using inert
Clerk and unreachable local database placeholders. Neither job receives secrets.
`Dependency policy` audits the complete and production dependency graphs using
only the narrow, dated exception in `security/audit-exceptions.json`.

Workflows run on pushes, pull requests and merge groups, with manual dispatch.
Dependency policy also runs daily. Checkout and setup-node use pinned commit SHAs;
credentials are not persisted. npm caching accelerates downloads but `npm ci`
still validates and installs the committed lockfile.

The canonical root application is checked; preserved nested and agent-tooling
copies are excluded. Formatting gates delivery-owned files while full-tree
formatting debt is tracked separately. No skipped service tests count as database
or authenticated workflow evidence. Public browser smoke is a separate manual,
protected staging workflow; provision its approved host before dispatching.

No workflow deploys, migrates a database or promotes traffic. Database-specific
checks and their schema/test prerequisites belong to a later reviewed batch.
Use `docs/delivery-workflow.md` for exact-SHA evidence and review requirements.
