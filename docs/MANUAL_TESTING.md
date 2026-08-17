# Three-account production testing

This guide tests Forge Coach exactly as production users experience it. There is no role switching, impersonation, demo cookie, hidden seed, or reset control.

## 1. Prepare three real email identities

Use addresses you own and can verify:

```text
ADMIN_TEST_EMAIL=noahknauf@icloud.com
COACH_TEST_EMAIL=YOUR_COACH_ALIAS_OR_EMAIL
CLIENT_TEST_EMAIL=YOUR_CLIENT_ALIAS_OR_EMAIL
```

These are checklist placeholders, not application environment variables. Never add them to Vercel merely for testing.

Apple supports up to three deliverable `@icloud.com` aliases. Prefer two explicitly created iCloud aliases over assuming `+coach` and `+client` addressing works. Before provisioning either account:

1. Send an ordinary email to the candidate address and confirm receipt.
2. Confirm it is not already attached to a user in the production Clerk instance.
3. Confirm Clerk permits signup with it and will send verification mail.
4. Preserve the exact alias text; the application trims and lowercases it but does not remove `+tag` or otherwise collapse aliases.
5. If either provider treats the aliases as the same identity, use two separate addresses instead.

## 2. Isolate browser sessions

- Normal browser profile: administrator.
- Second browser profile or private window: coach.
- Third profile, private window from another browser, or another device: client.

Clerk sessions share cookies within one browser profile. Do not test all three users in ordinary tabs in the same profile.

## 3. End-to-end walkthrough

### Public and administrator

| Step            | Account       | Path                      | Action                                                                                        | Expected UI/database state                                                                            | Failure diagnostics                                                                                                                            |
| --------------- | ------------- | ------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing         | Signed out    | `/`                       | Review the header, hero, coach/client explanation, CTA, and footer. Open sign-in and sign-up. | Public content contains no user data or fabricated metrics.                                           | Inspect browser console and Vercel request logs for route failures.                                                                            |
| Admin sign-in   | Administrator | `/sign-in`                | Sign in as `ADMIN_TEST_EMAIL`.                                                                | `/app` redirects to `/admin`; the database user remains `role=ADMIN`, `status=ACTIVE`.                | If workspace is unavailable, inspect Clerk email verification, `clerk_session_identity_recovery`, and the database user status/Clerk ID.       |
| Provision coach | Administrator | `/admin`, Provision coach | Enter the exact coach address, name, and IANA timezone.                                       | One `User(role=COACH,status=INVITED)` and one `CoachProfile` are created; `COACH_CREATED` is audited. | Duplicate/role-conflict message means the address already belongs to an application user. Inspect the audit log and normalized database email. |

### Coach activation and workflow

| Step             | Account       | Path                        | Action                                                                                        | Expected UI/database state                                                                                                                                                                            | Failure diagnostics                                                                                                                                   |
| ---------------- | ------------- | --------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coach signup     | Coach browser | `/sign-up`                  | Create and verify a Clerk account with the exact provisioned coach address. Then open `/app`. | Webhook or session recovery links `clerkUserId`, activates the invited user, and redirects to `/coach`.                                                                                               | Inspect Clerk user primary/verified email, webhook delivery for `user.created`, Vercel `clerk_webhook_*` logs, and `CLERK_USER_SYNC_REJECTED` audits. |
| Coach dashboard  | Coach         | `/coach`                    | Review counts, client list, schedule, compliance, and empty guidance.                         | Only this coach’s records are visible.                                                                                                                                                                | A redirect to `/app` indicates role/status mismatch; an empty dashboard is expected before a client exists.                                           |
| Invite client    | Coach         | `/coach`, client form       | Enter the exact client address, name, and timezone.                                           | Creates `User(role=CLIENT,status=INVITED)`, owned `ClientProfile`, ownership history, and pending `ClientInvite`. Clerk email is requested when configured; otherwise a one-time manual link appears. | Inspect UI delivery status, Clerk Invitations, `deliveryError`, `CLIENT_INVITED`, and Vercel logs.                                                    |
| Exercise catalog | Coach         | `/coach/exercises`          | Create exercises across several muscle groups/equipment types.                                | Exercises are owned by this coach and appear only in their catalog.                                                                                                                                   | Duplicate normalized names are rejected; inspect action feedback.                                                                                     |
| Schedule workout | Coach         | `/coach/clients/{clientId}` | Create a multi-exercise workout with ordered assigned sets for today and future dates.        | Workout, exercise snapshots, and assigned sets are scoped to the coach/client pair.                                                                                                                   | A safe “not found” response means the client ID is outside the coach scope.                                                                           |
| Nutrition        | Coach         | Same client page            | Schedule meals with ingredients/macros and supplements with dosage.                           | Real dated meal and supplement records appear for the client.                                                                                                                                         | Check timezone input, validation feedback, and audit entries.                                                                                         |

### Client activation and daily workflow

| Step              | Account        | Path                                                | Action                                                                                            | Expected UI/database state                                                                                                                            | Failure diagnostics                                                                                                                  |
| ----------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Client signup     | Client browser | Clerk invitation or `/join/{token}` then `/sign-up` | Sign up and verify using the exact invited address.                                               | Clerk identity links only to the invited client; user/profile become active, invite becomes accepted, `/app` redirects to `/client`.                  | Inspect invitation expiry/status, Clerk metadata, verified primary email, webhook attempts, `clerk_webhook_*`, and rejection audits. |
| Calendar/today    | Client         | `/client`                                           | Review today, current week, upcoming/overdue/missed items, compliance, streaks, and weight trend. | Only this client’s assignments appear, in the stored timezone.                                                                                        | Wrong dates usually indicate an incorrect user timezone or schedule timezone.                                                        |
| Workout logging   | Client         | `/client/workouts/{workoutId}`                      | Complete assigned sets, skip one set, add an extra set, save notes, and finalize.                 | Assigned logs persist; skipped and extra sets remain distinct; extra sets do not increase the compliance denominator; finalization locks the workout. | Inspect validation feedback and `WORKOUT_SET_LOGGED`, `EXTRA_WORKOUT_SET_LOGGED`, and `WORKOUT_FINALIZED` audits.                    |
| Meals/supplements | Client         | `/client`                                           | Complete a meal with actual values and complete a supplement.                                     | Status and compliance update from real records.                                                                                                       | Check event ownership/status and completion audit entries.                                                                           |
| Bodyweight        | Client         | `/client`, Bodyweight                               | Record a morning weight.                                                                          | The entry appears in history and the real trend chart.                                                                                                | Check unit/value validation and client timezone/day grouping.                                                                        |
| Rescheduling      | Client         | `/client`                                           | Move one eligible unfinished event.                                                               | Time changes once, `movedByClient=true`, and an `EventReschedule` plus audit entry is written.                                                        | A second move or completed event should be rejected safely.                                                                          |

### Reporting, security, and account lifecycle

| Step               | Account                  | Path                                    | Action                                                                                 | Expected result                                                                                     | Failure diagnostics                                                         |
| ------------------ | ------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Coach reports      | Coach                    | `/coach` and client detail              | Reopen after client logging.                                                           | Compliance, recent activity, bodyweight, and workout information reflect the client’s real changes. | Compare scheduled versus completed records and date range/timezone.         |
| Audit              | Administrator            | `/admin/audit`                          | Review provisioning and workflow events.                                               | Each event shows its genuine actor; no “effective user” or impersonation concept exists.            | Missing entries indicate mutation transaction failure or an unaudited path. |
| Cross-role routes  | Each account             | `/admin`, `/coach`, `/client`           | Attempt the other roles’ routes.                                                       | Only the permanent role’s workspace opens; other routes redirect safely through `/app`.             | Any cross-role page rendering is a security failure.                        |
| Cross-tenant IDs   | Coach/client             | Guess another client/workout ID         | Open or submit it.                                                                     | Safe not-found/authorization response without account details.                                      | Any foreign record disclosure is a security failure.                        |
| Disabled coach     | Administrator then coach | `/admin`, then coach `/app`             | Disable the coach and refresh its session.                                             | Workspace unavailable; no coach operations succeed. Re-enable only to continue testing.             | Inspect database status and session recovery result.                        |
| Deleted Clerk user | Clerk Dashboard          | Delete only a disposable test identity. | `user.deleted` archives and unlinks the application user; later access is unavailable. | Inspect webhook attempt and `CLERK_USER_SOFT_DELETED`. Do not use the real administrator.           |

## 4. Desktop and mobile visual review

Open every major route at approximately 1440 px and 390 px widths. Capture screenshots and check:

- No horizontal overflow, clipped dialogs, or unreachable form controls.
- Navigation remains understandable and tap targets are comfortably sized.
- Headings, primary actions, status badges, tables/cards, errors, empty states, and loading states have consistent hierarchy.
- Keyboard focus is visible; dialogs and forms work without a mouse.
- Charts show only database-backed values and explain empty ranges.
- Today’s client actions remain above secondary compliance/history information.

## 5. Recovery and repeatability

- Failed/missed webhook: first retry the delivery from Clerk. Opening `/app` also performs verified session recovery for an already provisioned exact email.
- Controlled operator fallback after verifying the Clerk user and database record:

```powershell
npm.cmd run db:link-clerk-user -- --email "EXACT_PROVISIONED_EMAIL" --clerk-user-id "user_CLERK_ID"
```

- Do not use `prisma migrate reset`, `prisma db push`, the broad seed, or manual production deletes.
- Repeat testing by scheduling new dated assignments through the real coach UI rather than resetting production data.

## Compact regression checklist

- Three separate Clerk sessions route to `/admin`, `/coach`, and `/client`.
- Unknown public signup receives no application role.
- Coach/client emails match their pre-provisioned normalized addresses.
- Coach sees only owned clients; client sees only their own records.
- Workout, nutrition, supplement, bodyweight, reschedule, reporting, and audit flows persist.
- Disabled/deleted users are denied safely.
- Public and authenticated routes work at desktop and mobile widths.
- No demo/testing route, role switch, test cookie, reset control, or impersonation language exists.
