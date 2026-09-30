# Development

## First run: React frontend and football backend

The frontend and backend are separate processes. Start both for football API work.
The commands below assume the parent `team-squared-dev` checkout. Use Node 22 for
host frontend tooling, Python 3.12 for the backend, and running Docker Desktop for
PostgreSQL/Redis. Follow the backend README for its full prerequisites.

In terminal 1, from `team-squared-dev`:

```bash
cd backend/template-goalstats-service
make dev
```

The current backend command prepares its environment, starts providers, applies
local migrations, imports datasets, and starts Flask. It can take longer the first
time. Swagger is normally at `http://127.0.0.1:5300/swagger`. Existing settings can
change the port; use the address printed by the backend. Leave this terminal running.

In terminal 2, from `team-squared-dev`:

```bash
cd frontend/goal-stats-app
npm ci
```

Create or edit `.env.local` in the frontend root. Preserve existing entries and
add/update these lines for the host backend above:

```dotenv
FOOTBALL_API_BASE_URL=http://127.0.0.1:5300
HOME_API_BASE_URL=http://127.0.0.1:5300
```

`FOOTBALL_API_BASE_URL` powers football API requests. `HOME_API_BASE_URL` is only
needed to make the preserved Item/Action screen work; it does not configure football.
Neither uses a `NEXT_PUBLIC_` prefix. Do not append `/api/v1` to either base URL.
Do not commit `.env.local`.

```bash
npm run dev
```

Open `http://localhost:3000/` for the existing React reference application and
`http://localhost:3000/demo` for the connected football proof of concept.
New football product UI is being built in React; see the
[architecture guide](ARCHITECTURE.md#react-work-features-organized-by-product-view).

## Verify the connection

These are read-only checks from the host:

```bash
curl --fail http://127.0.0.1:5300/api/v1/teams
curl --fail http://localhost:3000/api/football/teams
```

The first tests Flask and its data directly. The second tests Next's proxy and its
configured backend address. Both should return a team array. In `/demo`, choose
two teams, change a score or minute, and press **Update Prediction**. This calculates
without saving. **Save Snapshot** creates a shared database record; use deliberate
manual saves, not automated tests against a teammate's database.

No API-Football key is required for manual predictions. For provider refresh,
configure `API_FOOTBALL_KEY` in the Flask process environment as described by the
backend guide. It never belongs in frontend code or a public environment variable.

## Vercel deployment

The Next.js app and Flask backend need separate deployments. In the Vercel project,
set `FOOTBALL_API_BASE_URL` to the deployed Flask HTTPS origin for the intended
Preview/Production environment, then redeploy. Set `HOME_API_BASE_URL` separately
if the Item/Action root screen also needs its backend. A Vercel function's
`localhost` is not your Mac; a locally working Flask process is insufficient.

The browser keeps using relative `/api/football/*` URLs. Next adds Flask's
`/api/v1` prefix. Database setup, migrations, imports, and provider credentials are
backend responsibilities. The frontend does not start Flask or import its CSVs.

`next.config.ts` disables standalone output when `VERCEL=1` and retains it for
Docker. Keep this distinction: the Vercel adapter handles packaging, while the
Docker runtime expects `.next/standalone`. Explicit file tracing includes the
HTML/CSS/JS assets read by the `/demo` route handlers.

## Troubleshooting

| Symptom | Meaning and next check |
| --- | --- |
| `/` shows Item/Action instead of football | Expected current route; football reference is `/demo` |
| Football service is not configured (503) | Check `FOOTBALL_API_BASE_URL` in the Next process; restart or redeploy after configuration changes |
| Football service is unavailable (502) | Check Flask is running and reachable from Next; use the two curl checks above |
| Teams are empty or unknown (404 on prediction) | Check migrations and imported datasets in the backend |
| Validation error (400) | Select distinct teams; check stats, possession total, and tournament limits |
| Cross-origin request rejected (403) | Use the same site for page and API; check forwarded host/protocol on a custom reverse proxy |
| Live refresh unavailable (503) | No real live result or cached fallback exists; check Flask provider configuration and selected teams |
| Request timed out (504) | Check backend logs; reload saved history before repeating a save |
| `/demo` shows preview values and disabled controls | It could not initialize against the backend; read the banner and use Reconnect after fixing the connection |
| Unit tests fail during jsdom/undici initialization on older Node | Use Node 22 or the documented Docker test workflow |

A successful frontend build does not prove a deployed backend connection. Validate
`/api/football/teams` and a manual prediction on the deployed site as well.


## Normal container workflow

Run from the repository root. GNU Make 3.81+, Bash, and Docker Compose v2+ are
required; host Node/npm is not required. Setup checks the tools and daemon without
starting containers, building images, running tests, or rewriting configuration.

```bash
make setup
make build
make run
make logs
make stop
```

`build`, `run`, `logs`, and `stop` accept ENV=local or ENV=dev and default to local.
Build creates the selected runnable image without starting it. Run rebuilds it,
starts it in the background, and waits for a successful HTTP GET / before printing
the URL. This uses an infrastructure healthcheck; no application endpoint is added.
A failed startup leaves the container available for logs and explicit stop.

## LOCAL

The development image runs the existing `npm run dev` command on 0.0.0.0:3000.
Source and public assets are mounted read-only; dependencies stay in the image and
`.next` uses a project-owned cache volume. The working directory is writable by
the non-root node user for Next's generated configuration/types. Container output
does not reuse host node_modules or .next.

Edit files under src/ to use Next.js HMR. Change package files, next.config.ts,
TypeScript/PostCSS configuration, or Dockerfile by rerunning `make run` to rebuild.
The source mounts intentionally do not cover the whole checkout or its env files.
`make logs` follows HMR/runtime output; Ctrl-C stops following logs, not the app.

## DEV

The build stage runs npm run build. next.config.ts enables standalone packaging;
the runtime image contains the traced server, static output, and public assets.
It runs `node server.js` as non-root with NODE_ENV=production, container port 3000,
and no application source mounts. Browser tooling is not installed in this stage.
The normal `npm start` script remains available for advanced host use.

## Ports, projects, and configuration

`HOME_API_BASE_URL` is read and validated on the server at runtime: nonempty
HTTP/HTTPS URL, no credentials, query or fragment. Missing/invalid configuration
produces recoverable Home UI; builds do not contact Flask. No `NEXT_PUBLIC_*` URL.

Host Next loads `.env.local` using normal Next behavior (copy the nonsecret
`.env.example` if desired). Docker workflows explicitly receive the shell's
`HOME_API_BASE_URL` and `FOOTBALL_API_BASE_URL`; they do not source dotenv files or inject secrets automatically.
The existing Google Font build downloads still require internet access.

| App location / Template mode | Home URL |
| --- | --- |
| Host Next / Template LOCAL | `http://127.0.0.1:5100` |
| Host Next / Template DEV | `http://127.0.0.1:5200` |
| Host Next / Template direct host | `http://127.0.0.1:5300` |
| Docker Desktop App / host-published Template | `http://host.docker.internal:<port>` |
| Disposable test network | `http://template:8000` (owned service DNS) |

Do not assume Linux provides Docker Desktop host DNS. Supply an explicitly reachable
backend address/network for that environment; this App does not configure a host gateway.

Start and migrate the backend using its own documented workflow first.
The App does not start a backend or require Parent orchestration. For Docker Desktop:

```bash
HOME_API_BASE_URL=http://host.docker.internal:5100 make run
HOME_API_BASE_URL=http://host.docker.internal:5200 make run ENV=dev
```

Presenter journey: open `/`, create a uniquely named Item, check `?item=<uuid>`,
add `First action` with type `create`, then reload to see persistence. Action types
label records: `delete` does not delete an Item. Submit a whitespace-only name for
a safe error. Stop the selected backend and reload to demonstrate recovery; restart
it and retry. Never use developer data for automated live tests.

Standalone defaults are app-local:3000 and app-dev:13000. Each app listens on
container port 3000; these are independent host port mappings. Override explicitly:

```bash
make run ENV=local APP_PORT=3001 PROJECT=app-local-example
make logs ENV=local APP_PORT=3001 PROJECT=app-local-example
make stop ENV=local APP_PORT=3001 PROJECT=app-local-example
```

APP_PORT must be 1–65535. PROJECT must match app-local[-suffix] or app-dev[-suffix]
for the selected ENV. Reuse the same values for lifecycle commands. The helper uses
an explicit empty Compose env file, so an unrelated root .env cannot silently change
the stack. It never starts or stops service/dev repositories.

## Advanced npm and Docker tooling

The Dockerfile pins the Node 22 base image by digest. npm ci installs the lockfile.
Host tooling is optional; use a compatible Node 22/npm environment for IDE work:

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
npm start
```

Host dev and production preview both default to port 3000; stop the container using
that port first or choose an explicit override. Raw commands are separate from Make.
For containerized lint/type checks without adding public Make targets:

```bash
docker build --target tooling -t app-tooling .
docker run --rm app-tooling npm run lint
docker run --rm app-tooling npm run typecheck
```

## Future parent-repository contract

- Build context: repository root; single Dockerfile.
- Targets: tooling, development, browser (tests only), build, runtime.
- Container port: 3000, listening on all container interfaces.
- Readiness: HTTP GET / returns 200; healthcheck uses container Node fetch.
- LOCAL: development target, src/public mounts, isolated writable .next cache.
- DEV: runtime target, NODE_ENV=production, no source mounts.
- API URLs: server-only `HOME_API_BASE_URL` and `FOOTBALL_API_BASE_URL`, supplied at runtime.
- Tests: source npm run test:unit; isolated browser npm run test:e2e.

A future parent supplies its project/network/host-port mapping and reuses these
images. It should not copy the frontend build implementation or invoke standalone
commands against resources owned by another project.
