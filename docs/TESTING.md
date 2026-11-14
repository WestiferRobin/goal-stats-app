# Frontend testing

Use the existing scripts with installed dependencies (Node.js 24 for host tests):

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
```

Playwright requires a running frontend. Set `APP_TEST_BASE_URL` to an owned temporary
server; `PLAYWRIGHT_CHANNEL=chrome` can use installed Chrome. Do not install packages
or change persistent infrastructure merely to run verification. `make test` remains
the normal Docker-backed contributor check; `make _e2e` owns its temporary frontend
images/resources. See the existing scripts before running infrastructure workflows.

## Suite selection

- Unset `APP_E2E_MODE`: current Home and static Demo tests.
- `APP_E2E_MODE=demo`: static Demo tests only.
- `APP_E2E_MODE=football-live`: preserves selection of `live-football.spec.ts`.
  That historical optional test still expects the former live Demo, 32 teams and a
  prototype prediction POST. It is not normalized integration certification and is
  incompatible with the now-static Demo; do not use it as a current release gate.
- `APP_E2E_MODE=normalized`: owned disposable Tasks 7/10 integration suite described below.
- `live` and all other values fail explicitly rather than selecting default tests.

No normalized real-persistence suite is currently registered under football-live.
Independent normalized certification must use an explicitly owned disposable Flask,
PostgreSQL, Redis and frontend stack. Never send automated writes to development data.

## Coverage and ownership

Home tests verify Esteban's actual hero, feature cards, navigation, calls to action,
responsive layout and absence of legacy requests/forms. LandingView is tested
directly as preserved inactive UI. Root composition is tested separately.
Informational pages `/about`, `/blog`, `/project` are implemented; the navigation
tests do not replace acceptance checks for their content.

Default navigation tests intercept only approved read-only catalog/scenario calls.
Demo tests verify the historical label, preserved presentation, disabled controls,
product navigation, no API calls, and CSP restrictions including without JavaScript.
They no longer mock successful retired prediction/snapshot operations.

Vitest includes all src tests. Restored Item/Action helpers/forms retain isolated
mocked tests; those do not prove compatibility with the current Flask API. Football
unit tests cover normalized mapping, validation, persistence state and failure paths.

`scripts/test-home.sh` is retired and exits nonzero before environment setup, Docker,
migrations or process startup. Its original script body, Compose file and live-home
suite remain historical references. Do not reenable the frozen Item/Action backend.
No skips, retries or timeout increases are used to hide incompatible expectations.

## Shared local lifecycle checks

`make test` also runs `node --test scripts/development/*.test.mjs`. These tests
use temporary configurations and fake command executables, never live Docker
teardown. Coverage includes configuration preservation, rejected overrides and
symlinks, occupied ports, setup without service startup, native child termination,
Docker deployment without host Node/npm, build-before-up ordering, startup failure,
and frontend-only shutdown without volume deletion.

`python3 scripts/test-local-compose.py` checks resolved Compose configuration
without starting services. It accepts the extra_hosts serialization used by both
Compose 2.22 and newer releases. Local Docker always targets the host gateway;
remote HTTPS configuration remains a native/hosted option.

Before integration approval, run these checks plus lint, TypeScript, unit/component
tests, and `npm run build` in production build mode. Verify native startup with
Node 24.x and Docker deployment separately, including actual Compose 2.22.0.
Use configured free ports and read-only backend requests for browser Teams checks.
Do not manage the backend, seed data, or modify shared databases from this suite.
The implementation transfer alone does not establish that these checks pass.

## Verified runtime policy

Use Node.js 24.22.3 and npm 11.19.1. Supported policy: Node >=24.22.3 <25 and npm >=11.19.1 <12. With nvm, run `nvm install` then `nvm use` in this repository; other version managers may select the same version. This selection is per project, so another project can keep Node 26. Docker uses the pinned official Node 24 Debian slim image; deploy/stop need no host Node. Verify the Vercel project runtime is aligned to Node 24 before deployment; this change does not alter Vercel settings.

Security update baseline: Next/eslint-config-next 16.4.6, React/React DOM 19.2.9, Vitest 4.1.12. Compatible lockfile refreshes patch sharp, source-map-js, Undici, Vite, Zod and brace-expansion. Seven moderate development-only audit entries remain in the TypeScript-ESLint/minimatch dependency chain; no production advisories remain. Do not force a minimatch major override or an ESLint major migration to suppress them. Recheck npm audit before release.

## Normalized application browser suite (Tasks 7 and 10)

Run `make _e2e-normalized` (equivalently `python3 scripts/test-normalized.py`).
Requires Python 3 on the host, Docker with build/network access, and the sibling
`../goal-stats-service` checkout. Both checkouts must already be on `member/wes`.
The runner records both HEADs and dirty-file lists; it never switches branches.
It builds the current backend runtime and a Python 3.12 Chromium runner.
The normalized runner uses the same immutable Node 24.22.3 image digest as the main
Dockerfile and asserts Node 24.22.3 and npm 11.19.1 before preparing its database.
No host Node or browser installation is used. Image dependency installation
occurs only inside the disposable image. Existing Home/Demo suites remain unchanged.

The runner creates a unique `goalstats-normalized-<UUID>` Docker network and labeled
containers. PostgreSQL and Redis use tmpfs, no persistent volumes and **no published
host ports**. Flask and Next.js run on loopback inside the runner. The real Next.js
proxy forwards to Flask; no service-token bypass is added to production policy.
Next runs in development because the existing proxy permits local HTTP only in
that mode. A production build is checked separately before browser execution.
Setup warms the exercised routes so initial development compilation is outside
browser interaction assertions; no assertion timeout is increased.

No user-supplied database URL, backend URL, token, `.env.local`, Compose project or
base URL is accepted. The launcher injects `NORMALIZED_SESSION`, `APP_ENV=test`, a
unique `DATABASE_URL`, `REDIS_URL` and `FOOTBALL_API_BASE_URL` into its own runner.
The runner sets `APP_E2E_MODE=normalized` and `APP_TEST_BASE_URL=http://127.0.0.1:3000`.
Do not invoke this mode against a manually supplied server. Its configuration and
suite require an owned setup receipt. `PLAYWRIGHT_CHANNEL` is not needed; the image
installs the Chromium version associated with the locked Playwright dependency.

Setup verifies the database name/session and refuses any preexisting tables before
applying Alembic. It mounts only the approved checksum-pinned source directory
read-only, imports all nine editions with the backend importer, and asserts
44 teams, nine editions, 348 matches and 1,081 goals. It also checks three historical
summaries and five exact v2 previews. Synthetic scenario records support pagination:
49 real generated v2 records and one frozen v1 record with remapped catalog/scenario
identities (no changed model numbers), all in the disposable database.

Successful feature paths use the real API. Explicit Playwright response faults
exercise catalog empty/error/loading, delayed stale responses, an empty later
comparison page, rejected save and a response lost **after** real generation.
These fault-injection cases do not certify naturally occurring empty seeded data.
A separate case stops and restarts only the runner's Flask process to verify real
proxy outage recovery. Writes never target development or production data.

Each run first executes lint, typecheck, all frontend unit/component tests and a
production build, then the normalized browser suite with one worker and no retries.
The existing Home/static Demo tests run separately afterward.
Vitest also uses one worker to avoid CPU contention in Docker; timeouts are unchanged.
The suite covers Teams acceptance totals and pagination, Matches filters/pages,
v2 minute boundaries, preview non-persistence, save/reopen/PATCH preservation,
mixed histories, later-page emptiness, and failure/retry safeguards. It does not
perform human acceptance or enable tournament execution.

Artifacts remain under `artifacts/goalstats-normalized-<UUID>/`: repository baseline,
seed receipt, runtime/browser versions, check/service logs, Playwright JSON/HTML
reports, failure screenshots/traces and cleanup receipt. Open the HTML report with
`npx playwright show-report <artifact-directory>/playwright-report` using installed
dependencies. A setup failure means browser execution did not pass; inspect logs.
Never interpret test discovery, mocked component tests or a successful build as
successful real integration.

Cleanup verifies session labels before deleting only the recorded container IDs
and network; it never runs development Compose teardown or prunes Docker. Only
unique images built by that invocation are untagged. Existing volume names must
remain present. Interrupted runs retain logs; ownership failures stop cleanup and
report failure rather than deleting uncertain resources. SIGKILL/host failure may
leave resources: use the recorded IDs and labels to inspect them before cleanup.
