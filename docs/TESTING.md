# Testing

Run `make test` from the repository root. It builds a tooling container and runs:

1. ESLint.
2. Next.js route type generation and strict TypeScript checking.
3. Vitest unit and component tests.

No host Node/npm, running frontend, backend, `.env.local`, or `E2E=true` switch is
required. The tooling container has no network while the checks execute.

Playwright remains available to maintainers through `make _e2e`. It builds unique
tooling/browser/runtime images, starts a disposable production-style frontend, and
removes its containers, network, volumes, and per-run images afterward.

The legacy live Item/Action persistence/outage suite remains available through
`make _test-home SERVICE_SOURCE=/path/to/goal-stats-service`. It owns a disposable
backend/database/frontend/browser environment and does not use either development
repository's running resources.
