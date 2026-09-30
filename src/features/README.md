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

The Analytics, Matches, Predictions, and Teams folders each have `components/`,
`domain/`, and `api/` scaffolds with layer-specific implementation guides, matching
Home’s existing separation. Each now has a React view connected to its matching
`src/app/<view>/page.tsx`. The pages show an under-construction message until their
product functionality is implemented.
Currently `/` is the existing React Item/Action reference and `/demo` is the
connected HTML football proof of concept. Both remain intact. The existing
`home/components/home-view.tsx` is not the planned product landing screen.

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
The existing snapshot UUID can retrieve a combined state/prediction, but it is
not an agreed Match/Scenario ID. Coordinate that contract before choosing final
detail URLs or building persistent cross-view navigation.

All football browser requests use `/api/football/*`. Next forwards approved paths
to Flask `/api/v1/*` using a server-only base URL. Reuse this boundary across React
views. If several views need the same browser request/response contract, extract
that small shared module under `src/lib/football`; do not copy contracts or import
another feature’s internal API modules. Such a shared module is a future extraction,
not an existing implementation. Never import server-only HTTP code into the browser.

## Product decisions and backend gaps

| Proposal | Current implementation | Required follow-up |
| --- | --- | --- |
| MySQL persistence | Backend uses PostgreSQL | Backend-owned database decision/migration; frontend must not claim MySQL is complete |
| Match/scenario records | Combined state/prediction snapshots by team pair | Decide hypothetical vs real fixture vs both; agree identity and relationship contracts |
| Separate saved predictions associated with a match | Snapshot stores state and prediction together | Agree data model and API before implementing the proposed relationship |
| Recalculation creates a new Prediction record (proposed) | Calculate is stateless; explicit Save creates a snapshot | Confirm policy and distinguish Calculate from Save until implemented |
| Match difficulty in prediction results | Not returned by current prediction API | Add agreed backend output or clearly show unavailable |
| Optional recent form/head-to-head | Imported history has no dates | Use honest history labels; do not block the core workflow |

Do not change database infrastructure, infer a fixture identity, or claim missing
capabilities simply to match the folder names. These are open dependencies, not
reasons to delay static pages, team exploration, or the existing prediction flow.

## Delivery priority

1. Shared navigation and simple Home; Teams catalog; Matches → Predictions core
   workflow with agreed persistence semantics.
2. Reopen saved scenarios/predictions and verify the database-backed journey.
3. Limited Analytics or a labeled preview. Live feeds, automatic fixtures, advanced
   backtesting, accuracy reporting, and tournaments must not block the minimum.

The full frontend boundary and endpoint map is in
[Architecture](../../docs/ARCHITECTURE.md). Each view’s README distinguishes minimum,
enhancement, and future scope so endpoint availability does not expand Phase 1.
