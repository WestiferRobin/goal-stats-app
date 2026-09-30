# Teams — Exploration and Comparison

## Ownership

Expose the team catalog and the model data used to make predictions.

Product route: `/teams`. The route renders a React view scaffold; its product
functionality is not implemented yet. See the [feature map](../README.md).

## Phase 1 scope

- Browse/select teams from database records.
- Show basic team identity and model ratings.
- Display available FIFA ranking metadata.

## Data and current backend

`GET /api/football/teams` returns catalog/ratings. `GET /api/football/insights?team1=…&team2=…` returns imported head-to-head and team history. Team data is currently imported from CSV into PostgreSQL; the proposal calls for MySQL.

## Implementation notes

Two-team comparison belongs here. Recent form and head-to-head are enhancements, not blockers. Imported history has no match dates and must not be represented as verified recent form. Matches may consume the catalog API without importing this view’s internals.

## Feature structure

- [components/](components/README.md): React view composition and interaction.
- [domain/](domain/README.md): feature types, state, validation, and transformations.
- [api/](api/README.md): endpoint calls and response handling.

The folders include implementation guidance and a React view scaffold linked from
its Next page. Add domain/API modules as each behavior is built; no API is mocked.
The Next page should import the view component rather than own its implementation.

## Later scope

Rosters, richer profiles, historical tournaments, ranking history, and competition-specific information.
