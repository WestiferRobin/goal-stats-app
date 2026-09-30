# Analytics API

Load saved snapshots through `/api/football/snapshots?team1=…&team2=…`. Add history, backtest, or tournament calls only when that view implements them; availability is not a Phase 1 requirement.

Browser functions use relative `/api/football/*` URLs. Next's existing proxy owns
the backend address and forwards to Flask `/api/v1/*`. Check HTTP status, validate
returned data at the boundary, and expose recoverable errors to the view.

The Home feature’s `.server.ts` modules are server-only examples, not modules to
import into Client Components. Do not place backend URLs or provider keys in this
layer’s browser code. Do not import another feature’s internal request functions.
Test requests/error handling beside the implementation and never use developer
records for automated write tests.

See the [feature scope](../README.md) and [feature map](../../README.md).
