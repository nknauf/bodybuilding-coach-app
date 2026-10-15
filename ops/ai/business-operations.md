# Business operations and AI responsibilities

Owner: business owner/conductor. Reviewed: 2026-10-13. Status: proposed operating model; no spending or external actions approved.

## Business context

Formlyst serves bodybuilding coaches and their clients. The current product supports invited, pre-provisioned relationships, not arbitrary self-service role selection. Pricing, target coach segment, launch date, pilot cohort, budget and revenue targets remain unknown. Do not invent them.

## Reuse OMX roles

These are responsibility assignments to existing roles, not new agent installations or permanently running teams.

| Function | Existing roles | Responsibility and handoff |
|---|---|---|
| Conductor | Primary agent, planner | Scope, priorities, approvals, dependency order and evidence integration |
| Product/design | analyst, designer | Requirements, non-goals, coach/client UX and accessibility; owner approves product decisions |
| Engineering | architect, executor, debugger | Preserve boundaries, implement bounded approved tickets, regression evidence |
| QA | test-engineer, verifier | Safe test environment, adversarial scenarios, independent completion verdict |
| Security/privacy | architect, code-reviewer | Identity/tenant/media threat review and risk disposition; no unsupported compliance claim |
| Infrastructure | executor, researcher, verifier | CI, environment/release/restore procedures; production actions separately authorized |
| Marketing | researcher, writer, designer | Evidence-based positioning and assets; external publication requires approval |
| Finance planning | analyst, researcher | Assumption-led budget, cost sensitivity and pricing; no payments/bank access authority |
| Business operations | planner, writer | Onboarding/support/incident/vendor playbooks; human escalation and ownership |

Role bindings are maintained here, not copied into conflicting AGENTS files. Root AGENTS.md governs invocation/delegation. Use existing native roles for bounded work; OMX Team only when coordinated execution warrants it. Keep writer/implementer separate from verifier where appropriate.

## Work admission and completion

Every implementation starts with an approved backlog scope and affected-file ownership. Independent review checks acceptance/tests, tenant invariants and production risk. Record completed evidence in the ticket/decision, not just a conversational success claim.

No autonomous purchases, customer charging, marketing publication, production database access, schema deployment, destructive cleanup or credential changes are authorized by this model. Local docs do not grant external authority.

## Operational workstreams

- **Environment/vendor inventory (B07):** Vercel, Neon, Clerk and R2 owners; development/staging/production separation; credential rotation, billing alerts and recovery contacts. Existing account settings and bills remain unverified. Stream/PostHog/Upstash template variables do not establish adopted integrations.
- **Support/onboarding (B12):** invitation and exact-email expectations, safe identity-recovery escalation, account-disable handling, response targets and privacy-safe support access. Do not promise impersonation tooling that does not exist.
- **Privacy/incidents (B12/B09):** classify coaching records/media; define retention, deletion/export and audit access; distinguish soft archive from erasure; rehearse recovery and communications with synthetic data.
- **Finance (B13):** model costs per coach/client, media storage/requests, identity users, database/hosting, support labor and acquisition. Keep price sources dated and distinguish estimates from actuals; no numeric budget is established yet.
- **Marketing (B11/B13):** Formlyst positioning and accurate demo/pilot claims; brand changes are not yet shipped; no unsupported security/health claims.
- **Customer learning (B14):** choose pilot success measures before enrollment; candidates include onboarding completion, first assignment/log, repeat weekly use and support burden. These measures are proposed, not observed traction.

## Proposed cadence (part of B12/B13)

Weekly: backlog/blocker review, customer feedback and incident/support review. Monthly: budget/vendor usage and access review. Before each release: independent evidence review and explicit go/no-go. The owner should approve cadence and named people; no recurring automation is created here.

Specialist legal/accounting review may be needed once jurisdiction, customers and business model are known. AI research does not substitute for accountable professional review.
