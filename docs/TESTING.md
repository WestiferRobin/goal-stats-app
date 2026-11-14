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
directly as preserved inactive UI. Root composition is tested separately. Missing
informational destinations `/about`, `/blog`, `/project` are preserved links, not
asserted to be implemented pages.

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

## Local Docker backend configuration

The local Compose service reads `FOOTBALL_API_BASE_URL` and `SERVICE_API_TOKEN`
from `.env.local` through explicit environment interpolation. For Flask on the Mac
host, use `FOOTBALL_API_BASE_URL=http://host.docker.internal:5100`. The example
frontend port is 3001; change `APP_PORT` if needed. Do not use container loopback to
reach the host. Existing environment files are preserved by `make setup`.

Compose sets the server-only `GOALSTATS_LOCAL_DOCKER=1` flag. The proxy accepts the
exact HTTP Docker hostname on port 5100 only in development outside Vercel.
Production restrictions remain active regardless of that flag. Explicit public
HTTPS backends remain supported; remote POST/PATCH requests require the matching
server-only `SERVICE_API_TOKEN`. Public catalog GETs do not send credentials.

Run `python3 scripts/test-local-compose.py` to check resolved local/remote Compose
configuration without starting services. Proxy and Teams error/loading regressions
run with `npm run test:unit`. After changing `.env.local`, recreate the frontend
with `make run`; this does not start, migrate, or seed the backend.
