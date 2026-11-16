# GoalStats architecture and React implementation guide

## Responsibilities and composition

Next.js App Router pages compose feature views. Esteban's unchanged HomeView is
active at `/`; LandingView remains an inactive reference. Shared navigation is
preserved, including `/about`, `/blog` and `/project`, whose destinations await
implementation. No legacy UUID query parsing is needed by Home.

React feature views → existing `/api/football` proxy → Flask `/api/v1` → five domain
services → five repositories → PostgreSQL. Domains are Team, Competition, Match,
Scenario and Prediction. Flask owns prediction mathematics and persistence;
RoadToTheFinal remains a historical mathematics/UI reference.

| Location | Responsibility |
| --- | --- |
| `src/app/` | Pages, layout, errors, and existing HTTP routes |
| `src/features/` | Home, Teams, Matches, Predictions and Analytics UI |
| `src/components/` | Reused presentation/navigation |
| `src/lib/api/` | Server-only HTTP transport and safe errors |
| `src/lib/football.ts` | Reused pure normalized contracts/validation/adapters |
| `src/demo/` | Preserved historical HTML, styling and assets |

Browser code never imports server-only transport or database/Redis clients.
No duplicate engine, generic proxy, service factory or global state framework is
needed. Keep feature responsibilities separate; share only actually reused code.

## Fifteen approved operations

Browser prefix `/api/football`; backend prefix `/api/v1`:

| Method | Suffix |
| --- | --- |
| GET | `/catalog/teams` |
| GET | `/catalog/teams/{team_id}` |
| GET | `/catalog/competitions` |
| GET | `/catalog/matches` |
| GET | `/catalog/matches/{match_id}` |
| GET | `/catalog/matches/insights` |
| POST | `/scenarios` |
| GET | `/scenarios` |
| GET | `/scenarios/{scenario_id}` |
| PATCH | `/scenarios/{scenario_id}` |
| POST | `/scenarios/{scenario_id}/predictions` |
| GET | `/scenarios/{scenario_id}/predictions` |
| GET | `/predictions/{prediction_id}` |
| POST | `/predictions/preview` |
| POST | `/competitions/simulate` |

Health/readiness are separate infrastructure operations. Consult backend OpenAPI
for complete schemas. Proxy IDs are positive integers bounded at 2147483647.
The server-only `FOOTBALL_API_BASE_URL` supplies the backend origin. The existing
proxy validates methods, JSON, origins and bodyless generation, rejects redirects,
uses a bounded timeout, rewrites valid Locations and sanitizes errors. It does not
supply authentication, private records or rate limiting.

## Current product workflow

Historical data covers Women's World Cup 1991–2023: 44 teams, nine editions,
348 matches and 1,081 goals. Catalog ratings/rankings remain null when unknown.
Historical scores are not fabricated in-play statistics.

Matches retains 21 state inputs and requires ten explicit hypothetical strengths.
A flat POST to `/predictions/preview` calculates without saving. Versioned session
storage transfers the unsaved preview. Predictions explicitly creates a scenario,
retains its integer ID, then sends a genuinely bodyless generation POST. Saved
predictions carry immutable input_snapshot, output, model_version and generated_at.
GET discovery/detail/history supports reopening without browser storage. PATCH
changes only mutable scenario fields; generating another prediction is explicit.
Uncertain saves are not automatically retried; users inspect saved records first.

Analytics reads stored output and snapshots, reversing each newest-first history
page for chronological charts. Probability fractions become percentages once;
momentum/confidence already use percentages. Charts represent hypothetical saved
revisions, not fabricated historical telemetry. Tournament UI awaits explicit
strength/bracket inputs; backtesting has no approved endpoint. Both are deferred.

## Preserved historical boundaries

Item/Action API/domain modules, forms, types, environment helper and isolated mocked
tests remain reference code. Active routes do not import their clients or Server
Actions. Do not reconnect `/items` or add prototype compatibility endpoints.
`SERVICE_API_BASE_URL` is not active configuration. The historical Home runner exits
before provisioning; its Compose and live test files remain preserved.

`/demo` serves preserved HTML/styles/assets as a labeled historical/static reference.
Its script disables calculation/save controls and performs no requests. Its response
blocks connections and form submissions with CSP and links to supported React views.
Displayed sample values are illustrative, not live backend results. The original
Jinja template remains unexecuted reference material.

Authentication is not implemented. Keep future auth/session contracts separate from
Home and football. See [feature map](../src/features/README.md) and [testing](TESTING.md).
