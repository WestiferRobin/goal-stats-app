# GoalStats architecture and React implementation guide

## What we are building

The product frontend is React on Next.js. Flask owns football calculations,
validation, provider access, and persistence. PostgreSQL stores backend data.
The existing football `/demo` is a working proof of concept to translate into
React; it is not the final frontend architecture.

## Repository responsibilities

| Repository | Owns | How we use it |
| --- | --- | --- |
| `frontend/goal-stats-app` | React UI, browser interaction, Next server routes | Build the product here |
| `backend/template-goalstats-service` | Extracted football engine, JSON API, migrations, imported datasets, snapshots | Run as the football backend; the historical directory name is retained |
| `frontend/RoadToTheFinal` | Original Flask/Jinja football application | Reference behavior and appearance; do not run it as a second required backend |

The backend's [README](../../../backend/template-goalstats-service/README.md) and
[football guide](../../../backend/template-goalstats-service/docs/service/football.md)
are the setup and contract references. Those sibling links work in the parent
`team-squared-dev` checkout; in a standalone frontend checkout, open the backend
repository separately. Older parent documentation calling Template frozen may
refer to the earlier Item/Action foundation, not the current football backend.

## What exists today

| Location | Responsibility |
| --- | --- |
| `src/app/page.tsx` | React root page; Item/Action demo with `?item=<uuid>` selection |
| `src/features/home/components` | Existing React views and forms |
| `src/features/home/domain` | Item/Action types, errors, and Server Actions |
| `src/features/home/api` | Item/Action backend requests and response decoders |
| `src/app/demo/route.ts` | Returns the football HTML document |
| `src/app/demo/style.css/route.ts`, `src/app/demo/demo.js/route.ts` | Serve the preview assets |
| `src/demo/index.html`, `style.css`, `demo.js` | Football proof of concept: layout, styling, input mapping, and DOM updates |
| `src/demo/index.jinja.html` | Preserved original Jinja template; not executed by Next.js |
| `src/app/api/football/[...path]/route.ts` | Allowed football API methods/paths, server-side forwarding, safe errors |
| `src/lib/api` | Shared server HTTP client, timeout and error handling |

The `/demo` JavaScript updates DOM elements directly. React work should replace
that rendering behavior with components and state, while retaining the API contract.
Do not paste its document or Jinja expressions into a React page and expect them
to become interactive components.

## How a football request travels

1. A user changes match inputs in the browser.
2. The frontend sends JSON to its own origin, such as `POST /api/football/predictions`.
3. Next reads the server-only `FOOTBALL_API_BASE_URL` and forwards the request to
   `${FOOTBALL_API_BASE_URL}/api/v1/predictions`.
4. Flask validates the request, loads team ratings, and calculates the prediction.
5. JSON returns through Next; the frontend updates its displayed result.

The same browser URLs work locally and on Vercel. The browser never needs the
Flask hostname or provider key. `app/api` is an HTTP boundary, not a React component
and not the football engine. It does not store predictions or duplicate formulas.

The proxy accepts only its listed paths and methods, uses a 30-second upstream
timeout, avoids caching results, and returns sanitized errors. It checks supplied
POST origins and expects JSON objects. These checks do not implement user login,
authorization, private snapshots, or rate limiting.

## Football endpoint map

The browser prefix is `/api/football`; Flask's prefix is `/api/v1`.

| Method | Suffix on either prefix | UI behavior |
| --- | --- | --- |
| GET | `/teams` | Populate teams and dataset rankings |
| POST | `/predictions` | Calculate from current inputs without saving |
| GET | `/insights?team1=Spain&team2=England` | Imported head-to-head and team history |
| POST | `/snapshots` | Calculate and persist a shared snapshot; returns 201 |
| GET | `/snapshots?team1=Spain&team2=England` | Load saved timeline; preview requests latest 50 |
| GET | `/snapshots/{uuid}` | Retrieve a saved snapshot |
| POST | `/live/refresh` | Explicit provider refresh, cached fallback, or unavailable result |
| POST | `/tournaments/simulate` | Simulate a bracket |
| GET | `/history` | Imported historical rows; exposed but no dedicated preview screen |
| GET | `/backtests` | Model evaluation; exposed but no dedicated preview screen |

See backend Swagger at `/swagger` for request schemas. A prediction request:

```json
{
  "team1": "Spain",
  "team2": "England",
  "minute": 65,
  "team1_stats": { "goals": 1, "shots": 8, "shots_on_target": 4, "possession": 60 },
  "team2_stats": { "goals": 0, "shots": 5, "shots_on_target": 2, "possession": 40 }
}
```

The backend applies defaults for omitted optional statistics. Browser code can
use `fetch('/api/football/predictions', ...)` with `Content-Type: application/json`.
Always check `response.ok` and show a recoverable error; do not display a failed
request as a new successful prediction.

## Contract details that matter when writing React

- Team names identify teams in the current API. Select two distinct imported teams.
- `probabilities`, `advancement`, and scoreline probabilities are fractions:
  `0.65` displays as `65%`. Momentum and confidence already use percentages.
- `expected_goals_remaining` means additional goals, not a final score.
- Both possession values must total 100. Minutes are 0–120, extra minutes 0–30.
- The preview's `team1_total_shots` input maps to `team1_stats.shots`; its
  `team1_shots` input actually means `team1_stats.shots_on_target`. Use clear names
  in React instead of retaining this legacy naming ambiguity.
- Tournament requests contain 4, 8, 16, or 32 distinct team names and 1,000–2,000
  simulations. The preview supplies all imported teams in ranking order.
- Live responses wrap `state`, `prediction`, `source`, and `observed_at`.
  Display `real` versus `cached` and the observation time. Do not relabel manual
  calculations as live data. No available live/cache data produces an error.
- Snapshot lists are shared records for a team pair, not user-private records or
  a single identified fixture. Reset clears current inputs; it does not delete data.
- Insights contain undated imported history. Do not label it verified recent form.
- Attack pressure and difficulty are not in the current prediction response.
  Star-player modifiers are not wired in the preview. Coordinate any new backend
  fields before enabling corresponding React controls.

## React work: features organized by product view

The Phase 1 proposal maps each navigation view to its own feature. Read the
[feature map](../src/features/README.md) for minimum scope, ownership, open product
decisions, and the database/API gaps.

```text
src/features/
  home/          Product landing; existing Item/Action code retained here for now
  matches/       Match/scenario selection and editable inputs
  predictions/   Results and saved predictions
  teams/         Team catalog, ratings, comparison
  analytics/     Limited stable analytics or labeled preview
```

Each folder has a scope README. Analytics, Matches, Predictions, and Teams share
Home’s `components/`, `domain/`, and `api/` structure. Each has an implemented React
view scaffold, rendered by `src/app/<view>/page.tsx` at its matching URL. These pages
provide navigation and an under-construction message; their product functionality
is not yet implemented. Shared navigation lives in `src/components/view-navigation.tsx`.
The existing `/` Home reference and `/demo` football proof of concept remain intact.

Next pages should import their feature's view component. Add `components/`,
`domain/`, and `api/` files as needed; static pages do not need dummy API modules.
Shared header/navigation belongs in the application layout. A card such as
prediction confidence belongs inside Predictions, not in a separate top-level
feature. Do not group all navigation pages into one `features/football` view.

Use Server Components for noninteractive composition and Client Components for
forms, selection, and result updates. Browser API helpers call `/api/football/*`;
never import server-only HTTP clients or backend settings into a Client Component.
If multiple features need the same football types/request helpers, extract a small
shared `src/lib/football` module when needed. Features should not import another
feature's internals. Dependencies remain `app → features → lib`.

Keep edited inputs separate from the last successful response. Show when inputs
need recalculation, disable duplicate submissions, and handle stale responses after
team changes. Do not automatically retry a save after a timeout; it may already
have reached the database. Use backend-agreed identifiers for cross-view state,
not an assumed fixture identity inferred from two team names.

The proposal asks for MySQL, Match/Scenario persistence, and associated Prediction
records; the backend currently uses PostgreSQL and combined snapshots. Recalculation
creating a new Prediction record is still a proposed decision. Keep these backend
and product dependencies explicit while implementing the React views. The Phase 1
core is team selection, a saved scenario, prediction, and retrieval. Advanced
analytics and tournaments must not block it.

## Existing Item/Action flow

Home reads use Server Component → feature API → shared HTTP client → Flask.
Writes use native forms → Server Actions → feature API → Flask, followed by
revalidation and redirect to `/`. `HOME_API_BASE_URL` configures this flow separately.
The existing `connection()` call keeps live reads out of production builds.

Authentication is not implemented in this frontend. Do not assume the User
repository's name supplies an authentication contract. Keep future Auth separate
from Home and football until its requests, responses, and session behavior exist.
