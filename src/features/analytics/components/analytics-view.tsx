"use client";

import Link from "next/link";
import React from "react";
import ViewNavigation from "@/components/view-navigation";

type PredictionResponse = {
  team1: string;
  team2: string;
  minute: number;
  status?: string;

  probabilities: {
    team1: number;
    draw: number;
    team2: number;
  };

  expected_goals_remaining?: {
    team1: number;
    team2: number;
  };

  momentum_percent?: {
    team1: number;
    team2: number;
  };
};

type TeamStats = {
  goals: number;
  possession: number;
  shots: number;
  shots_on_target: number;
  big_chances: number;
  defender_blocks: number;
  goalkeeper_saves: number;
  corners: number;
  yellow_cards: number;
  red_cards: number;
};

type ScenarioState = {
  team1: string;
  team2: string;
  minute: number;
  extra_minute?: number;
  status?: string;

  team1_stats: TeamStats;
  team2_stats: TeamStats;
};

type StoredPrediction = {
  prediction: PredictionResponse;
  scenario: ScenarioState;
};

type SnapshotRecord = {
  id?: string;
  uuid?: string;
  snapshot_id?: string;
  created_at?: string;
  state: ScenarioState;
  prediction: PredictionResponse;
};

type Team = {
  name: string;
  fifa_rank?: number | null;
};

type TournamentResultRow = {
  team: string;
  fifa_rank: number;
  semifinal_probability: number;
  final_probability: number;
  champion_probability: number;
};

type TournamentResult = {
  simulations: number;
  probability_unit: string;
  predicted_champion: string;

  most_common_final: {
    team1: string;
    team2: string;
    probability: number;
  };

  results: TournamentResultRow[];
};

type BacktestResultRow = {
  actual_winner: string;
  has_snapshot: boolean;
  id: string;
  pregame_correct: boolean;
  snapshot_correct: boolean;
};

type BacktestResult = {
  evaluated: number;
  pregame_correct: number;
  skipped_unlabeled: number;
  snapshots_evaluated: number;
  snapshot_correct: number;
  results: BacktestResultRow[];
};

export default function AnalyticsView() {
  const [current, setCurrent] =
    React.useState<StoredPrediction | null>(null);

  const [history, setHistory] =
    React.useState<SnapshotRecord[]>([]);

  const [loadingHistory, setLoadingHistory] =
    React.useState(false);

  const [error, setError] =
    React.useState("");

  const [historyError, setHistoryError] =
    React.useState("");

  const [teams, setTeams] =
    React.useState<Team[]>([]);

  const [teamsLoading, setTeamsLoading] =
    React.useState(true);

  const [teamsError, setTeamsError] =
    React.useState("");

  const [tournamentSize, setTournamentSize] =
    React.useState(4);

  const [selectedTeams, setSelectedTeams] =
    React.useState<string[]>([]);

  const [simulations, setSimulations] =
    React.useState(1000);

  const [tournamentResult, setTournamentResult] =
    React.useState<TournamentResult | null>(null);

  const [tournamentLoading, setTournamentLoading] =
    React.useState(false);

  const [tournamentError, setTournamentError] =
    React.useState("");

  const [backtestResult, setBacktestResult] =
    React.useState<BacktestResult | null>(null);

  const [backtestLoading, setBacktestLoading] =
    React.useState(true);

  const [backtestError, setBacktestError] =
    React.useState("");

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(
        "goalstats-current-prediction"
      );

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(stored) as StoredPrediction;

      if (!parsed?.prediction || !parsed?.scenario) {
        throw new Error(
          "Stored prediction is incomplete."
        );
      }

      setCurrent(parsed);
    } catch (err) {
      console.error(
        "ANALYTICS LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load current analytics."
      );
    }
  }, []);

  React.useEffect(() => {
    async function loadTeams() {
      setTeamsLoading(true);
      setTeamsError("");

      try {
        const response = await fetch(
          "/api/football/teams"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to load tournament teams."
          );
        }

        if (!Array.isArray(data)) {
          throw new Error(
            "Team data returned an invalid response."
          );
        }

        setTeams(data as Team[]);
      } catch (err) {
        console.error(
          "TOURNAMENT TEAM LOAD ERROR:",
          err
        );

        setTeamsError(
          err instanceof Error
            ? err.message
            : "Unable to load tournament teams."
        );
      } finally {
        setTeamsLoading(false);
      }
    }

    void loadTeams();
  }, []);

  React.useEffect(() => {
    void loadBacktests();
  }, []);

  React.useEffect(() => {
    if (!current) {
      return;
    }

    void loadHistory(
      current.scenario.team1,
      current.scenario.team2
    );
  }, [
    current?.scenario.team1,
    current?.scenario.team2,
  ]);

  async function loadBacktests() {
    setBacktestLoading(true);
    setBacktestError("");

    try {
      const response = await fetch(
        "/api/football/backtests"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to load backtesting results."
        );
      }

      if (
        !data ||
        !Array.isArray(data.results)
      ) {
        throw new Error(
          "Backtesting returned an invalid response."
        );
      }

      setBacktestResult(
        data as BacktestResult
      );
    } catch (err) {
      console.error(
        "BACKTEST LOAD ERROR:",
        err
      );

      setBacktestResult(null);

      setBacktestError(
        err instanceof Error
          ? err.message
          : "Unable to load backtesting results."
      );
    } finally {
      setBacktestLoading(false);
    }
  }

  async function loadHistory(
    team1?: string,
    team2?: string
  ) {
    const firstTeam =
      team1 ?? current?.scenario.team1;

    const secondTeam =
      team2 ?? current?.scenario.team2;

    if (
      !firstTeam ||
      !secondTeam ||
      loadingHistory
    ) {
      return;
    }

    setLoadingHistory(true);
    setHistoryError("");

    try {
      const params =
        new URLSearchParams({
          team1: firstTeam,
          team2: secondTeam,
          limit: "50",
        });

      const response = await fetch(
        `/api/football/snapshots?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to load saved analytics history."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Snapshot history returned an invalid response."
        );
      }

      setHistory(
        data as SnapshotRecord[]
      );
    } catch (err) {
      console.error(
        "ANALYTICS HISTORY ERROR:",
        err
      );

      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to load saved analytics history."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function toggleTournamentTeam(
    teamName: string
  ) {
    setTournamentResult(null);
    setTournamentError("");

    setSelectedTeams((previous) => {
      if (previous.includes(teamName)) {
        return previous.filter(
          (name) => name !== teamName
        );
      }

      if (
        previous.length >=
        tournamentSize
      ) {
        return previous;
      }

      return [
        ...previous,
        teamName,
      ];
    });
  }

  function changeTournamentSize(
    size: number
  ) {
    setTournamentSize(size);

    setSelectedTeams(
      (previous) =>
        previous.slice(0, size)
    );

    setTournamentResult(null);
    setTournamentError("");
  }

  function selectTopRankedTeams() {
    const ranked = [...teams]
      .sort((a, b) => {
        const rankA =
          a.fifa_rank ??
          Number.MAX_SAFE_INTEGER;

        const rankB =
          b.fifa_rank ??
          Number.MAX_SAFE_INTEGER;

        return rankA - rankB;
      })
      .slice(0, tournamentSize)
      .map((team) => team.name);

    setSelectedTeams(ranked);
    setTournamentResult(null);
    setTournamentError("");
  }

  function clearTournamentTeams() {
    setSelectedTeams([]);
    setTournamentResult(null);
    setTournamentError("");
  }

  async function runTournamentSimulation() {
    setTournamentError("");
    setTournamentResult(null);

    if (
      selectedTeams.length !==
      tournamentSize
    ) {
      setTournamentError(
        `Please select exactly ${tournamentSize} teams.`
      );

      return;
    }

    if (
      !Number.isFinite(simulations) ||
      simulations <= 0
    ) {
      setTournamentError(
        "Simulation count must be greater than 0."
      );

      return;
    }

    setTournamentLoading(true);

    try {
      const response = await fetch(
        "/api/football/tournaments/simulate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            simulations,
            teams: selectedTeams,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to run tournament simulation."
        );
      }

      if (
        !data ||
        !Array.isArray(data.results)
      ) {
        throw new Error(
          "Tournament simulator returned an invalid response."
        );
      }

      setTournamentResult(
        data as TournamentResult
      );
    } catch (err) {
      console.error(
        "TOURNAMENT SIMULATION ERROR:",
        err
      );

      setTournamentError(
        err instanceof Error
          ? err.message
          : "Unable to run tournament simulation."
      );
    } finally {
      setTournamentLoading(false);
    }
  }

  if (!current) {
    return (
      <main
        className="min-h-screen bg-cover bg-center bg-fixed text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(3,10,18,0.82), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <ViewNavigation
            currentPath="/analytics"
          />

          <section className="mt-8 rounded-3xl border border-white/10 bg-[#071522]/90 p-8 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Analytics
            </p>

            <h1 className="mt-3 text-5xl font-bold">
              No Match Loaded
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Create a match prediction first.
              Goal Stats will then use the current
              match and its saved snapshots to
              build trend and historical analytics.
            </p>

            {error && (
              <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                {error}
              </p>
            )}

            <Link
              href="/matches"
              className="mt-6 inline-block rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
            >
              Build a Match Scenario →
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const {
    prediction,
    scenario,
  } = current;

  const chartHistory =
    [...history].reverse();

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,10,18,0.80), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <ViewNavigation
          currentPath="/analytics"
        />

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
              Analytics
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold md:text-5xl">
                  {prediction.team1}

                  <span className="mx-3 text-zinc-500">
                    vs
                  </span>

                  {prediction.team2}
                </h1>

                <p className="mt-3 text-zinc-300">
                  Minute {scenario.minute}

                  {scenario.extra_minute
                    ? `+${scenario.extra_minute}`
                    : ""}

                  {scenario.status
                    ? ` · ${scenario.status}`
                    : ""}
                </p>
              </div>

              <div className="rounded-xl border border-pink-400/20 bg-pink-500/10 px-5 py-3">
                <p className="text-sm uppercase tracking-widest text-pink-300">
                  Current Score
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {scenario.team1_stats.goals}

                  <span className="mx-3 text-zinc-500">
                    –
                  </span>

                  {scenario.team2_stats.goals}
                </p>
              </div>
            </div>

            {/* MATCH TRENDS */}

            <section className="mt-10 border-t border-white/10 pt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
                Match Trends
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                How the Match Is Changing
              </h2>

              <p className="mt-3 max-w-3xl text-zinc-400">
                Analyze momentum and compare
                saved match states to see how
                the model and match statistics
                change over time.
              </p>
            </section>

            {prediction.momentum_percent && (
              <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                  Current Trend
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  Match Momentum
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Current momentum from the
                  prediction model.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <MomentumCard
                    team={prediction.team1}
                    value={
                      prediction
                        .momentum_percent
                        .team1
                    }
                  />

                  <MomentumCard
                    team={prediction.team2}
                    value={
                      prediction
                        .momentum_percent
                        .team2
                    }
                  />
                </div>
              </section>
            )}

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                    Saved Snapshots
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Probability History
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    See how win and draw probabilities
                    changed across saved moments in
                    the match.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadHistory()
                  }
                  disabled={loadingHistory}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingHistory
                    ? "Loading..."
                    : "Refresh"}
                </button>
              </div>

              {historyError && (
                <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                  {historyError}
                </p>
              )}

              {!loadingHistory &&
                !historyError &&
                history.length === 0 && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
                    No saved snapshots are available
                    for this matchup yet. Save
                    snapshots from Predictions to
                    build this trend.
                  </div>
                )}

              {chartHistory.length > 0 && (
                <div className="mt-6">
                  <ProbabilityHistory
                    history={chartHistory}
                    team1={scenario.team1}
                    team2={scenario.team2}
                  />
                </div>
              )}
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <TrendPanel
                eyebrow="Match Trend"
                title="Possession History"
                description="Possession values across saved match snapshots."
              >
                {chartHistory.length > 0 ? (
                  <PossessionHistory
                    history={chartHistory}
                    team1={scenario.team1}
                    team2={scenario.team2}
                  />
                ) : (
                  <EmptyTrend />
                )}
              </TrendPanel>

              <TrendPanel
                eyebrow="Model Trend"
                title="Expected Goals Remaining"
                description="Remaining expected goals across saved model predictions."
              >
                {chartHistory.length > 0 ? (
                  <ExpectedGoalsHistory
                    history={chartHistory}
                    team1={scenario.team1}
                    team2={scenario.team2}
                  />
                ) : (
                  <EmptyTrend />
                )}
              </TrendPanel>
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                Snapshot Timeline
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Saved Match States
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Each snapshot records the state
                of the match and its prediction
                at that moment.
              </p>

              {history.length === 0 ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
                  No saved match states yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {history.map(
                    (snapshot, index) => (
                      <SnapshotRow
                        key={
                          snapshot.id ??
                          snapshot.uuid ??
                          snapshot.snapshot_id ??
                          `${snapshot.created_at}-${index}`
                        }
                        snapshot={snapshot}
                      />
                    )
                  )}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                Current Match Data
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Match Statistics
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                The current match state used
                by the analytics and prediction
                model.
              </p>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <AnalyticsTeamCard
                  name={scenario.team1}
                  stats={scenario.team1_stats}
                />

                <AnalyticsTeamCard
                  name={scenario.team2}
                  stats={scenario.team2_stats}
                />
              </div>
            </section>

            {/* MODEL EVALUATION */}

            <section className="mt-10 border-t border-white/10 pt-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
                    Model Evaluation
                  </p>

                  <h2 className="mt-2 text-3xl font-bold">
                    Backtesting
                  </h2>

                  <p className="mt-3 max-w-3xl text-zinc-400">
                    Evaluate how the Goal Stats
                    prediction model performs
                    against imported historical
                    match results.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadBacktests()
                  }
                  disabled={backtestLoading}
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                >
                  {backtestLoading
                    ? "Loading..."
                    : "Refresh Backtest"}
                </button>
              </div>

              {backtestError && (
                <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                  {backtestError}
                </p>
              )}

              {backtestLoading &&
                !backtestResult && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/55 p-6 text-zinc-300">
                    Loading historical model
                    results...
                  </div>
                )}

              {backtestResult && (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <BacktestMetricCard
                      label="Matches Evaluated"
                      value={String(
                        backtestResult.evaluated
                      )}
                    />

                    <BacktestMetricCard
                      label="Pregame Correct"
                      value={`${backtestResult.pregame_correct} / ${backtestResult.evaluated}`}
                    />

                    <BacktestMetricCard
                      label="Pregame Accuracy"
                      value={formatBacktestAccuracy(
                        backtestResult.pregame_correct,
                        backtestResult.evaluated
                      )}
                    />

                    <BacktestMetricCard
                      label="Skipped / Unlabeled"
                      value={String(
                        backtestResult.skipped_unlabeled
                      )}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/55 p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                      Snapshot Evaluation
                    </p>

                    {backtestResult.snapshots_evaluated >
                    0 ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <BacktestMetricCard
                          label="Snapshots Evaluated"
                          value={String(
                            backtestResult.snapshots_evaluated
                          )}
                        />

                        <BacktestMetricCard
                          label="Snapshot Correct"
                          value={`${backtestResult.snapshot_correct} / ${backtestResult.snapshots_evaluated}`}
                        />

                        <BacktestMetricCard
                          label="Snapshot Accuracy"
                          value={formatBacktestAccuracy(
                            backtestResult.snapshot_correct,
                            backtestResult.snapshots_evaluated
                          )}
                        />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
                        No historical snapshots were
                        evaluated, so snapshot accuracy
                        is not available yet.
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/55">
                    <div className="border-b border-white/10 p-6">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                        Historical Results
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold">
                        Evaluated Matches
                      </h3>

                      <p className="mt-2 text-sm text-zinc-400">
                        The table shows the actual
                        winner and whether the
                        pregame model was correct
                        for each labeled match.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-left text-sm text-zinc-400">
                            <th className="px-5 py-4">
                              Actual Winner
                            </th>

                            <th className="px-5 py-4">
                              Pregame
                            </th>

                            <th className="px-5 py-4">
                              Snapshot
                            </th>

                            <th className="px-5 py-4">
                              Record
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {backtestResult.results.map(
                            (row) => (
                              <tr
                                key={row.id}
                                className="border-b border-white/10 last:border-b-0"
                              >
                                <td className="px-5 py-4 font-semibold">
                                  {row.actual_winner}
                                </td>

                                <td className="px-5 py-4">
                                  <ResultStatus
                                    available={true}
                                    correct={
                                      row.pregame_correct
                                    }
                                  />
                                </td>

                                <td className="px-5 py-4">
                                  <ResultStatus
                                    available={
                                      row.has_snapshot
                                    }
                                    correct={
                                      row.snapshot_correct
                                    }
                                  />
                                </td>

                                <td className="px-5 py-4 font-mono text-xs text-zinc-500">
                                  {shortBacktestId(
                                    row.id
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-zinc-500">
                    Backtesting reflects only the
                    historical records currently
                    available to the backend. A
                    perfect score on this dataset
                    does not mean the model will be
                    perfect on future matches.
                  </p>
                </div>
              )}
            </section>

            {/* TOURNAMENT ANALYSIS */}

            <section className="mt-10 border-t border-white/10 pt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
                Tournament Analysis
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Monte Carlo Tournament Simulation
              </h2>

              <p className="mt-3 max-w-3xl text-zinc-400">
                Choose teams and run the existing
                Goal Stats tournament simulator to
                estimate each team&apos;s chances of
                reaching later rounds and winning
                the tournament.
              </p>

              <div className="mt-6 rounded-2xl border border-pink-400/20 bg-pink-500/10 p-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-pink-300">
                  Tournament Setup
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-300">
                      Tournament Size
                    </label>

                    <select
                      value={tournamentSize}
                      onChange={(event) =>
                        changeTournamentSize(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-full rounded-lg border border-white/20 bg-black/60 p-3 text-white"
                    >
                      <option value={4}>
                        4 Teams
                      </option>

                      <option value={8}>
                        8 Teams
                      </option>

                      <option value={16}>
                        16 Teams
                      </option>

                      <option value={32}>
                        32 Teams
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-300">
                      Simulations
                    </label>

                    <input
                      type="number"
                      min={1}
                      step={100}
                      value={simulations}
                      onChange={(event) =>
                        setSimulations(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-full rounded-lg border border-white/20 bg-black/60 p-3 text-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-zinc-300">
                    Selected{" "}
                    <strong>
                      {selectedTeams.length}
                    </strong>{" "}
                    of{" "}
                    <strong>
                      {tournamentSize}
                    </strong>{" "}
                    teams
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={
                        selectTopRankedTeams
                      }
                      disabled={teamsLoading}
                      className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Select Top Ranked
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearTournamentTeams
                      }
                      className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {teamsLoading && (
                  <p className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-zinc-300">
                    Loading teams...
                  </p>
                )}

                {teamsError && (
                  <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                    {teamsError}
                  </p>
                )}

                {!teamsLoading &&
                  !teamsError && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {teams.map(
                        (team) => {
                          const selected =
                            selectedTeams.includes(
                              team.name
                            );

                          const disabled =
                            !selected &&
                            selectedTeams.length >=
                              tournamentSize;

                          return (
                            <button
                              key={team.name}
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                toggleTournamentTeam(
                                  team.name
                                )
                              }
                              className={`rounded-xl border p-4 text-left transition ${
                                selected
                                  ? "border-pink-400 bg-pink-500/20"
                                  : "border-white/10 bg-black/30 hover:bg-white/10"
                              } ${
                                disabled
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                              }`}
                            >
                              <div className="font-semibold">
                                {team.name}
                              </div>

                              <div className="mt-1 text-xs text-zinc-400">
                                {team.fifa_rank !==
                                  null &&
                                team.fifa_rank !==
                                  undefined
                                  ? `FIFA #${team.fifa_rank}`
                                  : "Rank unavailable"}
                              </div>

                              {selected && (
                                <div className="mt-2 text-xs font-semibold text-pink-300">
                                  Selected
                                </div>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                {tournamentError && (
                  <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                    {tournamentError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void runTournamentSimulation()
                  }
                  disabled={
                    tournamentLoading ||
                    selectedTeams.length !==
                      tournamentSize
                  }
                  className="mt-6 rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tournamentLoading
                    ? "Running Simulation..."
                    : "Run Monte Carlo Simulation"}
                </button>

                <p className="mt-3 text-xs text-zinc-400">
                  The simulator uses the real
                  backend endpoint. Results are
                  not generated or hard-coded
                  in the frontend.
                </p>
              </div>

              {tournamentResult && (
                <div className="mt-8 space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <TournamentSummaryCard
                      label="Predicted Champion"
                      value={
                        tournamentResult.predicted_champion
                      }
                    />

                    <TournamentSummaryCard
                      label="Most Common Final"
                      value={`${tournamentResult.most_common_final.team1} vs ${tournamentResult.most_common_final.team2}`}
                      secondary={formatTournamentPercent(
                        tournamentResult
                          .most_common_final
                          .probability
                      )}
                    />

                    <TournamentSummaryCard
                      label="Simulations"
                      value={tournamentResult.simulations.toLocaleString()}
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/55">
                    <div className="border-b border-white/10 p-6">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                        Simulation Results
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold">
                        Tournament Probabilities
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-left text-sm text-zinc-400">
                            <th className="px-5 py-4">
                              Team
                            </th>

                            <th className="px-5 py-4">
                              FIFA Rank
                            </th>

                            <th className="px-5 py-4">
                              Semifinal
                            </th>

                            <th className="px-5 py-4">
                              Final
                            </th>

                            <th className="px-5 py-4">
                              Champion
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {[
                            ...tournamentResult.results,
                          ]
                            .sort(
                              (a, b) =>
                                b.champion_probability -
                                a.champion_probability
                            )
                            .map((row) => (
                              <tr
                                key={row.team}
                                className="border-b border-white/10 last:border-b-0"
                              >
                                <td className="px-5 py-4 font-semibold">
                                  {row.team}

                                  {row.team ===
                                    tournamentResult.predicted_champion && (
                                    <span className="ml-3 rounded-full border border-pink-400/30 bg-pink-500/15 px-2 py-1 text-xs text-pink-300">
                                      Predicted
                                      Champion
                                    </span>
                                  )}
                                </td>

                                <td className="px-5 py-4 text-zinc-300">
                                  #{row.fifa_rank}
                                </td>

                                <td className="px-5 py-4">
                                  {formatTournamentPercent(
                                    row.semifinal_probability
                                  )}
                                </td>

                                <td className="px-5 py-4">
                                  {formatTournamentPercent(
                                    row.final_probability
                                  )}
                                </td>

                                <td className="px-5 py-4 font-bold text-pink-400">
                                  {formatTournamentPercent(
                                    row.champion_probability
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-8">
              <Link
                href="/predictions"
                className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
              >
                Back to Prediction
              </Link>

              <Link
                href="/matches"
                className="rounded-xl border border-white/20 bg-black/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Edit Match Scenario
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MomentumCard({
  team,
  value,
}: {
  team: string;
  value: number;
}) {
  const safeValue = Math.max(
    0,
    Math.min(
      100,
      Number(value)
    )
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold">
          {team}
        </span>

        <strong className="text-xl text-pink-400">
          {safeValue.toFixed(1)}%
        </strong>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-pink-500"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function TrendPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm text-zinc-400">
        {description}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

function AnalyticsTeamCard({
  name,
  stats,
}: {
  name: string;
  stats: TeamStats;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-2xl font-bold">
        {name}
      </h3>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <StatLine
          label="Goals"
          value={stats.goals}
        />

        <StatLine
          label="Possession"
          value={`${stats.possession}%`}
        />

        <StatLine
          label="Shots"
          value={stats.shots}
        />

        <StatLine
          label="Shots on Target"
          value={stats.shots_on_target}
        />

        <StatLine
          label="Big Chances"
          value={stats.big_chances}
        />

        <StatLine
          label="Blocks"
          value={stats.defender_blocks}
        />

        <StatLine
          label="GK Saves"
          value={stats.goalkeeper_saves}
        />

        <StatLine
          label="Corners"
          value={stats.corners}
        />

        <StatLine
          label="Yellow Cards"
          value={stats.yellow_cards}
        />

        <StatLine
          label="Red Cards"
          value={stats.red_cards}
        />
      </div>
    </div>
  );
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400">
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function ProbabilityHistory({
  history,
  team1,
  team2,
}: {
  history: SnapshotRecord[];
  team1: string;
  team2: string;
}) {
  return (
    <div className="space-y-4">
      {history.map(
        (snapshot, index) => {
          const probabilities =
            snapshot.prediction
              .probabilities;

          const team1Percent =
            probabilities.team1 *
            100;

          const drawPercent =
            probabilities.draw *
            100;

          const team2Percent =
            probabilities.team2 *
            100;

          return (
            <div
              key={`${snapshot.created_at}-${index}`}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">
                  {snapshot.state.minute}

                  {snapshot.state.extra_minute
                    ? `+${snapshot.state.extra_minute}`
                    : ""}

                  &apos;
                </span>

                <span className="text-sm text-zinc-400">
                  {formatDate(
                    snapshot.created_at
                  )}
                </span>
              </div>

              <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="bg-pink-500"
                  style={{
                    width: `${team1Percent}%`,
                  }}
                />

                <div
                  className="bg-zinc-400"
                  style={{
                    width: `${drawPercent}%`,
                  }}
                />

                <div
                  className="bg-white"
                  style={{
                    width: `${team2Percent}%`,
                  }}
                />
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <span>
                  {team1}:{" "}

                  <strong className="text-pink-400">
                    {team1Percent.toFixed(
                      1
                    )}
                    %
                  </strong>
                </span>

                <span>
                  Draw:{" "}

                  <strong>
                    {drawPercent.toFixed(
                      1
                    )}
                    %
                  </strong>
                </span>

                <span className="sm:text-right">
                  {team2}:{" "}

                  <strong>
                    {team2Percent.toFixed(
                      1
                    )}
                    %
                  </strong>
                </span>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

function PossessionHistory({
  history,
  team1,
  team2,
}: {
  history: SnapshotRecord[];
  team1: string;
  team2: string;
}) {
  return (
    <div className="space-y-4">
      {history.map(
        (snapshot, index) => {
          const first =
            snapshot.state
              .team1_stats
              .possession;

          const second =
            snapshot.state
              .team2_stats
              .possession;

          return (
            <div
              key={`${snapshot.created_at}-possession-${index}`}
            >
              <div className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {snapshot.state.minute}
                  &apos;
                </span>

                <span className="text-zinc-400">
                  {team1} {first}% ·{" "}
                  {team2} {second}%
                </span>
              </div>

              <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="bg-pink-500"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        first
                      )
                    )}%`,
                  }}
                />

                <div
                  className="bg-white"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        second
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

function ExpectedGoalsHistory({
  history,
  team1,
  team2,
}: {
  history: SnapshotRecord[];
  team1: string;
  team2: string;
}) {
  const usable =
    history.filter(
      (snapshot) =>
        snapshot.prediction
          .expected_goals_remaining !==
        undefined
    );

  if (usable.length === 0) {
    return <EmptyTrend />;
  }

  return (
    <div className="space-y-3">
      {usable.map(
        (snapshot, index) => {
          const xg =
            snapshot.prediction
              .expected_goals_remaining!;

          return (
            <div
              key={`${snapshot.created_at}-xg-${index}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-zinc-400">
                {snapshot.state.minute}
                &apos;
              </span>

              <span className="text-sm">
                {team1}{" "}

                <strong className="text-pink-400">
                  {xg.team1.toFixed(2)}
                </strong>

                <span className="mx-2 text-zinc-500">
                  ·
                </span>

                {team2}{" "}

                <strong>
                  {xg.team2.toFixed(2)}
                </strong>
              </span>

              <span className="text-xs text-zinc-500">
                xG
              </span>
            </div>
          );
        }
      )}
    </div>
  );
}

function SnapshotRow({
  snapshot,
}: {
  snapshot: SnapshotRecord;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            {formatDate(
              snapshot.created_at
            )}
          </p>

          <p className="mt-1 text-lg font-bold">
            {snapshot.state.team1}{" "}
            {snapshot.state.team1_stats.goals}

            <span className="mx-2 text-zinc-500">
              –
            </span>

            {snapshot.state.team2_stats.goals}{" "}
            {snapshot.state.team2}
          </p>
        </div>

        <div className="rounded-lg border border-pink-400/20 bg-pink-500/10 px-4 py-2 font-semibold text-pink-300">
          {snapshot.state.minute}

          {snapshot.state.extra_minute
            ? `+${snapshot.state.extra_minute}`
            : ""}

          &apos;
        </div>
      </div>
    </div>
  );
}

function EmptyTrend() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
      Save multiple snapshots to
      build this trend.
    </div>
  );
}

function BacktestMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-zinc-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}

function ResultStatus({
  available,
  correct,
}: {
  available: boolean;
  correct: boolean;
}) {
  if (!available) {
    return (
      <span className="text-zinc-500">
        Not available
      </span>
    );
  }

  return (
    <span
      className={
        correct
          ? "font-semibold text-emerald-300"
          : "font-semibold text-red-300"
      }
    >
      {correct ? "Correct" : "Incorrect"}
    </span>
  );
}

function formatBacktestAccuracy(
  correct: number,
  evaluated: number
) {
  if (evaluated <= 0) {
    return "Not available";
  }

  return `${(
    (correct / evaluated) *
    100
  ).toFixed(1)}%`;
}

function shortBacktestId(
  id: string
) {
  if (id.length <= 14) {
    return id;
  }

  return `${id.slice(
    0,
    8
  )}…${id.slice(-6)}`;
}

function TournamentSummaryCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-pink-400/20 bg-pink-500/10 p-5">
      <p className="text-sm uppercase tracking-widest text-pink-300">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

      {secondary && (
        <p className="mt-2 text-sm text-zinc-300">
          {secondary}
        </p>
      )}
    </div>
  );
}

function formatTournamentPercent(
  value: number
) {
  return `${Number(value).toFixed(1)}%`;
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "Saved snapshot";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}