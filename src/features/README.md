# Phase 1 feature map

Organize React product code as **`src/features/<view>`**. A feature corresponds
to a navigation view, not every individual card on a page. The source is the
supplied “Goal Stats Product Decisions Phase 1” proposal, targeting a demonstrable
minimum product by October 19. Its “Wix Page” and “App View” terms describe the
same product views; this repository implements them with React/Next.js.

## View ownership and route plan

| Feature | Route | Owns |
| --- | --- | --- |
| [home](home/README.md) | `/` | Product introduction and navigation |
| [matches](matches/README.md) | `/matches` | Match/scenario selection and editable state |
| [predictions](predictions/README.md) | `/predictions` | Calculation results and saved predictions |
| [teams](teams/README.md) | `/teams` | Catalog, ratings, rankings, comparison |
| [analytics](analytics/README.md) | `/analytics` | Limited stable analytics or labeled preview |

All five views are implemented and composed by their App Router pages. Home uses
Esteban's preserved HomeView; LandingView and Item/Action modules remain inactive
reference code. Teams, Matches, Predictions and Analytics use normalized Women's
World Cup contracts. Demo is a static historical reference with no live requests.
Informational `/about`, `/blog` and `/project` links await implementation.

## How to add a view

For example, when implementing Matches:

```text
src/app/matches/page.tsx                     Next route: import/render MatchesView
src/features/matches/components/matches-view.tsx
src/features/matches/components/match-state-form.tsx
src/features/matches/domain/                 Types and transformations, as needed
src/features/matches/api/                    Endpoint calls, as needed
```

Do not create a second `features/football` view containing all pages. Keep the
page’s cards under its owning feature: confidence and scorelines belong to
Predictions; match inputs belong to Matches. Add files as functionality is built,
using the scaffolded layer guides rather than fake API implementations. Place
tests beside their owners.

The shared application header/navigation belongs in shared layout components,
composed by `src/app/layout.tsx`; it is not a separate product feature. Links should
only claim working destinations when those routes exist. Share presentation
components only when actually reused.

## Cross-view boundaries

The core journey is Home → Matches → Predictions, with Teams for exploration and
Analytics for deeper analysis.

Use explicit route/search parameters and agreed backend identifiers to reopen
saved state; do not make features reach into one another’s component internals.
Saved scenarios and predictions use integer IDs and explicit scenario_id or
prediction_id query parameters. Reopening uses backend GETs, not session storage.

All football browser requests use `/api/football/*`. Next forwards approved paths
to Flask `/api/v1/*` using a server-only base URL. Reuse this boundary across React
views. If several views need the same browser request/response contract, extract
that small shared module under `src/lib/football`; do not copy contracts or import
another feature’s internal API modules. The existing `src/lib/football.ts` supplies reused pure contracts and adapters. Never import server-only HTTP code into the browser.

## Current behavior and deferred scope

PostgreSQL stores teams, competition editions, historical matches, mutable scenarios
and immutable predictions. Preview calculates without persistence; explicit save
creates a scenario then a prediction. Further generation appends history after
supported scenario edits. Dated historical comparisons are available; unknown
ratings/ranks remain null and hypothetical strengths are explicit.

Analytics renders stored outputs/snapshots. Tournament execution awaits explicit
strength and bracket inputs; backtesting lacks an approved endpoint. No accuracy,
telemetry or live-feed results are fabricated. Preserve those UI sections and the
existing 21 match inputs plus ten strength assumptions.

## Delivery priority

1. Shared navigation and simple Home; Teams catalog; Matches → Predictions core
   workflow with agreed persistence semantics.
2. Reopen saved scenarios/predictions and verify the database-backed journey.
3. Limited Analytics or a labeled preview. Live feeds, automatic fixtures, advanced
   backtesting, accuracy reporting, and tournaments must not block the minimum.

The full frontend boundary and endpoint map is in
[Architecture](../../docs/ARCHITECTURE.md). Each view’s README distinguishes minimum,
enhancement, and future scope so endpoint availability does not expand Phase 1.
