# Team Squared App

The project's Next.js/React frontend. This repository owns the user interface;
product services own backend behavior and migrations. `RoadToTheFinal` is a legacy
reference, and `team-squared-service` is a service template/reference.

The current scaffold does not call a backend. No API URL, database, mock backend,
or other repository is required to run or test it.

## Start here

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
Next.js hot reload. Setup only checks tools: this scaffold needs no env files and
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
There are no migration or invented integration targets.

## More detail

- [Development](docs/DEVELOPMENT.md): configuration, containers, raw tools, and parent reuse.
- [Testing](docs/TESTING.md): source-test discovery, E2E ownership, and failure behavior.

Application files use Next.js App Router, strict TypeScript, Tailwind CSS, ESLint,
and the `@/*` alias for `src/*`. npm and package-lock.json remain authoritative.
