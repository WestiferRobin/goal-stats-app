"use client";

import React from "react";
import ViewNavigation from "@/components/view-navigation";

import { parseTeams, parseInsights, type Team, type HistoryMatch, type InsightsResponse } from "@/lib/football";

export default function TeamsView() {
  const [teams, setTeams] = React.useState<Team[]>([]);

  const [team1Id, setTeam1Id] = React.useState<number | "">("");
  const [team2Id, setTeam2Id] = React.useState<number | "">("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [insights, setInsights] =
    React.useState<InsightsResponse | null>(null);

  const [insightsLoading, setInsightsLoading] =
    React.useState(false);

  const [insightsError, setInsightsError] =
    React.useState("");

  React.useEffect(() => {
    const controller = new AbortController();
    async function loadTeams() {
      try {
        const response = await fetch("/api/football/catalog/teams", {signal:controller.signal});

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail || "Unable to load team data."
          );
        }

        if (!Array.isArray(data)) {
          throw new Error(
            "Team data returned an invalid response."
          );
        }

        const loadedTeams = parseTeams(data);
        if (controller.signal.aborted) return;

        setTeams(loadedTeams);

        if (loadedTeams.length >= 2) {
          setTeam1Id(loadedTeams[0].team_id);
          setTeam2Id(loadedTeams[1].team_id);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("TEAM LOAD ERROR:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load team data."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTeams();
    return () => controller.abort();
  }, []);

  const [insightsRefresh, setInsightsRefresh] = React.useState(0);
  function resetInsights() { setInsights(null); setInsightsError(""); setInsightsLoading(true); }
  React.useEffect(() => {
    const controller = new AbortController();
    async function loadInsights() {
      if (!team1Id || !team2Id || team1Id === team2Id) return;
      resetInsights();
      try {
        const params = new URLSearchParams({team1_id:String(team1Id),team2_id:String(team2Id)});
        const response = await fetch(`/api/football/catalog/matches/insights?${params}`, {signal:controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to load team insights.");
        const result = parseInsights(data);
        if (result.team1_id !== team1Id || result.team2_id !== team2Id) throw new Error("Invalid comparison response.");
        if (!controller.signal.aborted) setInsights(result);
      } catch (err) {
        if (!controller.signal.aborted) setInsightsError(err instanceof Error ? err.message : "Unable to load team insights.");
      } finally { if (!controller.signal.aborted) setInsightsLoading(false); }
    }
    void loadInsights();
    return () => controller.abort();
  }, [team1Id, team2Id, insightsRefresh]);

  const team1 =
    teams.find((team) => team.team_id === team1Id) ?? null;

  const team2 =
    teams.find((team) => team.team_id === team2Id) ?? null;

  function displayValue(
    value: number | null | undefined
  ) {
    if (value === null || value === undefined) {
      return "Unavailable";
    }

    return String(value);
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,10,18,0.80), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <ViewNavigation currentPath="/teams" />

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#071522]/90 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div
            className="pointer-events-none absolute right-[-70px] top-[-50px] h-[380px] w-[380px] bg-contain bg-center bg-no-repeat opacity-10"
            style={{
              backgroundImage:
                "url('/images/matches-watermark.png')",
            }}
          />

          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Team Exploration
            </p>

            <h1 className="mt-3 text-5xl font-bold">
              Compare{" "}
              <span className="text-pink-500">
                Teams
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Explore ranking information, model ratings,
              previous meetings, and imported match history for
              teams available in Goal Stats.
            </p>

            {loading && (
              <p className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 text-zinc-300">
                Loading teams...
              </p>
            )}

            {error && (
              <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                {error}
              </p>
            )}

            {!loading && !error && teams.length === 0 && <p role="status">No teams are available.</p>}
            {!loading && !error && (
              <>
                <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
                  <h2 className="text-2xl font-semibold">
                    Select{" "}
                    <span className="text-pink-400">
                      Teams
                    </span>
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Choose two teams to compare side by side.
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-zinc-300">
                        Team 1
                      </label>

                      <select
                        aria-label="Team 1"
                        value={team1Id}
                        onChange={(event) => { resetInsights(); setTeam1Id(
                            Number(event.target.value)
                          ); }}
                        className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
                      >
                        {teams.map((team) => (
                          <option
                            key={team.team_id}
                            value={team.team_id}
                            disabled={
                              team.team_id === team2Id
                            }
                          >
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-zinc-300">
                        Team 2
                      </label>

                      <select
                        aria-label="Team 2"
                        value={team2Id}
                        onChange={(event) => { resetInsights(); setTeam2Id(
                            Number(event.target.value)
                          ); }}
                        className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
                      >
                        {teams.map((team) => (
                          <option
                            key={team.team_id}
                            value={team.team_id}
                            disabled={
                              team.team_id === team1Id
                            }
                          >
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {team1 && team2 && (
                  <>
                    <section className="mt-8 grid gap-6 lg:grid-cols-2">
                      <TeamCard
                        team={team1}
                        displayValue={displayValue}
                      />

                      <TeamCard
                        team={team2}
                        displayValue={displayValue}
                      />
                    </section>

                    <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                            Side-by-Side
                          </p>

                          <h2 className="mt-2 text-2xl font-semibold">
                            Team Comparison
                          </h2>
                        </div>

                        <div className="rounded-xl border border-pink-400/20 bg-pink-500/10 px-4 py-2 text-sm text-pink-200">
                          {team1.name} vs {team2.name}
                        </div>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
                        <ComparisonRow
                          label="FIFA Rank"
                          team1Value={
                            team1.fifa_rank !== null &&
                            team1.fifa_rank !== undefined
                              ? `#${team1.fifa_rank}`
                              : "Unavailable"
                          }
                          team2Value={
                            team2.fifa_rank !== null &&
                            team2.fifa_rank !== undefined
                              ? `#${team2.fifa_rank}`
                              : "Unavailable"
                          }
                        />

                        <ComparisonRow
                          label="FIFA Points"
                          team1Value={displayValue(
                            null
                          )}
                          team2Value={displayValue(
                            null
                          )}
                        />

                        <ComparisonRow
                          label="Offense"
                          team1Value={displayValue(
                            team1.offense
                          )}
                          team2Value={displayValue(
                            team2.offense
                          )}
                        />

                        <ComparisonRow
                          label="Defense"
                          team1Value={displayValue(
                            team1.defense
                          )}
                          team2Value={displayValue(
                            team2.defense
                          )}
                        />

                        <ComparisonRow
                          label="Form"
                          team1Value={displayValue(
                            team1.form
                          )}
                          team2Value={displayValue(
                            team2.form
                          )}
                        />

                        <ComparisonRow
                          label="Star Power"
                          team1Value={displayValue(
                            team1.star_power
                          )}
                          team2Value={displayValue(
                            team2.star_power
                          )}
                        />

                        <ComparisonRow
                          label="Clutch"
                          team1Value={displayValue(
                            team1.clutch
                          )}
                          team2Value={displayValue(
                            team2.clutch
                          )}
                        />
                      </div>
                    </section>

                    <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                        Comparison Summary
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold">
                        Rating Advantages
                      </h2>

                      <p className="mt-2 text-sm text-zinc-400">
                        These comparisons use the ratings
                        returned by the Goal Stats backend.
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <AdvantageCard
                          label="Offense"
                          team1={team1}
                          team2={team2}
                          field="offense"
                        />

                        <AdvantageCard
                          label="Defense"
                          team1={team1}
                          team2={team2}
                          field="defense"
                        />

                        <AdvantageCard
                          label="Form"
                          team1={team1}
                          team2={team2}
                          field="form"
                        />

                        <AdvantageCard
                          label="Star Power"
                          team1={team1}
                          team2={team2}
                          field="star_power"
                        />

                        <AdvantageCard
                          label="Clutch"
                          team1={team1}
                          team2={team2}
                          field="clutch"
                        />
                      </div>
                    </section>

                    <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                            Match History
                          </p>

                          <h2 className="mt-2 text-2xl font-semibold">
                            Head-to-Head
                          </h2>
                        </div>

                        <button
                          type="button"
                          onClick={() => { resetInsights(); setInsightsRefresh(value => value + 1); }}
                          disabled={insightsLoading}
                          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                        >
                          {insightsLoading
                            ? "Loading..."
                            : "Refresh"}
                        </button>
                      </div>

                      {insightsLoading && (
                        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-zinc-400">
                          Loading match history...
                        </p>
                      )}

                      {insightsError && (
                        <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                          {insightsError}
                        </p>
                      )}

                      {!insightsLoading &&
                        !insightsError &&
                        insights && (
                          <>
                            {insights.source && (
                              <p className="mt-4 text-sm text-zinc-400">
                                Approved historical results, oldest first. Final scores include extra time and exclude shootouts.
                              </p>
                            )}

                            <div className="mt-5">
                              <MatchList
                                matches={
                                  insights.head_to_head ??
                                  []
                                }
                                emptyMessage={`No imported head-to-head matches are available for ${team1.name} and ${team2.name}.`}
                              />
                            </div>
                          </>
                        )}
                    </section>

                    <section className="mt-8">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                          Imported Results
                        </p>

                        <h2 className="mt-2 text-2xl font-semibold">
                          Team History
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                          Previous imported matches available
                          to the Goal Stats backend.
                        </p>
                      </div>

                      <div className="mt-5 grid gap-6 lg:grid-cols-2">
                        <HistoryCard
                          teamName={team1.name}
                          matches={
                            insights?.team1_history ?? []
                          }
                          loading={insightsLoading}
                        />

                        <HistoryCard
                          teamName={team2.name}
                          matches={
                            insights?.team2_history ?? []
                          }
                          loading={insightsLoading}
                        />
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function TeamCard({
  team,
  displayValue,
}: {
  team: Team;
  displayValue: (
    value: number | null | undefined
  ) => string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-6 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">
            Team Profile
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {team.name}
          </h2>
        </div>

        <div className="rounded-xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-widest text-pink-300">
            FIFA Rank
          </p>

          <p className="mt-1 text-2xl font-bold">
            {team.fifa_rank !== null &&
            team.fifa_rank !== undefined
              ? `#${team.fifa_rank}`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <RatingBox
          label="Offense"
          value={displayValue(team.offense)}
        />

        <RatingBox
          label="Defense"
          value={displayValue(team.defense)}
        />

        <RatingBox
          label="Form"
          value={displayValue(team.form)}
        />

        <RatingBox
          label="Star Power"
          value={displayValue(team.star_power)}
        />

        <RatingBox
          label="Clutch"
          value={displayValue(team.clutch)}
        />

        <RatingBox
          label="FIFA Points"
          value={displayValue(null)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-zinc-400">
          Ranking dataset
        </p>

        <p className="mt-1 font-semibold">
          {team.ranking_date ||
            "Ranking date unavailable"}
        </p>
      </div>
    </div>
  );
}

function RatingBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}

function ComparisonRow({
  label,
  team1Value,
  team2Value,
}: {
  label: string;
  team1Value: string;
  team2Value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 px-5 py-4 last:border-b-0">
      <strong className="text-left">
        {team1Value}
      </strong>

      <span className="text-center text-sm text-zinc-400">
        {label}
      </span>

      <strong className="text-right">
        {team2Value}
      </strong>
    </div>
  );
}

function AdvantageCard({
  label,
  team1,
  team2,
  field,
}: {
  label: string;
  team1: Team;
  team2: Team;
  field:
    | "offense"
    | "defense"
    | "form"
    | "star_power"
    | "clutch";
}) {
  const first = team1[field];
  const second = team2[field];

  let result = "Unavailable";

  if (
    first !== null &&
    first !== undefined &&
    second !== null &&
    second !== undefined
  ) {
    if (first > second) {
      result = `${team1.name} +${first - second}`;
    } else if (second > first) {
      result = `${team2.name} +${second - first}`;
    } else {
      result = "Even";
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-pink-400">
        {result}
      </p>
    </div>
  );
}

function MatchList({
  matches,
  emptyMessage,
}: {
  matches: HistoryMatch[];
  emptyMessage: string;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      {matches.map((match) => (
        <div
          key={match.match_id}
          className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-4 last:border-b-0"
        >
          <span className="font-semibold">
            {match.home_team_name}
            <span className="block text-sm text-zinc-400">{match.match_date} · {match.edition_label} · {match.competition_name}</span>
          </span>

          <span className="rounded-lg border border-pink-400/20 bg-pink-500/10 px-4 py-2 text-lg font-bold text-pink-300">
            {match.home_score}
            <span className="mx-2 text-zinc-500">
              –
            </span>
            {match.away_score}
          </span>

          <span className="font-semibold">
            {match.away_team_name}
          </span>
        </div>
      ))}
    </div>
  );
}

function HistoryCard({
  teamName,
  matches,
  loading,
}: {
  teamName: string;
  matches: HistoryMatch[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">
        Team History
      </p>

      <h3 className="mt-2 text-2xl font-bold">
        {teamName}
      </h3>

      {loading ? (
        <p className="mt-5 text-zinc-400">
          Loading history...
        </p>
      ) : (
        <div className="mt-5">
          <MatchList
            matches={matches}
            emptyMessage={`No imported match history is available for ${teamName}.`}
          />
        </div>
      )}
    </div>
  );
}