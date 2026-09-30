# Predictions — Engine Results

## Ownership

Present a calculation for a selected match/scenario and retrieve saved results.

Product route: `/predictions`. The route renders a React view scaffold; its product
functionality is not implemented yet. See the [feature map](../README.md).

## Phase 1 scope

- Generate a prediction from supplied match state.
- Display win/draw probabilities, predicted outcome, expected remaining goals, likely final score, scorelines, confidence, and reasoning.
- Save the result associated with its input state and match/scenario.
- Retrieve and display saved predictions.
- Track the proposed decision that recalculation creates a new Prediction record rather than overwriting an earlier result.

## Data and current backend

`POST /api/football/predictions` calculates without saving. `POST /api/football/snapshots` calculates and saves state plus prediction. `GET /api/football/snapshots/{uuid}` retrieves that combined record. Separate Match and Prediction records/relationships need backend agreement.

## Implementation notes

Probability and advancement values are fractions; confidence and momentum are percentages. Match difficulty is requested by the proposal but absent from the current prediction response. Do not fabricate it. Automatic persistence on recalculation is proposed, not implemented by the current calculate endpoint.

## Feature structure

- [components/](components/README.md): React view composition and interaction.
- [domain/](domain/README.md): feature types, state, validation, and transformations.
- [api/](api/README.md): endpoint calls and response handling.

The folders include implementation guidance and a React view scaffold linked from
its Next page. Add domain/API modules as each behavior is built; no API is mocked.
The Next page should import the view component rather than own its implementation.

## Later scope

Model comparisons, calibration/accuracy, automatic live predictions, and richer historical analysis.
