# T06 / #12 — identity binding and recovery policy

Status: **Draft; owner policy approval pending.** Full execution permissions authorize preparing this proposal and synthetic tests, not an inferred choice between account recovery/security tradeoffs. #13 runtime implementation is excluded. No live users, Clerk services or application database are accessed.

## Definitions and verified behavior

- **Initial binding:** existing application user has no Clerk ID; a verified identity is attached to that row. Public signup never provisions a role.
- **Repeat synchronization:** the same Clerk ID updates its existing row. The application remains authoritative for role, account status and tenant profile ownership.
- **Replacement:** a different Clerk ID displaces a non-null existing binding. This is not ordinary webhook retry or missed-webhook recovery.
- **Session recovery:** attempt to bind a provisioned user when session ID lookup misses; this is not authorization to replace another identity.
- **Operator linking:** current CLI accepts IDs/email and asserts verification; it does not independently query Clerk to prove identity. Do not describe it as an implemented high-assurance recovery process.

Sources: `src/server/auth/sync-clerk-identity.ts`, `src/server/auth/current-user.ts`, `src/server/admin/link-clerk-user.ts`; README identity/operator sections; D09 and F03. Current synchronizer replaces a non-null binding if only the email lookup matches. Synthetic cases now reproduce that behavior for webhook/session/operator source inputs. This is a verified behavior/assurance gap, **not proof of account takeover in production**.

## Proposed policy and approval questions

| Decision                                                    | Recommended choice                                                                            | Alternative / consequence                                                                 | Approval |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| Existing binding A; incoming B with verified matching email | Reject in webhook/session/current CLI, preserve A; use separately approved audited recovery   | Allow email-based replacement, or make bindings permanently immutable                     | Pending  |
| Initial binding for eligible provisioned unlinked user      | Verified exact normalized email; provisioning is the access grant, invitation delivers signup | Require valid/unexpired/unrevoked invitation for clients; retain separate admin bootstrap | Pending  |
| Disabled account identity writes                            | Reject until explicitly re-enabled by administrator                                           | Preserve current linking/profile sync while DISABLED; always deny access                  | Pending  |

Related recommended invariants for the final owner-approved policy:

1. Unknown signup creates no user, role, profile or tenant assignment.
2. Unverified email, mismatched metadata, two-row identity/email collision, archived or deleted account never grants an actor. Rejection preserves binding/role/tenant ownership; a redacted audit may be written.
3. Repeat synchronization is idempotent with respect to binding, role, tenant ownership and activation. Repeated audit events are permitted; retries do not mean no writes whatsoever.
4. Same existing Clerk ID may update a verified collision-free email, never change role/tenant assignment. Identity conflict denial must not leak the other account's details.
5. Already-linked users resolve by Clerk ID and must pass application ACTIVE/not-deleted checks; a failed/missing post-sync lookup must not manufacture an actor.
6. Archived/deleted identities are not resurrected by email ownership or by this CLI. Support review is separate from automatic synchronization.
7. An invite expiration/revocation policy must be explicit. Under the recommended provisioning-grant model, invitation revocation alone is **not** access revocation; disable/archive the provisioned account to revoke access. This consequence requires owner agreement, not inference from current code.

## Recovery boundary (proposal, not an executable runbook)

If replacement is allowed only through a separate audited process, deny first and direct the user to generic support guidance. Do not fall back to a guessed email or clear the old binding to make automatic linking succeed.

Proposed support requirements: verify the requester and replacement identity using trusted provider records plus an independently approved ownership check (matching email alone is insufficient); identify the exact application record and old/new IDs; require a named authorized administrator's approval; check both IDs for collisions; preserve role/status/tenant ownership; record the actor, reason and references without secrets; enforce compare-and-set against the reviewed old binding; address old sessions; provide audit and rollback/escalation evidence. Define the operational ownership proof and approval mechanism in a separate recovery design before enabling transfers. No such transfer tool is implemented or authorized by #12.

## Test matrix and remaining acceptance gate

| Scenario                                           | Current evidence                                                                              | Final-policy follow-up                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| First verified link / repeat sync / unknown signup | `clerk-identity.test.ts`                                                                      | Confirm chosen invitation gate                                                                                |
| Different ID, same email, existing binding         | Three explicit characterization cases reproduce replacement                                   | Replace with deny/allow regression matching approved decision in #13; current green suite does not mean fixed |
| Unverified / metadata mismatch / two-row collision | Synchronizer tests plus denied session-result tests                                           | Preserve no actor and no unauthorized writes                                                                  |
| Disabled / archived / deleted                      | Disabled-link behavior is characterized; linked actors denied; archived/deleted sync rejected | Adjust disabled-write tests to approved choice                                                                |
| Same ID / changed verified email                   | Characterized with no role/profile-ownership changes                                          | Owner-approved repeat-sync rule                                                                               |
| Post-sync account unavailable or missing           | Session recovery regressions                                                                  | Preserve fail-closed result                                                                                   |

Mocked tests prove decision branches and payloads, not concurrent binding safety, signed webhook validation, provider assurance, transaction rollback, or real tenant isolation. #13 must test any atomic conflict handling on an approved disposable database. Hosted exploitability remains unverified.

## Prioritized implementation handoff (proposed, dependent on approval)

- **P0 / #13:** enforce chosen binding/disabled rules in `src/server/auth/sync-clerk-identity.ts`; caller error mappings in `current-user.ts`/operator wrapper as needed; corresponding synthetic and guarded DB tests. Dependencies: owner-approved #12, completed #11. Acceptance: no unauthorized binding overwrite, no role/tenant/status escalation, stable account-unavailable responses, collision/concurrent-first-bind safety. Risk: legitimate recovery may be blocked; do not silently restore email-based replacement.
- **P0 policy dependency:** if invitation eligibility is chosen, explicitly coordinate existing invitation lifecycle scope rather than silently expanding #13. Likely files: synchronizer, provisioning/invite service and lifecycle tests. Acceptance: defined expiry/revocation behavior with an explicit admin-bootstrap exception; tests for expired/revoked/accepted/missing invites. Risk: existing provisioned users may be locked out.
- **Separate recovery implementation:** no transfer tool in #12/#13 by default. Requires an approved recovery design and focused task with named operator authorization, audit, compare-and-set and session revocation tests. Risk: identity transfer grants access to private client data.

Definition of done for #12: owner decisions recorded; unambiguous transition matrix finalized; synthetic regressions/known gaps documented; verification and review recorded; no runtime changes. Until policy approval, this issue remains open and #13 is not started.
