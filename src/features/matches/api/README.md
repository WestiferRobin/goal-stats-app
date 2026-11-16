# Matches API

The catalog uses normalized teams, competitions (`edition_label`), and match arrays with 50-record pages. POST `/api/football/predictions/preview` submits validated flat hypothetical inputs and returns engine output without persistence. Version-2 session storage transfers the unsaved preview to Predictions. GET `/api/football/scenarios/{id}` restores saved state; PATCH sends only changed mutable fields and never generates a prediction. Unknown PATCH outcomes require reopening before retry.

Browser functions use relative `/api/football/*` URLs. Next's existing proxy owns
the backend address and forwards to Flask `/api/v1/*`. Check HTTP status, validate
returned data at the boundary, and expose recoverable errors to the view.

The Home feature’s `.server.ts` modules are server-only examples, not modules to
import into Client Components. Do not place backend URLs or provider keys in this
layer’s browser code. Do not import another feature’s internal request functions.
Test requests/error handling beside the implementation and never use developer
records for automated write tests.

See the [feature scope](../README.md) and [feature map](../../README.md).
