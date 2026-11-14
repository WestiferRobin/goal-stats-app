"use client";
import React from "react";
import { getTeamSummary } from "../api/team-summary";
import type { Team, TeamSummary } from "@/lib/football";

// The caller keys this component by team and refresh so old totals never flash for a new selection.
export default function TeamSummaryCard({ team }: { team: Team }) {
  const [summary, setSummary] = React.useState<TeamSummary | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    const controller = new AbortController();
    getTeamSummary(team.team_id, {}, controller.signal).then(result => {
      if (!controller.signal.aborted) setSummary(result);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load historical summary.");
    });
    return () => controller.abort();
  }, [team.team_id]);
  const metrics = summary && [
    ["Matches played", summary.matches_played], ["Wins", summary.wins], ["Draws", summary.draws], ["Losses", summary.losses],
    ["Goals scored", summary.goals_for], ["Goals conceded", summary.goals_against], ["Goal difference", summary.goal_difference],
    ["World Cup appearances", summary.tournament_appearances],
  ];
  return <section aria-label={`${team.name} historical summary`} className="rounded-2xl border border-white/10 bg-black/55 p-6">
    <h3 className="text-xl font-semibold">{team.name} · Historical statistics</h3>
    {error ? <p role="alert" className="mt-4 text-red-200">{error}</p> : !summary ? <p role="status" className="mt-4 text-zinc-400">Loading historical summary...</p> :
      summary.coverage_status === "no_matching_records" ? <p role="status" className="mt-4 text-zinc-400">No matching imported records are available for {team.name}. Historical coverage may be incomplete.</p> : <>
        <dl className="mt-4 grid grid-cols-2 gap-4">{metrics?.map(([label,value]) => <div key={label}><dt className="text-sm text-zinc-400">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}</dl>
        <p className="mt-4 text-sm text-zinc-400">All available imported World Cup records, independent of the history page. Recorded final scores include extra time and exclude shootouts; tied scores count as draws. Coverage may be incomplete. These totals are not prediction ratings.</p>
      </>}
  </section>;
}
