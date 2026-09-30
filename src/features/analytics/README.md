# Analytics — Advanced Analysis

## Ownership

Present stable analysis beyond the basic prediction result without blocking the core workflow.

Product route: `/analytics`. The route renders a React view scaffold; its product
functionality is not implemented yet. See the [feature map](../README.md).

## Phase 1 scope

- Provide a limited analytics view or a clearly labeled preview.
- Expose only stable, demonstrable analysis; possible content includes momentum and saved probability, possession, or expected-goal trends.

## Data and current backend

Prediction responses include momentum. Snapshot state/predictions support saved trends. `/api/football/backtests`, `/history`, and `/tournaments/simulate` exist, but endpoint availability does not make them Phase 1 requirements.

## Implementation notes

Attack pressure is not in the current prediction contract. Snapshot history is shared by team pair, not isolated by fixture or user. Do not present these charts as verified accuracy or calibrated forecasts.

## Feature structure

- [components/](components/README.md): React view composition and interaction.
- [domain/](domain/README.md): feature types, state, validation, and transformations.
- [api/](api/README.md): endpoint calls and response handling.

The folders include implementation guidance and a React view scaffold linked from
its Next page. Add domain/API modules as each behavior is built; no API is mocked.
The Next page should import the view component rather than own its implementation.

## Later scope

Historical analytics, a proper backtesting dashboard, accuracy metrics, tournament simulations, model comparison, and larger datasets.
