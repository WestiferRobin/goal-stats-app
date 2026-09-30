# Matches — Match/Scenario View

## Ownership

Own the matchup and editable match state used to request a prediction.

Product route: `/matches`. The route renders a React view scaffold; its product
functionality is not implemented yet. See the [feature map](../README.md).

## Phase 1 scope

- Select two distinct teams from the backend catalog.
- Create a match/scenario and enter minute, score, and relevant statistics.
- Persist and reopen the relevant scenario/state.
- Navigate to the associated prediction.

## Data and current backend

`GET /api/football/teams` supplies teams. Existing snapshot endpoints save/retrieve a state and prediction together. A first-class Match/Scenario identity and its persistence contract are not yet established.

## Implementation notes

Open decision: does Match mean a hypothetical scenario, a real fixture, or both? Do not silently treat a team pair or snapshot ID as a unique real fixture. Keep editable inputs here; Predictions owns the result presentation.

## Feature structure

- [components/](components/README.md): React view composition and interaction.
- [domain/](domain/README.md): feature types, state, validation, and transformations.
- [api/](api/README.md): endpoint calls and response handling.

The folders include implementation guidance and a React view scaffold linked from
its Next page. Add domain/API modules as each behavior is built; no API is mocked.
The Next page should import the view component rather than own its implementation.

## Later scope

Fixture schedules, automatic live matches, persisted events, filtering, and finalized results.
