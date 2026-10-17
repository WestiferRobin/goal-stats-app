# GoalStats frontend

Goal Stats has two repositories:

- `goal-stats-app` is the website users interact with.
- `goal-stats-service` is everything behind the website: the API, football logic,
  database access, migrations, and starter data.

The simple request flow is: browser → `goal-stats-app` → `goal-stats-service` →
database and football logic. This repository is `goal-stats-app`.

## Start here

Install Git, Docker with Compose v2, and GNU Make. Use macOS, Linux, WSL, or native
Windows with Docker Desktop and Git for Windows installed in its standard location.
You do not need to install Node or npm.

Clone `goal-stats-app` and `goal-stats-service` side by side and start Docker.

Home at `/` renders Esteban's Women's World Cup HomeView without a backend.
The Teams, Matches, Predictions and Analytics workflows use the normalized backend.
For an authorized development environment, start it in another terminal:

```sh
cd goal-stats-service
make setup
make run
```

Then, from this repository:

```sh
cd goal-stats-app
make setup
make run
```

Leave both terminals running and open <http://127.0.0.1:3000/>. Use Matches to
select two teams and enter explicit hypothetical strengths before generating a
preview. Predictions saves scenarios and immutable predictions in two steps.
<http://127.0.0.1:3000/api/football/catalog/teams> returns the 44 historical teams.

| Command | Meaning |
| --- | --- |
| `make setup` | Prepare this repository for first use; start nothing. |
| `make run` | Start or restart the frontend website. |
| `make test` | Run normal contributor checks and tests. |
| `make stop` | Stop only this repository's frontend resources. |
| `make help` | Show the beginner commands. |

## Current product state

| Route | Current state |
| --- | --- |
| `/` | Esteban's Women's World Cup HomeView and navigation |
| `/matches` | Historical browsing, hypothetical preview, saved scenario editing |
| `/predictions` | Scenario discovery, explicit saving, immutable prediction history |
| `/teams` | Historical catalog and dated comparisons; unknown strengths/ranks stay null |
| `/analytics` | Saved prediction charts; tournament/backtesting execution deferred |
| `/demo` | Historical/static reference, no live requests or saves |

`/about`, `/blog` and `/project` are preserved informational links awaiting implementation.
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
127.x.x.x or ::1) may use HTTP and omit the token. All other destinations require
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

## Optional: run the frontend on your machine

Docker through Make is the recommended workflow. Frontend developers may instead
install Node.js 22 and npm, leave `goal-stats-service` running through Docker, and
run this repository directly:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000/>. This uses the same `.env.local`; do not change
the backend URLs when switching between host and Docker frontend development.

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
- Port 3000 already allocated: stop the conflicting frontend process/container.
- Football proxy returns 502/503: start `goal-stats-service` on port 5100.
- Changes do not appear: confirm the frontend container is running, then repeat
  `make run` if dependency or Docker configuration files changed.
