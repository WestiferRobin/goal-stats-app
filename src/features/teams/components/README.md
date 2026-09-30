# Teams components

Compose the team catalog, rating/ranking details, and comparison. Show missing metadata honestly. Label imported undated history as history, not recent form.

`teams-view.tsx` exports `TeamsView`. The Next route
`src/app/teams/page.tsx` imports and renders it at `/teams`.
The view currently shows an under-construction message, product navigation, and
a link to the working demo. Add the feature UI here; keep the route file small.

Use React state and props for rendering. Put interaction in Client Components and
keep noninteractive composition server-rendered where practical. Do not copy the
`src/demo/demo.js` DOM-manipulation code into React components. Add component tests
beside the implementation. Components may use this feature’s domain/API modules.

See the [feature scope](../README.md) and [feature map](../../README.md).
