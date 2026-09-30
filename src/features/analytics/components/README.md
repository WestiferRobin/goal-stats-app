# Analytics components

Render stable momentum and saved probability, possession, and expected-goal trends. Keep loading, empty-history, and unavailable states in the view. Attack pressure and accuracy must not be fabricated when the API lacks them.

`analytics-view.tsx` exports `AnalyticsView`. The Next route
`src/app/analytics/page.tsx` imports and renders it at `/analytics`.
The view currently shows an under-construction message, product navigation, and
a link to the working demo. Add the feature UI here; keep the route file small.

Use React state and props for rendering. Put interaction in Client Components and
keep noninteractive composition server-rendered where practical. Do not copy the
`src/demo/demo.js` DOM-manipulation code into React components. Add component tests
beside the implementation. Components may use this feature’s domain/API modules.

See the [feature scope](../README.md) and [feature map](../../README.md).
