# Development

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
`HOME_API_BASE_URL`; they do not source dotenv files or inject secrets automatically.
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

Start and migrate the frozen Template using its own documented workflow first.
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
- API URL: server-only `HOME_API_BASE_URL`, supplied at runtime.
- Tests: source npm run test:unit; isolated browser npm run test:e2e.

A future parent supplies its project/network/host-port mapping and reuses these
images. It should not copy the frontend build implementation or invoke standalone
commands against resources owned by another project.
