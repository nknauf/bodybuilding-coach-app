# Browser verification

## Executable smoke coverage

This intentionally small Playwright suite checks the public landing page and the fictional, browser-local coach/client demo. It does **not** establish authenticated product behavior, persistence, tenant isolation, or production readiness.

`@playwright/test` is a locked dev dependency. Configure an isolated HTTPS staging
deployment as GitHub environment variables `E2E_BASE_URL` and `E2E_APPROVED_HOST`,
protect the `staging` environment, then manually dispatch
`.github/workflows/staging-smoke.yml`. To run locally, explicitly provide an
approved isolated staging host:

```sh
npx playwright install chromium
E2E_ALLOW_REMOTE=1 E2E_APPROVED_HOST=staging.example.test \
  E2E_BASE_URL=https://staging.example.test npm run test:e2e
```

The config requires an explicit HTTPS hostname allowlist and refuses absent targets, credentials, paths, query strings, and unapproved hosts. Explicitly allowlisted localhost or IP targets are not categorically rejected. It runs the smoke journey as desktop and mobile Chromium. Playwright's trace, screenshots, and video are disabled. Results are directed to `/tmp/more-sore-e2e-results` by default. Set `E2E_SYNTHETIC_ARTIFACTS=1` only to retain artifacts for this fictional demo journey; never use that option with real-user data. The workflow passes no provider keys and tests public demo pages only.

Remote targets are rejected unless `E2E_ALLOW_REMOTE=1`, `E2E_APPROVED_HOST` is set to the exact target hostname, and the target uses HTTPS. The host must be explicitly approved by the operator; this switch is not a substitute for checking that a staging target is isolated and safe.

## Remaining acceptance scenarios (not covered / blocked)

Authenticated admin, coach, and client browser acceptance—including cross-tenant access-denial cases and persisted writes—remains blocked until isolated provider identities and corresponding isolated test data exist. No staging credentials are assumed or embedded here. Once those identities exist, add separately-scoped scenarios that verify:

- Admin provisioning and tenant membership without accessing another tenant's records.
- Coach scheduling/editing and client-visible results, including attempts to access a different coach's client.
- Client workout, reschedule, day/nutrition logging and persistence across reload, plus rejection of writes outside the assigned client scope.
- Sign-in/session recovery and explicit authorization-denial states for each role.

Do not mark any of these scenarios passed until the browser actually executes against the isolated identity/data setup. Do not save traces, screenshots, videos, storage state, or other artifacts containing real-user or credential material. Keep authenticated artifacts disabled or synthetic-only and scrub any accidental sensitive artifacts before sharing or retention.
