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

The scaffold has no application env variables or backend API URL to configure.
Setup consequently creates no .env.local/.env.dev files. Existing dotenv files are
untouched, excluded from images, and not automatically injected into containers.
The existing Next Google Fonts are fetched at build/dev compilation time and
served through Next's generated assets; internet access is needed for those fetches.

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

When backend integration is implemented, document the real application configuration
then. Browser-visible Next public variables are not secret storage, and values baked
into a frontend build must be provided at build time. No speculative API variable or
team-squared-dev hostname is introduced here.

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
- API URL: none currently required or consumed.
- Tests: source npm run test:unit; isolated browser npm run test:e2e.

A future parent supplies its project/network/host-port mapping and reuses these
images. It should not copy the frontend build implementation or invoke standalone
commands against resources owned by another project.
