# GoalStats frontend

Goal Stats has two repositories:

- `goal-stats-app` is the website users interact with.
- `goal-stats-service` is everything behind the website: the API, football logic,
  database access, migrations, and starter data.

The simple request flow is: browser → `goal-stats-app` → `goal-stats-service` →
database and football logic. This repository is `goal-stats-app`.

## Start here

Install Git, GNU Make, Docker with Compose V2 (target compatibility: 2.22.0), and host Node.js
22.x with npm for native development. Docker-only deployment does not require host Node/npm. Clone both repositories side by side.

### Native development

In the backend repository, run `make setup && make run` in its own terminal.
In this frontend repository, run `make setup && make run` in another terminal.
Both native servers run in the foreground and stop with Ctrl+C. Frontend startup
never starts, stops, migrates or seeds the backend.

### Local Docker deployment

In the backend repository, run `make setup && make deploy`.
In this frontend repository, run `make setup && make deploy`. For Docker-only
development without host Node, copy `.env.example` to `.env.local` only if the
local file does not already exist, then run `make deploy`.
These are separate alternatives to native development: run lifecycle commands
sequentially, and do not run native and Docker frontends on the same port.

Open the URL printed by the frontend command. `APP_PORT` in `.env.local` defaults
to 3000; choose 3001 when port 3000 belongs to Prizm Hub or another application.
Do not stop the unrelated application. `/teams` browses the backend catalog;
`/api/football/catalog/teams` returns 44 teams when the approved dataset is loaded.
The frontend does not load historical data itself.

| Command | Meaning |
| --- | --- |
| `make setup` | Preserve/create configuration, install host dependencies, build Docker images; start nothing |
| `make run` | Run native Next.js in the foreground with hot reload; no Docker calls |
| `make deploy` | Build/start the local Docker frontend and wait for readiness |
| `make test` | Run ESLint, TypeScript, unit/component and lifecycle checks |
| `make stop` | Stop only frontend Docker resources; preserve volumes; native mode uses Ctrl+C |
| `make help` | Display commands, modes and URL guidance |

## Current product state

| Route | Current state |
| --- | --- |
| `/` | Esteban's Women's World Cup HomeView and navigation |
| `/matches` | Historical browsing, hypothetical preview, saved scenario editing |
| `/predictions` | Scenario discovery, explicit saving, immutable prediction history |
| `/teams` | Historical catalog and dated comparisons; unknown strengths/ranks stay null |
| `/analytics` | Saved prediction charts; tournament/backtesting execution deferred |
| `/demo` | Historical/static reference, no live requests or saves |

`/about`, `/blog` and `/project` are implemented informational pages and remain unchanged.
LandingView and the restored Item/Action modules remain inactive reference material.

The Phase 1 direction remains Home, Matches, Predictions, Teams, and Analytics.
The Product Decisions document remains the product/scope authority. Infrastructure
simplification does not make unfinished routes complete.

## Configuration

`.env.example` documents explicit backend configuration. `make setup` creates the ignored
`.env.local` only when it is missing and never overwrites an existing file.

```dotenv
APP_PORT=3000
FOOTBALL_API_BASE_URL=http://127.0.0.1:5100
SERVICE_API_TOKEN=
```

`FOOTBALL_API_BASE_URL` is read only by the existing Next.js `/api/football` proxy,
which forwards the fifteen approved operations to Flask `/api/v1`. Flask owns five
domains: Team, Competition, Match, Scenario and Prediction. Home and the static Demo
need no API configuration. `SERVICE_API_BASE_URL` belongs only to inactive legacy
Item/Action reference code; it is not required for the product.

### Vercel / Render deployment

Use the existing Next.js application without Docker: framework **Next.js**, root
**.**, Node.js **22.x**, install **npm ci**, build **npm run build**, framework-default
output directory. Deploy the reviewed committed integration branch; finish the
existing Git reconciliation separately before deploying. No deployment is implied here.

Configure these server-only values in the approved Vercel environment scope:

```dotenv
FOOTBALL_API_BASE_URL=https://goal-stats-service.onrender.com
SERVICE_API_TOKEN=<private matching Render credential>
```

The browser calls `/api/football/*`; the route handler reads the origin at request
time and forwards to Render `/api/v1/*`. It does not automatically discover Render.
Use the bare origin without `/api/v1`. The token must contain at least 32 printable
ASCII characters without whitespace; it is never trimmed. The server injects it
only for approved POST/PATCH operations, ignoring browser Authorization. Missing or
malformed required credentials fail with sanitized 503 before forwarding. Public
GETs need no credential. Upstream 401, 403 and 429 retain safe status messages.

Local Next.js targeting Render also requires this token for protected requests.
Outside Vercel and NODE_ENV=production, explicit loopback Flask origins (localhost,
127.x.x.x or ::1) may use HTTP and omit the token. With NODE_ENV=development,
the exact Docker origin `http://host.docker.internal:5100` also needs no token.
Vercel and production reject both local destinations. All other destinations require
HTTPS and a public DNS hostname; IP literals, single-label names, and .localhost,
.local or .internal names are rejected. Production builds/servers require the cloud
policy even when run locally. No fallback origin is selected. DNS resolution itself
is delegated to fetch; configured DNS and deployment environment remain trusted.

Preview deployments require an approved backend and explicitly scoped variables;
do not give untrusted previews the production credential. Never use NEXT_PUBLIC_,
React props, browser storage, URLs or logs for the token. Changes to Vercel variables
require a new deployment. Validate actual function duration against the proxy's
30-second upstream timeout and Render cold-start behavior before deployment.

For the October 19 classroom PoC, visitors may preview, create/save and edit shared
scenarios without accounts. Saved records are public and editable by other visitors;
there is no individual ownership. Service authentication identifies Next.js, not the
visitor. Repeated writes consume resources; no reliable distributed rate limiter has
been verified. Existing request validation and the 32768-character body cap remain
(the cap is checked after reading the body, not a streaming byte limit). Any required
shared abuse enforcement is a separate deployment decision. User authentication and
ownership remain future product work; no account framework is introduced here.

## Native and Docker configuration

Use Node.js 22.x for native development, matching the pinned Docker runtime major.
`make run` validates `.env.local` and launches Next.js on its explicit `APP_PORT`;
it does not silently select another port. Raw `npm run dev` does not read `APP_PORT`
as its listening port or perform the lifecycle checks; use `make run`.

Keep the host-facing `FOOTBALL_API_BASE_URL=http://127.0.0.1:5100` in `.env.local`.
Container port 8000 is not the published host port. `make deploy` selects
`http://host.docker.internal:5100` inside Docker and supplies the development-only
proxy flag. Switching modes does not require changing the backend URL. Explicit
remote HTTPS origins and their server token remain supported in native/hosted mode;
local Docker deployment always targets the local backend.

Existing `.env.local` is preserved, not automatically repaired. If it contains a
Docker alias or port 8000, correct it privately before native startup. Inherited
conflicting configuration is rejected with values omitted. For Docker lifecycle
commands, unset exported APP_PORT, FOOTBALL_API_BASE_URL and SERVICE_API_TOKEN;
configure them in `.env.local` instead. Never commit that file or credentials.

After changing native configuration, stop that frontend with Ctrl+C and rerun
`make run`. Recreate Docker frontend configuration with `make deploy`. Stop Docker
frontend resources with `make stop`; volumes and backend services remain untouched.
Both localhost and 127.0.0.1 browser origins retain master's development support.

## Where to work

| Location | Purpose |
| --- | --- |
| `src/app/` | Routes and Next.js server endpoints |
| `src/features/` | React product features and components |
| `src/components/` | Shared frontend components |
| `src/demo/` | Preserved historical presentation; live controls disabled |
| `src/app/api/football/[...path]/route.ts` | Server-side Flask proxy |
| `tests/` and `*.test.ts(x)` | Browser, unit, and component tests |

See [architecture](docs/ARCHITECTURE.md), [development internals](docs/DEVELOPMENT.md),
and [testing](docs/TESTING.md) for maintainer detail.

## Common first-run errors

- Docker connection error: start Docker Desktop and wait for it to finish starting.
- Port already allocated: select another APP_PORT in .env.local; do not stop unrelated applications.
- `Football service is not configured.`: check the server-only origin, execution
  mode, and (for remote POST/PATCH) the service token. Local Docker must use exactly
  `http://host.docker.internal:5100` in development; host development uses loopback.
  Production requires the approved HTTPS service. Restart Next.js after changes.
- Football proxy returns an unavailable/connection error: check that local Flask
  is running on port 5100 and reachable from the frontend environment.
- Changes do not appear: confirm the frontend container is running, then repeat
  `make deploy` for Docker configuration changes; use `make setup` for dependency changes.

## Verify local football workflows

After starting and seeding the backend using the `goal-stats-service` README,
open `/api/football/catalog/teams`, then `/teams` and `/matches`. Confirm teams,
dated historical scores and team comparisons load. A successful empty catalog or
history can indicate that historical data has not been seeded; check the backend
seed instructions and selected teams/filters. An error is not evidence of an empty
dataset: Teams displays the request error and offers Refresh instead of claiming
no imported history exists.

In Matches, select two teams, enter explicit hypothetical strengths and generate a
prediction preview. Confirm `/api/football/predictions/preview` succeeds in the
browser network panel. Local host and Docker development require no service token.
Saved scenarios and predictions continue to use the existing backend contract;
this setup does not add historical-summary endpoints or infer unknown ratings.
