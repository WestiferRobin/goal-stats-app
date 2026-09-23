# GoalStats App architecture

## Start with the owner

| Responsibility | Owner |
| --- | --- |
| Routes, layouts, metadata, Next special files and global CSS | `src/app` |
| Home presentation | `src/features/home/components` |
| Future Item + Action behavior | `src/features/home` |
| Future Login + Register behavior | `src/features/auth` |

`app/page.tsx` is a thin Server Component that renders `HomeView`. The feature
owns the landing page and its colocated component tests. Browser checks remain in
`tests/e2e`. Global CSS stays in `app/globals.css`, imported by the root layout.

## Feature convention

- `components/`: feature UI and its behavioral tests.
- `api/`: Flask endpoint knowledge, request/response handling and boundary tests.
- `domain/`: feature contracts and operations; `actions.ts` here means domain
  operations, not automatically Next Server Actions or a `"use server"` directive.
- `server/`: feature-specific server-only plumbing.

Only Home components exist today. The static landing page needs no domain types
or actions. Home `api/` and `domain/` are deferred to real Item/Action integration
in Prompt 2; Auth is deferred to Prompt 3. Do not create empty folders, fake types,
placeholder operations, or separate Item and Action features.

## Rendering and dependencies

Use **Server Components by default**. Add `"use client"` only at a boundary that
needs event handlers, interactive state, effects, browser APIs or client-only
libraries. Presentation alone is not a reason. HomeView needs no client state.

Current direction: `app → features`.

Future direction: `app → features → lib / shared UI`; feature API code may use
shared HTTP infrastructure to call Flask. Shared UI renders presentation and does
not call Flask. Flask remains the authoritative REST/business backend.

Features never import from `app`. Future `lib` and `components/ui` must not import
features. Home and Auth must not import each other's internals. Use explicit
imports with the existing `@/*` alias for `src/*`; no barrels are needed.

Shared UI or infrastructure requires actual reuse. No shared UI, API client,
environment module, BFF route, auth/session layer, global state provider or extra
Next boundary file is needed for this static page. Add a layer with its first real
consumer, not to complete a diagram.

## Review a change

Keep implementation in its feature, update behavior/content assertions instead
of deleting tests, and run the existing unit, lint, typecheck, build and affected
browser checks. See [Development](DEVELOPMENT.md) and [Testing](TESTING.md).
