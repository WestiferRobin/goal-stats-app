# GoalStats App

GoalStats uses **React with Next.js** for the frontend and a separate Flask backend
for football calculations and persistence. New product UI work belongs in React.

## Read this first

| What you need | Read |
| --- | --- |
| Find your view, Phase 1 scope, and feature folder | [Feature map](src/features/README.md) |
| Understand the repositories, request flow, and React implementation plan | [Architecture](docs/ARCHITECTURE.md) |
| Start the frontend and backend locally, configure URLs, or troubleshoot | [Development](docs/DEVELOPMENT.md) |
| Run checks and understand what the tests cover | [Testing](docs/TESTING.md) |

The available routes are:

| Route | Current implementation | Purpose |
| --- | --- | --- |
| `/` | React, `src/app/page.tsx` and `src/features/home` | Preserved Item/Action reference application |
| `/demo` | HTML/CSS and browser JavaScript in `src/demo`, served by Next route handlers | Working football proof of concept and reference for the React screen |
| `/matches`, `/predictions`, `/teams`, `/analytics` | React view scaffolds in their feature folders | Starting points for product implementation; currently under construction |
| `/api/football/*` | Next.js server route handler | Forwards approved football requests to Flask |

**The football screen has not been converted to React yet.** Hosting `/demo` inside
Next.js does not make its HTML a React component. Keep it usable as a reference
while building React components against the existing football API. The new React routes provide view scaffolds for that transition; they do not yet
implement the demo’s functionality.

`template-goalstats-service` now contains the football backend despite its historical
name. `RoadToTheFinal` is the original model/design reference and is not needed at
runtime. The Item/Action demonstration and football screen use separate server-side
URL settings. Authentication is not implemented in this frontend.

## Start here

The football preview is at **http://localhost:3000/demo** when the app is running.
It serves `src/demo/index.html` and `src/demo/style.css` directly, outside React.
The original Flask template is preserved as `src/demo/index.jinja.html`.
`src/demo/demo.js` connects the controls through `/api/football/*` to the football
JSON API in `template-goalstats-service`. Without a connection, the initial
values are explicitly labeled as a static preview.
The existing React application remains at `/`.

Set the server-only backend origin in `.env.local` and restart Next if needed:

```dotenv
FOOTBALL_API_BASE_URL=http://127.0.0.1:5300
```

Use the backend's actual port (5300 for host startup, 5100 for Docker LOCAL).
For Next running inside Docker Desktop, pass
`FOOTBALL_API_BASE_URL=http://host.docker.internal:5300` to `make run`.
Start/migrate the backend and import its football datasets following its
`docs/service/football.md`. The proxy appends `/api/v1`; do not include that suffix.
`HOME_API_BASE_URL` continues to configure only the original Item/Action demo.

For Vercel, set `FOOTBALL_API_BASE_URL` to your deployed Flask HTTPS origin and
redeploy. Vercel cannot reach the Flask process on your Mac via localhost.
`API_FOOTBALL_KEY` belongs only on the Flask server. Live refresh uses the provider
only when clicked; unavailable/cached results are labeled. Manual predictions
need no provider key. The proxy exposes only the listed football endpoints.

Update Prediction calculates without saving; Save Snapshot writes a shared match
record. Reset Current Inputs does not delete records. Timelines show the latest
50 saved snapshots for a team pair, not a unique fixture or private user history.
Tournaments use all imported teams in ranking order and 1,000–2,000 simulations.
Attack pressure, match difficulty, and star-player modifiers are not connected;
insights use undated imported history, not verified recent form.

Optionally expose the running app at **https://localhost/demo**:

```bash
docker compose -f docker/compose.stuff.yml up -d --wait
```

This local HTTPS proxy forwards to the app on host port 3000. Caddy creates a local
certificate. To trust it on macOS, export the CA and add it to your login keychain
with SSL trust using Keychain Access:

```bash
docker compose -f docker/compose.stuff.yml cp https:/data/caddy/pki/authorities/local/root.crt /tmp/goalstats-local-ca.crt
open /tmp/goalstats-local-ca.crt
```

Stop the proxy with `docker compose -f docker/compose.stuff.yml down`.

Use Git, running Docker Engine/Desktop with Compose v2+, and GNU Make 3.81+ in a
Bash-compatible macOS/Linux shell. Host Node/npm is optional. No command installs
system software. Internet access is needed for initial images, npm dependencies,
and the existing Next Google Font build downloads.

```bash
make help
make setup
make run
```

Open **http://127.0.0.1:3000**. LOCAL is a source-mounted developer container with
Next.js hot reload. Setup only checks tools: the App requires no generated env files and
existing developer configuration is preserved. Run builds/starts the container,
waits for HTTP readiness, and returns while it stays running.

```bash
make logs
make unit
make test
make test E2E=true
make stop
```

`make unit` and `make test` run source component/unit tests. E2E is disabled by
default. `make test E2E=true` runs source tests first, then browser tests against a
separate disposable built app. It never uses your LOCAL/DEV app state.

## LOCAL and DEV

| Mode | Behavior | Default URL |
| --- | --- | --- |
| LOCAL | Development server, mounted src/public, hot reload | http://127.0.0.1:3000 |
| DEV | Production-style standalone image, no source mounts | http://127.0.0.1:13000 |

Both modes run on your machine; DEV is not deployment to a shared server.

```bash
make build ENV=dev
make run ENV=dev
make logs ENV=dev
make stop ENV=dev
```

ENV defaults to local. Unsupported ENV/E2E values fail clearly. Stop targets only
the selected standalone app project and preserves its development build cache.
App has no migration target. `make test-home` owns the disposable live Home checks.

## More detail

- [Architecture](docs/ARCHITECTURE.md): framework/feature ownership and server-first conventions.
- [Development](docs/DEVELOPMENT.md): configuration, containers, raw tools, and parent reuse.
- [Testing](docs/TESTING.md): source-test discovery, E2E ownership, and failure behavior.

Application files use Next.js App Router, strict TypeScript, Tailwind CSS, ESLint,
and the `@/*` alias for `src/*`. npm and package-lock.json remain authoritative.
