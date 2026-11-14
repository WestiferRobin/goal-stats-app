# Teams API

Browser requests use the same-origin `/api/football` proxy, forwarded to Flask `/api/v1`:

- `GET /catalog/teams`: normalized team identities and nullable ratings.
- `GET /catalog/teams/{id}/summary`: full-history totals, independent of pagination.
  `getTeamSummary` validates the response, requested team, and echoed `competition_id`,
  `date_from`, and `date_to` filters. Date bounds are inclusive; omitted filters are null.
- `GET /catalog/matches/insights?team1_id=…&team2_id=…&limit=50&offset=…`:
  head-to-head and individual histories, ordered by match date then match ID. The same
  offset applies independently to all three lists. This endpoint has no competition/date filters.

The Teams view requests both summaries without filters, matching its comparison scope.
Backend summary metrics are authoritative. Never derive aggregate totals from a page.
Check HTTP status before parsing; preserve abort signals and discard stale responses.
Backend URLs and credentials belong only in the server proxy, never these browser clients.
