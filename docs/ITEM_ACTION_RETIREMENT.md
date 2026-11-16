# Item/Action retirement and current preservation status

## Current application

Esteban's HomeView is active through direct root composition. LandingView is retained
but inactive. All restored Item/Action API/domain/form/environment files and isolated
mocked tests remain historical references; they are not supported Flask domains and
are not imported by active pages. Do not add Item/Action endpoints or map UUIDs onto
normalized football IDs. `SERVICE_API_BASE_URL` is not required by the product.

The legacy Home runner now exits before setup/provisioning. Its old body, Compose
file and live suite are preserved. Unsupported Playwright modes fail explicitly.
Demo is historical/static, with no live calls or saves. The React product uses the
fifteen normalized operations for Team, Competition, Match, Scenario and Prediction.
Tournament/backtesting execution is deferred; informational links await pages.

## Historical retirement record (not current verification)

The following original record describes an earlier branch/runtime state. Its claims
about deleted files, prototype APIs, migration heads and verification results are
historical only; restoration and normalized integration superseded them. Current
architecture and test behavior are documented in ARCHITECTURE.md and TESTING.md.

# Frontend Item/Action retirement — Prompt 3

## Scope and ownership

Frontend branch: `member/wes`; starting HEAD: `aebad28`. The starting worktree was
clean, with no staged files or overlapping teammate changes. This phase changes
only `goal-stats-app`; it does not migrate or deploy the backend.

Home was the only active Item/Action consumer: its feature API clients called
GET/POST `/items` and GET/POST `/items/<id>/actions`, its server actions created
records and redirected, and its forms/views displayed those records. Its decoder,
types and error mapping had no other feature consumers. The server environment
reader and its variable were exclusive to those clients. Shared HTTP transport,
error handling, navigation, football proxy and demo are retained.

## Current behavior

`/` renders a minimal static landing view with the existing shared navigation and
an `/demo` link. It has no data fetching, server actions, forms or backend dependency.
This is not a new dashboard or a completed product design. Matches, Predictions,
Teams and Analytics remain their existing teammate-owned scaffold views.

Removed the legacy Home API/domain/form modules and their exclusive tests, the
Home-only environment reader/tests, and the frozen legacy backend persistence
harness (script, Compose file, private Make target and live Home test). Public
Make commands are unchanged. The old environment variable is no longer required
or forwarded by Compose; existing ignored local environment files are untouched.
`FOOTBALL_API_BASE_URL` remains server-only configuration for the existing proxy.

The shared HTTP client's tests use neutral resource fixtures without changing
transport/error assertions. Home tests check navigation, no fetching/forms, layout,
and the icon. Football proxy tests retain missing configuration and sanitization
checks and additionally cover invalid upstream URLs. Default browser tests include
Home and the unchanged mocked demo tests. The optional live-football suite remains
unchanged and requires its own explicitly authorized disposable backend.

## Backend compatibility and release boundary

Prompt 2's current route inventory and the running backend OpenAPI document were
inspected read-only. The twelve retired operations are absent. All twelve normalized
catalog/scenario/saved-prediction operations in the request remain available, along
with prototype teams, predictions, history, snapshots, insights, backtests,
tournaments and live refresh. The proxy continues forwarding only its existing
prototype allowlist to `/api/v1`; no normalized proxy routes or screens were added.

The backend's persistent database intentionally remains on `a7c93e25d104`, while
its new repository head is `c8d42f19e630`. Its existing bind-mounted local app
previously auto-reloaded the retirement source, and its image still has the old
migration chain. Frontend removal does not resolve that runtime/schema mismatch.
Do not run persistent migration/startup preparation, rebuild shared stacks, or
interpret frontend success as coordinated release certification. Prompt 4 must
resolve runtime isolation and coordinate deployment of backend code and schema.

## Verification results

- Focused Node 22 Docker tests: 26 passed, 0 failed, 0 skipped.
- Full `make _e2e`: ESLint and TypeScript passed; all 26 unit/component tests and
  all 7 Chromium Home/demo tests passed, with no failures or skips.
- Production standalone build passed. Home is prerendered static content without
  backend configuration. No separate formatting command is configured.
- Initial host Node 20/jsdom execution failed to start a component-test worker;
  the supported Node 22 Docker environment passed. A TypeScript test-option error
  was corrected before the successful complete run.
- A separate disposable frontend made only GET requests through the unchanged
  proxy: teams (32), history (16), Spain/England snapshots (0) and insights all
  returned 200 and matched direct backend responses. An initial snapshot probe
  omitted required team parameters and correctly returned 400; the corrected
  request passed. No backend write endpoints were exercised.
- The optional live-football write suite was not run; it requires a separately
  authorized disposable backend. Its tests remain unchanged.
- No active legacy API consumers or server actions remain. Remaining legacy
  references are this retirement inventory and a test proving the old environment
  variable is unnecessary.
- Demo assets/routes/tests, shared navigation, teammate feature source, production
  HTTP client/proxy and dependency manifests match their starting hashes.
- Backend file hashes, Git HEAD/status, all persistent PostgreSQL row counts and
  full-record digests, existing Docker identities/states and volume inventory match
  the pre-task snapshot. Temporary frontend test containers/images were cleaned up.
- Frontend branch/HEAD remain `member/wes` / `aebad28`; nothing staged, committed,
  pushed or deployed. Diff checks pass.

Ready for Prompt 4 certification. The existing backend runtime/migration mismatch
still needs coordinated resolution; no persistent migration is authorized here.

## Phase-specific file inventory

### Created (3)

- `docs/ITEM_ACTION_RETIREMENT.md`
- `src/features/home/components/landing-view.test.tsx`
- `src/features/home/components/landing-view.tsx`

### Modified (16)

- `.env.example`
- `Makefile`
- `README.md`
- `docker/compose.dev.yml`
- `docker/compose.local.yml`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/TESTING.md`
- `playwright.config.ts`
- `scripts/develop.sh`
- `src/app/api/football/[...path]/route.test.ts`
- `src/app/page.tsx`
- `src/features/README.md`
- `src/features/home/README.md`
- `src/lib/api/client.test.ts`
- `tests/e2e/home.spec.ts`

### Deleted (21)

- `docker/compose.home-test.yml`
- `scripts/test-home.sh`
- `src/features/home/api/actions.server.test.ts`
- `src/features/home/api/actions.server.ts`
- `src/features/home/api/decode.server.ts`
- `src/features/home/api/home-api.test.ts`
- `src/features/home/api/items.server.test.ts`
- `src/features/home/api/items.server.ts`
- `src/features/home/components/action-form.test.tsx`
- `src/features/home/components/action-form.tsx`
- `src/features/home/components/home-view.test.tsx`
- `src/features/home/components/home-view.tsx`
- `src/features/home/components/item-form.test.tsx`
- `src/features/home/components/item-form.tsx`
- `src/features/home/domain/actions.test.ts`
- `src/features/home/domain/actions.ts`
- `src/features/home/domain/errors.ts`
- `src/features/home/domain/types.ts`
- `src/lib/env/server.test.ts`
- `src/lib/env/server.ts`
- `tests/e2e/live-home.spec.ts`
