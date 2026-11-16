# Analytics API

GET `/api/football/predictions/{id}` loads saved analytics; GET `/api/football/scenarios/{id}/predictions?limit=50&offset=...` loads paginated history. Existing routes accept prediction_id or scenario_id queries. Validated temporary previews may be displayed without fake saved history. Tournament UI remains deferred until explicit strengths and bracket inputs exist. Backtesting remains deferred because there is no approved endpoint. Neither section sends retired prototype requests.

Browser functions use relative `/api/football/*` URLs. Next's existing proxy owns
the backend address and forwards to Flask `/api/v1/*`. Check HTTP status, validate
returned data at the boundary, and expose recoverable errors to the view.

The Home feature’s `.server.ts` modules are server-only examples, not modules to
import into Client Components. Do not place backend URLs or provider keys in this
layer’s browser code. Do not import another feature’s internal request functions.
Test requests/error handling beside the implementation and never use developer
records for automated write tests.

See the [feature scope](../README.md) and [feature map](../../README.md).
