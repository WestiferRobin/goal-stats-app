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

First start the backend in another terminal:

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

Leave both terminals running and open <http://127.0.0.1:3000/demo>. Select two
different teams, click **Update Prediction**, and confirm the probabilities and
scorelines update. As an additional check,
<http://127.0.0.1:3000/api/football/teams> should return the same 32 teams as the backend.

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
| `/demo` | Working Goal Stats football proof of concept |
| `/` | Legacy Item/Action reference application |
| `/matches` | React product scaffold under development |
| `/predictions` | React product scaffold under development |
| `/teams` | React product scaffold under development |
| `/analytics` | React product scaffold under development |

The Phase 1 direction remains Home, Matches, Predictions, Teams, and Analytics.
The Product Decisions document remains the product/scope authority. Infrastructure
simplification does not make unfinished routes complete.

## Configuration

`.env.example` documents the safe local defaults. `make setup` creates the ignored
`.env.local` only when it is missing and never overwrites an existing file.

```dotenv
APP_PORT=3000
FOOTBALL_API_BASE_URL=http://127.0.0.1:5100
SERVICE_API_BASE_URL=http://127.0.0.1:5100
```

`FOOTBALL_API_BASE_URL` powers Goal Stats. `SERVICE_API_BASE_URL` remains temporarily
for the legacy Item/Action page. Both are read only by Next.js on the server. Docker
translates these addresses internally, so the same `.env.local` works in either
frontend workflow.

## Optional: run the frontend on your machine

Docker through Make is the recommended workflow. Frontend developers may instead
install Node.js 22 and npm, leave `goal-stats-service` running through Docker, and
run this repository directly:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000/demo>. This uses the same `.env.local`; do not change
the backend URLs when switching between host and Docker frontend development.

## Where to work

| Location | Purpose |
| --- | --- |
| `src/app/` | Routes and Next.js server endpoints |
| `src/features/` | React product features and components |
| `src/components/` | Shared frontend components |
| `src/demo/` | Working football proof of concept |
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
