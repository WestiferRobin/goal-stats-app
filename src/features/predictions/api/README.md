# Predictions API

Saving performs two separate requests: POST `/api/football/scenarios`, retain the returned integer scenario ID, then a genuinely bodyless POST `/api/football/scenarios/{id}/predictions`. Both require 201 responses. Discovery and scenario-scoped history use paginated GETs; direct `/predictions?prediction_id={id}` loads the stored record without requiring session storage. There are no automatic mutation retries. Uncertain creation triggers scenario inspection; uncertain generation triggers history retrieval and explicit review before another attempt. Pending markers survive refresh.

Browser functions use relative `/api/football/*` URLs. Next's existing proxy owns
the backend address and forwards to Flask `/api/v1/*`. Check HTTP status, validate
returned data at the boundary, and expose recoverable errors to the view.

The Home feature’s `.server.ts` modules are server-only examples, not modules to
import into Client Components. Do not place backend URLs or provider keys in this
layer’s browser code. Do not import another feature’s internal request functions.
Test requests/error handling beside the implementation and never use developer
records for automated write tests.

See the [feature scope](../README.md) and [feature map](../../README.md).
