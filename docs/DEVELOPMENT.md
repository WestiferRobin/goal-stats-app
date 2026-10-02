# Development internals

The root README owns the supported contributor workflow. Docker-backed Next.js
development is the only public local mode; source and `public/` are mounted read-only
and the `.next` cache is retained for hot reload.

The request path is:

```text
Browser -> Goal Stats Next.js -> /api/football/* -> Flask backend -> database/football logic
```

`.env.local` uses the host-facing backend address `http://127.0.0.1:5100`. Local
Compose overrides the two server-only upstream URLs with
`http://host.docker.internal:5100` and maps that name through `host-gateway` for
Linux compatibility. Contributors neither export URLs nor edit configuration when
switching frontend workflows.

## Optional host frontend

Docker through Make remains the default. With `goal-stats-service` running through
its Docker workflow, frontend developers with Node.js 22 and npm may run:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000/demo>. Next.js reads the same `.env.local` and reaches
the backend through `http://127.0.0.1:5100`. Stop any Docker frontend using port
3000 before starting the host process.

Maintainer-only targets in the root Makefile preserve specialized behavior:

- `make _logs`: follow local Next.js logs.
- `make _e2e`: build a disposable production-style app and run Playwright.
- `make _test-home SERVICE_SOURCE=/path/to/goal-stats-service`: frozen-backend
  Item/Action persistence and outage checks.
- `make _build-production`: verify the standalone production image build.

Vercel configuration and `docker/compose.stuff.yml` Caddy HTTPS support remain
available for deployment/maintainer use. They are not part of first-run onboarding.
Host Node/npm remain optional and are not beginner prerequisites.
