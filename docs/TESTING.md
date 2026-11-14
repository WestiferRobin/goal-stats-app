# Frontend testing

Use the existing scripts with installed dependencies (Node.js 22 for host tests):

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
Node 22.x and Docker deployment separately, including actual Compose 2.22.0.
Use configured free ports and read-only backend requests for browser Teams checks.
Do not manage the backend, seed data, or modify shared databases from this suite.
The implementation transfer alone does not establish that these checks pass.
