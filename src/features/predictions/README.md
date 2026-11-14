# Predictions — Engine Results

`/predictions` displays an unsaved preview or a persisted prediction, including
probabilities, outcome, expected remaining goals, likely final score, scorelines,
confidence, reasoning, and the model version. Calculations belong to the backend;
the frontend validates and presents results without recomputing them.

## Preview, save, and reopen

Matches submits explicit hypothetical inputs to `POST /api/football/predictions/preview`.
A successful preview returns 200 and does not persist a scenario or prediction.
Version-2 session storage transfers the unsaved preview to Predictions; this storage
format version is separate from the prediction engine's model version.

Saving creates a scenario with `POST /api/football/scenarios` (201), retains its
integer ID, then sends a bodyless `POST /api/football/scenarios/{id}/predictions`
(201). Generation appends a new prediction; it does not overwrite earlier results.
`GET /api/football/scenarios/{id}` reopens scenario inputs. Matches can PATCH changed
mutable state; PATCH alone does not generate a prediction or change saved snapshots.

`/predictions?prediction_id={id}` retrieves `GET /api/football/predictions/{id}`
and displays its immutable input snapshot and stored output without relying on
session storage or running the engine again.

## Models, units, and minutes

The frontend accepts saved v1 and v2 outputs and preserves their model metadata,
reasoning, probabilities, and effective input snapshots. Mixed v1/v2 histories are
supported; reading a v1 result never upgrades or recalculates it. The backend owns
normalization of effective inputs, including shots; the frontend preserves submitted
inputs and separately displays the saved effective snapshot.

Probabilities and advancement values are fractions from 0 to 1. Confidence and
momentum are percentages from 0 to 100. Display formatting converts probabilities
to percentages, but does not multiply confidence again. Confidence is a heuristic,
not a calibrated probability of correctness.

Scenario match minutes are integers from 0 through 120 inclusive. Preview metadata
allows an extra minute from 0 through 30; the output contract permits minutes through
150. Negative, fractional, and out-of-range inputs are rejected. Regression fixtures
cover match minutes 89, 90, 91, 105, and 120. The v2 engine uses a nominal 90-minute
horizon: at minute 90 and later it summarizes the supplied current score with zero
expected remaining goals. This is backend behavior, not a frontend adjustment.

## History and failures

`GET /api/football/scenarios?limit=50&offset=...` discovers scenarios.
`GET /api/football/scenarios/{id}/predictions?limit=50&offset=...` retrieves saved
history, ordered by generation time and prediction ID descending. Predictions and
Analytics use 50-record pages. An empty first page means that the selected scenario
has no saved predictions; an empty later page says “No predictions on this page”
and preserves Previous navigation. An HTTP or validation failure is never treated
as a successful empty history.

Creation and generation are separate mutations with no automatic retries. A known
scenario ID is retained when generation fails. An uncertain creation outcome requires
scenario inspection; uncertain generation requires loading and reviewing history
before another generation attempt. Pending markers survive refresh to help prevent
duplicate records. Reopening durable predictions uses read-only requests.

## Contracts and verification

Browser requests use relative `/api/football/*` URLs. The Next.js proxy forwards them
to Flask `/api/v1/*` and keeps backend credentials server-side. There is no snapshot
endpoint in this workflow. Backend `member/wes` at `476d3af` contains the v2 engine
and team-summary contracts required by the normalized Tasks 7/10 integration suite;
backend master at `825327e` still generates v1 results and lacks team summaries.

See `src/lib/football.ts`, the Predictions and Matches component tests,
`src/lib/fixtures/backend-v2-predictions.json`, and `tests/e2e/normalized.spec.ts`.
Focused parser/component coverage does not replace real frontend/backend verification.
See [testing instructions](../../../docs/TESTING.md) for the isolated normalized runner.
