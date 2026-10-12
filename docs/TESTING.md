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

The default browser selection covers Home and the existing mocked football demo.
Home checks rendering without backend configuration, absence of forms/API calls,
shared navigation, the demo link, the icon, and mobile/desktop layout. The demo
checks prediction input mapping, live/cache states, snapshot save/load, and static
preview behavior. No backend or database is provisioned for these tests.

The retired Item/Action persistence/outage harness, its Compose file and private
Make target are removed. Shared HTTP transport/error tests remain with neutral
fixtures; football proxy tests retain configuration and safety coverage.

For focused tests in a configured Node.js 22 environment, use the existing script:

```sh
npm run test:unit -- src/features/home/components/landing-view.test.tsx src/lib/api/client.test.ts 'src/app/api/football/[...path]/route.test.ts'
```

`npm run build` or `make _build-production` checks the production build. `make _e2e`
includes that build. No separate formatter is configured. The optional
`APP_E2E_MODE=football-live` suite remains unchanged; it writes snapshots and must
only be used with an explicitly authorized disposable backend. It is not part of
this frontend-only retirement verification.
