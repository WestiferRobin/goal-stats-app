# Testing

## Established layers

This scaffold originally had no tests or runners. This change establishes Vitest
with Testing Library/jsdom for source tests and Playwright/Chromium for browser
E2E. These are new tooling, not a migration from an existing runner. npm remains the
package manager; the lockfile records the required dependency additions/repair.

```bash
make unit
make test
make test E2E=false
make test E2E=true
```

The first three run the same source suite. E2E=false is the default. E2E accepts
exactly true or false; values such as yes, 1, and empty strings fail before resources
are created. `make unit` always excludes E2E, even if E2E=true is supplied.
The separate `make test-home` mode owns disposable live integration; App has no application migration target.

## Source discovery

Vitest includes `src/**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs,cts,cjs}` and excludes
browser tests under tests/e2e. New source tests matching the pattern are discovered
automatically; no Makefile edits are needed. Missing tests fail rather than silently
passing. Home component checks live beside `HomeView` in `src/features/home/components`.
They cover empty/populated/selected/unavailable Home states. HTTP, environment,
feature API and Server Action tests sit beside their owners. API tests stub the
shared HTTP boundary; production never uses fake backend dispatch.

Tests run in a network-disabled tooling container. The lockfile is installed while
building the image, before the test process starts. Host Node/npm is not used.

## Browser E2E

`make test E2E=true` first runs the source suite. Only if it passes does the helper
build the standalone runtime and a separate browser-tooling image, then start an
isolated app and run tests/e2e with Chromium. No host ports are published, and no
LOCAL/DEV state, database, backend, or other repository is used. Playwright's base
URL is explicitly set to the test network's app-under-test:3000.

The browser checks verify the rendered page/title without browser runtime errors,
the built GoalStats icon, recoverable missing-backend state, and narrow/wide layouts. This is standalone
coverage. The separate live Home workflow below proves the real frozen Flask contract.

The browser stage installs the browser matching the locked Playwright package.
Browser tooling does not enter the production runtime image, and ordinary source
tests do not build/download browsers.

## Failure and cleanup

Scripts retain runner failures and stop before E2E when source tests fail. GNU Make
reports a nonzero recipe failure rather than promising the runner's exact numeric
exit status at the outer Make boundary. Cleanup removes owned runners, app containers,
networks, and temporary image tags on success, failure, INT, and TERM. Failure prints
bounded app logs. Docker build cache can remain for reuse. An uncatchable kill or
unavailable daemon can prevent cleanup; recover only the reported app-test-* project.

Runner output is streamed. Playwright failure traces inside the disposable runner
are not retained by the Make wrapper; use raw tooling with an intentional output mount
if persistent traces are needed.

## Advanced runner use

With compatible host tooling installed:

```bash
npm run test:unit
npm run test:unit -- src/features/home/components/home-view.test.tsx
npm run test:e2e
```

Raw E2E expects an explicitly prepared app at APP_TEST_BASE_URL, defaulting to
http://127.0.0.1:3000. This raw default does not apply to normal Make E2E, which always
creates its own isolated app. Playwright is not configured to start a second server.

## Disposable live Home

```bash
TEMPLATE_SOURCE=/path/to/template-goalstats-service make test-home
```

This requires a local Git object for frozen commit
`6600facf42ecf9a3431b44f5d19ff2ac2a3b0b07`. The script archives that exact commit
into temporary build context; it neither edits nor runs setup in Template's checkout.
It builds App/Template images, starts owned PostgreSQL/Redis without published ports,
migrates, and runs browser create/list/select/reload/validation checks. It restarts
PostgreSQL while retaining its disposable volume, restarts Redis and Flask, verifies
persistence, stops Flask to verify safe unavailable UI, then verifies recovery.

All names are unique to this run. The EXIT/INT/TERM cleanup removes its containers,
network, PostgreSQL volume, temporary image tags and archive directory. Docker build
cache can remain. No developer LOCAL/DEV database or Parent resources are used. If
forcibly killed or Docker becomes unavailable, recover only the printed project.

Standalone and live modes select separate Playwright files, without skipped tests.
The browser talks only to Next; test-runner HTTP queries verify record counts after
rejected submissions. Live test failures fail the command; there are no fake success
fallbacks. Auth/session tests do not exist because AUTH BACKEND NOT READY.

Live responsive screenshots remain under ignored `artifacts/<owned-project>/` for
visual review; they contain only disposable demo records. Container resources are
still removed automatically.
The disposable Template container sets `XDG_RUNTIME_DIR=/tmp` so Gunicorn's
control socket has a writable container-local directory; backend sources stay frozen.
