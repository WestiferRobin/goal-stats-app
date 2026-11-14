# Matches components

Compose team selection, match-state inputs, reset, and reopen-scenario controls. Keep draft inputs distinct from the last submitted state. Predictions owns detailed result presentation.

`matches-view.tsx` exports `MatchesView`. The Next route
`src/app/matches/page.tsx` imports and renders it at `/matches`.
The view browses historical matches separately from editable hypothetical inputs.
It previews predictions without persistence and reopens/PATCHes saved scenarios;
keep the route file small.

Use React state and props for rendering. Put interaction in Client Components and
keep noninteractive composition server-rendered where practical. Do not copy the
`src/demo/demo.js` DOM-manipulation code into React components. Add component tests
beside the implementation. Components may use this feature’s domain/API modules.

See the [feature scope](../README.md) and [feature map](../../README.md).
