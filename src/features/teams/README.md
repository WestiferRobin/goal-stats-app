# Teams — Historical Statistics and Comparison

`/teams` browses the normalized historical catalog and compares two selected teams.
Unknown ratings and rankings remain unavailable; historical totals are not prediction inputs.

Each team has a backend-provided summary of all matching imported records: matches,
wins, draws, losses, goals scored/conceded, goal difference, and World Cup appearances.
Scores include extra time and exclude shootouts; tied recorded scores count as draws.
The available records do not establish complete historical coverage.

The comparison history uses pages of 50 records, ordered by match date then match ID.
Previous/Next history page advances the head-to-head and both team lists together;
Next is available while any list has a full page. A shorter list can have no records
on a later page. Changing either team resets the page; late responses are discarded.
Summary totals are fetched independently and never calculated from a history page.
Refresh reloads both summaries and the current comparison page.

The view uses a consistent unfiltered scope. It does not expose competition/date
controls because the comparison endpoint does not support them. The summary client
supports the backend's competition and inclusive date filters for scoped callers,
and rejects responses whose team or echoed filters differ from the request.

Loading, successful empty records, and failures have distinct presentations.
Only successful summaries display totals; history failures never claim an empty dataset.

Contracts: `src/lib/football.ts`; summary requests: `api/team-summary.ts`;
view: `components/teams-view.tsx`; summary presentation: `components/team-summary.tsx`.
