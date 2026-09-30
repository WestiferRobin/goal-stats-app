# Predictions components

Compose outcome probabilities, expected goals remaining, scorelines, confidence, reasoning, and save/retrieve controls. Display a clear unavailable state for unsupported difficulty output.

`predictions-view.tsx` exports `PredictionsView`. The Next route
`src/app/predictions/page.tsx` imports and renders it at `/predictions`.
The view currently shows an under-construction message, product navigation, and
a link to the working demo. Add the feature UI here; keep the route file small.

Use React state and props for rendering. Put interaction in Client Components and
keep noninteractive composition server-rendered where practical. Do not copy the
`src/demo/demo.js` DOM-manipulation code into React components. Add component tests
beside the implementation. Components may use this feature’s domain/API modules.

See the [feature scope](../README.md) and [feature map](../../README.md).
