# Home

The `/` route renders `components/landing-view.tsx`: a minimal static GoalStats
introduction, the existing shared navigation, and a link to the implemented `/demo`.
It requires no backend, environment variable, forms, or server actions. It adds no
statistics, predictions, dashboard, or new API contracts.

The inherited Item/Action Home implementation and its domain-only tests are retired.
Shared HTTP infrastructure remains in `src/lib/api`; RoadToTheFinal uses the existing
football proxy. Matches, Predictions, Teams and Analytics remain teammate-owned
scaffolds and have not been redesigned or connected to normalized APIs here.

Future Home design remains governed by the product decisions. Add API/domain layers
only when an approved feature actually needs them. See the [feature map](../README.md).
