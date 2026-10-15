# Formlyst project operating documentation

Owner: project conductor; business owner approves product and production decisions.

Reviewed: 2026-10-13. Status: documentation and issue decomposition completed; roadmap approved as the planning basis; implementation and unresolved policy decisions remain pending.

This directory consolidates the conversation's read-only repository assessment. It is business and engineering context, not a new agent framework. Root [AGENTS.md](../../AGENTS.md) remains authoritative; existing architecture and configuration are unchanged.

## Read in this order

1. [Architecture](architecture.md): current implementation and boundaries.
2. [Findings](findings.md): observed defects, suspected risks, and evidence limits.
3. [Backlog](backlog.md): canonical proposed-change records and acceptance gates.
4. [Roadmap](roadmap.md): sequencing and product scope.
5. [Launch blockers](launch-blockers.md): release decision checklist.
6. [Business operations](business-operations.md): responsibilities and operating model.
7. [Decisions](decisions.md): approved constraints versus unapproved proposals.
8. [Implementation issues](issues/README.md): dependency-ordered GitHub tasks, local issue bodies, and completion-report protocol.

## Evidence and change rules

- **Verified observation:** directly visible in source/configuration; does not imply runtime reproduction.
- **Verified problem:** observed inconsistency or unsafe behavior with a concrete failing contract.
- **Suspected problem:** plausible risk requiring a policy decision or reproduction.
- **Proposed improvement:** capability/hardening not established as a defect.
- **Unknown:** not inspected or not established by repository evidence.
- Findings cite repository-relative paths. Line numbers reflect the assessed snapshot and may drift.
- Every proposed change is governed by a backlog ID containing priority, affected files, dependencies, acceptance criteria, tests, and production risk. References elsewhere do not authorize implementation.
- P0: blocks establishing a safe baseline or release assurance. P1: resolve before pilot unless explicitly accepted. P2: conditional commercial/expansion work. Priority is not an exploit-severity rating.
- P3: cosmetic/UI work after critical workflows and staging readiness. UI changes require demo-first review before promotion to real workspaces.
- Record acceptance evidence and decision owner before closing an item. Keep suspected risks separate from reproduced failures.
- Do not place secrets, production data, customer photos, private support transcripts, or vendor credentials here. Record secret names/owners, not values.
- `.omx/` remains workflow runtime state; `.codex/` remains existing roles/skills. Do not duplicate either here.

## Assessment limits

No tests, build, browser session, dependency audit, database connection, or production inspection was performed for the source assessment. README statements about build success or patched dependencies are historical claims, not fresh evidence. This documentation task does not certify security or launch readiness.

The original working tree already contained extensive modifications, new day-record files, and a nested partial application copy. Preserve those changes. No commit, migration, installation, deployment, or application-code change is authorized by the documentation approval.

Existing references: [README](../../README.md), [manual testing](../../docs/MANUAL_TESTING.md). These documents may contain drift identified in F02; this index does not silently supersede their technical contracts.

## Version-control snapshot — 2026-10-15

This documentation snapshot and T06's two synthetic authentication test files are being published at the owner's request. The repository also contains earlier application, test-infrastructure and configuration edits that are intentionally **not** included in this scoped commit. Historical quality logs describe the recorded working tree, not a claim that this documentation/test-only commit contains every tested implementation. See the manifests and explicit working-tree caveats in `quality/baseline.md`.

T03/T04/T05/T42 have recorded local verification; T06 / #12 policy approval remains pending. Read the issue index and dated follow-ups for current status rather than treating the initial assessment as the latest execution report. Publishing a draft is not policy approval, release approval or deployment.
