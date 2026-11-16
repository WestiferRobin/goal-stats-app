# Development internals

The public lifecycle follows the backend: setup prepares without starting services,
run is a foreground host process, deploy is local Docker, and stop affects only
owned Docker resources. The frontend has no infrastructure, seed or certification target.

`scripts/develop.sh` is the Make entrypoint. `scripts/development/local.mjs` reads
`.env.local` without shell evaluation, validates the port/origin and inherited conflicts,
checks port availability, and launches native Next.js with an explicit port. It forwards
Ctrl+C/termination to its own child. Native mode performs no Docker operations.
Native setup/run require Node.js 24.x and npm, matching the Docker runtime major.
Docker deploy/stop do not invoke host Node or npm. For Docker-only use, copy the
example environment if missing, configure APP_PORT, then run make deploy.

`make setup` preserves existing configuration, runs `npm ci`, and builds development
and tooling images. It starts nothing. `make test` uses the existing isolated Docker
quality runner and includes lifecycle regression tests.

Native workflow, in separate repository terminals:

- Backend: `make setup && make run`
- Frontend: `make setup && make run`

Docker workflow, separately in each repository:

- Backend: `make setup && make deploy`
- Frontend: `make setup && make deploy`

Do not run both modes concurrently on the same port. `APP_PORT` defaults to 3000;
set 3001 privately when Prizm Hub uses 3000. Port conflicts fail rather than selecting
another port or terminating another process. Existing native servers are not stopped
by deploy or stop. Use Ctrl+C in their own terminal.

Native `.env.local` uses `FOOTBALL_API_BASE_URL=http://127.0.0.1:5100`. Docker
Compose overrides the server-only origin with `http://host.docker.internal:5100`
and sets `GOALSTATS_LOCAL_DOCKER=1`. The existing proxy permits this exact origin
only in development outside Vercel; production restrictions are unchanged.
No backend services or database are managed by frontend lifecycle commands.

`make deploy` builds separately from up --wait, targeting Compose 2.22 compatibility.
Compose performs the port bind check; conflicts fail without killing the owner or
selecting another port. Actual 2.22 runtime verification is still required. Source/public mounts remain read-only and Next.js
cache volumes persist. `make stop` removes only `goal-stats-app-local` containers
and network, preserving volumes. It never terminates unrelated host processes.

Maintainer-only targets in the root Makefile preserve specialized behavior:

- `make _logs`: follow local Next.js logs.
- `make _e2e`: build a disposable production-style app and run Playwright.
- `make _build-production`: verify the standalone production image build.

Vercel configuration and `docker/compose.stuff.yml` Caddy HTTPS support remain
available for deployment/maintainer use. They are not part of first-run onboarding.
Host Node/npm are required only for setup and native development, not deploy/stop.

Home renders the unchanged Women's World Cup HomeView without backend configuration.
The normalized product views use `FOOTBALL_API_BASE_URL` through the existing proxy.
Demo is a static historical reference. Restored Item/Action modules are inactive;
`scripts/test-home.sh` exits before any provisioning. Do not use its historical
Compose stack for current certification. Informational pages `/about`, `/blog` and
`/project` are implemented and preserved. See TESTING.md for supported test modes.

## Verified runtime policy

Use Node.js 24.22.3 and npm 11.19.1. Supported policy: Node >=24.22.3 <25 and npm >=11.19.1 <12. With nvm, run `nvm install` then `nvm use` in this repository; other version managers may select the same version. This selection is per project, so another project can keep Node 26. Docker uses the pinned official Node 24 Debian slim image; deploy/stop need no host Node. Verify the Vercel project runtime is aligned to Node 24 before deployment; this change does not alter Vercel settings.
