# Matches — Match/Scenario View

## Ownership

Own the matchup and editable match state used to request a prediction.

Product route: `/matches`. The view browses historical records and edits hypothetical
scenario inputs separately. See the [feature map](../README.md).

## Phase 1 scope

- Select two distinct teams from the backend catalog.
- Create a match/scenario and enter minute, score, and relevant statistics.
- Persist and reopen the relevant scenario/state.
- Navigate to the associated prediction.

## Data and current backend

`GET /api/football/catalog/teams` supplies teams. Catalog competitions and matches
support historical browsing with pagination and edition/team filters.
`POST /api/football/predictions/preview` calculates without saving. Predictions owns
scenario creation and generation; Matches reopens `GET /api/football/scenarios/{id}`
and PATCHes changed mutable fields without generating another prediction.

## Implementation notes

Historical matches are imported records; editable scenarios are hypothetical inputs.
A team pair is not a scenario identity. Keep editable inputs here; Predictions owns
the result presentation.

## Feature structure

- [components/](components/README.md): React view composition and interaction.
- [domain/](domain/README.md): feature types, state, validation, and transformations.
- [api/](api/README.md): endpoint calls and response handling.

The folders document the implemented view and its validated API contracts.
The Next page should import the view component rather than own its implementation.

## Later scope

Fixture schedules, automatic live matches, persisted events, and finalized results.
