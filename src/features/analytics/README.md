# Analytics — Advanced Analysis

## Ownership

Present stable analysis beyond the basic prediction result without blocking the core workflow.

Product route: `/analytics`. The view displays prediction outputs and saved
scenario history. See the [feature map](../README.md).

## Phase 1 scope

- Provide a limited analytics view or a clearly labeled preview.
- Expose only stable, demonstrable analysis; possible content includes momentum and saved probability, possession, or expected-goal trends.

## Data and current backend

Prediction responses include momentum. `GET /api/football/predictions/{id}` loads
an immutable saved result. `GET /api/football/scenarios/{id}/predictions` provides
scenario-scoped history with limit/offset pagination. Analytics also accepts an
unsaved preview; it does not call backtest or tournament-simulation endpoints.

## Implementation notes

Attack pressure is not in the current prediction contract. Saved history is scoped
by scenario ID, not team pair, and supports mixed v1/v2 results without recalculation.
Do not present these charts as verified accuracy or calibrated forecasts.

## Feature structure

- [components/](components/README.md): React view composition and interaction.
- [domain/](domain/README.md): feature types, state, validation, and transformations.
- [api/](api/README.md): endpoint calls and response handling.

The folders document the implemented view and its validated API contracts.
The Next page should import the view component rather than own its implementation.

## Later scope

Historical analytics, a proper backtesting dashboard, accuracy metrics, tournament simulations, model comparison, and larger datasets.
