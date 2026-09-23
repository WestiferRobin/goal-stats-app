# GoalStats App architecture

Home owns the Item + Action reference demo. Flask Template is the business,
validation and persistence authority; this is not football product functionality.

| Responsibility | Location |
| --- | --- |
| Route/search parameter interpretation, loading/error boundary, metadata, global CSS | `src/app` |
| Home UI and native forms | `features/home/components` |
| Item/Action contracts and create Server Actions | `features/home/domain` |
| Flask paths, wire JSON and focused runtime decoders | `features/home/api` |
| Generic server HTTP mechanics and safe failure classification | `lib/api` |
| Server-only runtime URL configuration | `lib/env/server.ts` |

Reads: Server Component → Home API → shared HTTP client → Flask.
Writes: native form → Home Server Action → Home API → shared HTTP client → Flask.
`domain/actions.ts` contains exactly `createItem` and `createAction`, both Next
Server Actions. Other domain modules are not automatically Server Actions.

The root page validates `?item=<uuid>` and passes selection to HomeView. `connection()`
keeps live reads out of production builds. Mutable reads explicitly use `no-store`.
Create operations revalidate `/` and redirect using validated IDs, never Flask Location.
Expected validation, configuration, network and contract failures become safe Home/form
state; unexpected programming failures reach `app/error.tsx`. Uncertain mutations tell
users to reload and check before retrying; the HTTP client never retries automatically.

Server Components are the default. Only forms needing `useActionState` and the error
boundary use `"use client"`. API/environment modules enforce `server-only`. Never pass
backend URLs or raw errors to browser components. No browser fetch to Flask is needed.

Dependencies point `app → features → lib`. Features never import `app`; `lib` never
imports features. Home and future Auth must not import each other's internals. Use
explicit imports, not barrels. No global store, provider stack, schemas hierarchy,
generated DTOs or speculative infrastructure. No `app/api`: add a Route Handler only
for an actual independent browser/external HTTP consumer (selective BFF).

Shared UI belongs in `components/ui` only once domain-neutral reuse justifies it;
none is needed today. Feature-specific server plumbing belongs in that feature's
`server` directory only when a real responsibility arises.

## Auth dependency

**AUTH BACKEND NOT READY.** No Login/Register routes, Auth API, session module or
User URL configuration exists. Do not infer an Auth contract from the User repository's
name. Backend work must first establish approved Register/Login paths/methods,
requests/responses, validation/errors, account persistence/password verification,
session/token semantics, session verification, OpenAPI/tests and a disposable Auth
test strategy. Auth is Working Demo Prompt 2; do not invent frontend contracts.

Keep tests beside their owner; browser tests stay in `tests/e2e`. See TESTING.md.
