"use client";

import Link from "next/link";
import React from "react";
import ViewNavigation from "@/components/view-navigation";

import {parseTeams,parseSavedPrediction,parsePredictionHistory,parsePreviewSession,previewPredictionView,savedPredictionView,previewStorageKey,routeId,strengthFields,type TeamStats,type Team,type PredictionView as StoredPrediction,type SavedPrediction as SnapshotRecord} from "@/lib/football";

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
    React.useState<number[]>([]);

  const [simulations, setSimulations] =
    React.useState(1000);

  const [tournamentResult, setTournamentResult] =
    React.useState<TournamentResult | null>(null);


  const [tournamentError, setTournamentError] =
    React.useState("Tournament simulation is deferred: explicit strengths for every participant and bracket ordering are required.");

  const [backtestResult] =
    React.useState<BacktestResult | null>(null);

  const [backtestLoading] =
    React.useState(false);

  const [backtestError, setBacktestError] =
    React.useState("Backtesting is deferred: the approved backend does not provide an accuracy or backtesting endpoint.");

  const [scenarioId, setScenarioId] = React.useState<number | null>(null);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [historyOffset, setHistoryOffset] = React.useState(0);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const pageSize = 50;
  React.useEffect(() => {
    const controller = new AbortController();
    async function loadCurrent() {
      try {
        const params = new URLSearchParams(window.location.search);
        const predictionId = routeId(params.get("prediction_id"));
        const requestedScenario = routeId(params.get("scenario_id"));
        if (predictionId && requestedScenario) throw new Error("Open either a saved prediction or a scenario.");
        if (predictionId) {
          const response = await fetch(`/api/football/predictions/${predictionId}`,{signal:controller.signal});
          const data = await response.json();
          if (!response.ok) throw new Error(data?.detail || "Unable to load saved analytics.");
          const record = parseSavedPrediction(data);
          if (record.prediction_id !== predictionId) throw new Error("Invalid prediction identity.");
          if (!controller.signal.aborted) { setCurrent(savedPredictionView(record)); setScenarioId(record.scenario_id); }
        } else if (requestedScenario) {
          const response = await fetch(`/api/football/scenarios/${requestedScenario}/predictions?limit=1&offset=0`,{signal:controller.signal});
          const data = await response.json();
          if (!response.ok) throw new Error(data?.detail || "Unable to load scenario predictions.");
          const records = parsePredictionHistory(data,requestedScenario);
          if (controller.signal.aborted) return;
          setScenarioId(requestedScenario);
          if (records[0]) setCurrent(savedPredictionView(records[0]));
          else setError("This scenario has no saved predictions yet. Open Predictions to generate one explicitly.");
        } else {
          const stored = sessionStorage.getItem(previewStorageKey);
          if (stored) setCurrent(previewPredictionView(parsePreviewSession(JSON.parse(stored))));
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load analytics.");
      } finally { if (!controller.signal.aborted) setInitialLoading(false); }
    }
    void loadCurrent();
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    async function loadTeams() {
      try {
        const response = await fetch("/api/football/catalog/teams",{signal:controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to load tournament teams.");
        const records = parseTeams(data);
        if (!controller.signal.aborted) setTeams(records);
      } catch (err) {
        if (!controller.signal.aborted) setTeamsError(err instanceof Error ? err.message : "Unable to load tournament teams.");
      } finally { if (!controller.signal.aborted) setTeamsLoading(false); }
    }
    void loadTeams();
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    async function historyPage() {
      if (!scenarioId) return;
      setLoadingHistory(true); setHistoryError(""); setHistory([]);
      try {
        const response = await fetch(`/api/football/scenarios/${scenarioId}/predictions?limit=${pageSize}&offset=${historyOffset}`,{signal:controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to load saved analytics history.");
        const records = parsePredictionHistory(data,scenarioId);
        if (!controller.signal.aborted) setHistory(records);
      } catch (err) {
        if (!controller.signal.aborted) setHistoryError(err instanceof Error ? err.message : "Unable to load saved analytics history.");
      } finally { if (!controller.signal.aborted) setLoadingHistory(false); }
    }
    void historyPage();
    return () => controller.abort();
  }, [scenarioId, historyOffset, historyRefresh]);

  function loadHistory() { setHistoryRefresh(value=>value+1); }
  function loadBacktests() { setBacktestError("Backtesting is deferred: the approved backend does not provide an accuracy or backtesting endpoint."); }

  function toggleTournamentTeam(
    teamName: number
  ) {
    setTournamentResult(null);
    setTournamentError("Tournament simulation is deferred: explicit strengths for every participant and bracket ordering are required.");

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
    setTournamentError("Tournament simulation is deferred: explicit strengths for every participant and bracket ordering are required.");
  }

  function selectTopRankedTeams() {
    const ranked = teams.filter(team=>team.fifa_rank!==null)
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
      .map((team) => team.team_id);

    setSelectedTeams(ranked);
    setTournamentResult(null);
    setTournamentError("Tournament simulation is deferred: explicit strengths for every participant and bracket ordering are required.");
  }

  function clearTournamentTeams() {
    setSelectedTeams([]);
    setTournamentResult(null);
    setTournamentError("Tournament simulation is deferred: explicit strengths for every participant and bracket ordering are required.");
  }

  function runTournamentSimulation() { setTournamentError("Tournament simulation is deferred until explicit strengths and bracket inputs are available."); }

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
              {initialLoading ? "Loading analytics..." : "No Match Loaded"}
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Create a match prediction first.
              Goal Stats will then use the current
              hypothetical scenario and its saved predictions to
              display model revisions.
            </p>

            {error && (
              <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                {error}
              </p>
            )}

            <Link
              href={scenarioId ? `/matches?scenario_id=${scenarioId}` : "/matches?preview=1"}
              className="mt-6 inline-block rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
            >
              Build a Match Scenario →
            </Link>
            <Link href={scenarioId ? `/predictions?scenario_id=${scenarioId}` : "/predictions"}>Browse saved predictions</Link>
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
        <p className="mt-4 text-sm text-zinc-400">{current.saved ? `Saved prediction #${current.saved.prediction_id} · ${formatDate(current.saved.generated_at)} · ${current.saved.model_version}` : `Unsaved hypothetical preview · ${current.prediction.model}`}</p>
        <p>Saved Hypothetical Scenario Revisions — not live or historical match telemetry. History follows prediction generation time, which need not follow match-minute order.</p>
        <details><summary>Hypothetical strength assumptions</summary>{(["team1","team2"] as const).map(side=><p key={side}>{current.scenario[side]}: {strengthFields.map(f=>`${f.replace("_"," ")} ${current.scenario.input[`${side}_${f}`]}`).join(" · ")}</p>)}</details>
        {scenarioId && <div><button type="button" disabled={loadingHistory||historyOffset===0} onClick={()=>setHistoryOffset(v=>Math.max(0,v-pageSize))}>Previous predictions</button><span>Prediction page {historyOffset/pageSize+1}</span><button type="button" disabled={loadingHistory||!!historyError||history.length<pageSize} onClick={()=>setHistoryOffset(v=>v+pageSize)}>Next predictions</button></div>}


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
                Compare Hypothetical Scenario Revisions
              </h2>

              <p className="mt-3 max-w-3xl text-zinc-400">
                Compare probabilities, possession assumptions, and expected goals across saved hypothetical states. Momentum is a model estimate for the selected prediction.
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
                  Model-estimated momentum for the selected hypothetical state.
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
                    Saved Predictions
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Probability History
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Compare win and draw probabilities across saved hypothetical revisions, ordered by generation time.
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
                description="Possession assumptions across saved hypothetical revisions."
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
                description="Model-estimated remaining goals across saved hypothetical predictions."
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
                Each snapshot preserves hypothetical inputs and the prediction generated from them.
              </p>

              {history.length === 0 ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
                  No saved match states yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {history.map(
                    (snapshot) => (
                      <SnapshotRow
                        key={
                          snapshot.prediction_id
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
                Hypothetical match statistics used to generate the selected prediction.
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
                    Historical backtesting is deferred in Phase 1. This website does not evaluate prediction accuracy against imported historical results.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadBacktests()
                  }
                  disabled={true}
                  className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                >
                  Backtesting unavailable in Phase 1
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
                Tournament simulation execution is unavailable through the Phase 1 website. The backend includes a simulator requiring explicit participant strengths and bracket ordering; this interface does not execute it.
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
                      disabled={teamsLoading || teams.every(team=>team.fifa_rank===null)}
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
                              team.team_id
                            );

                          const disabled =
                            !selected &&
                            selectedTeams.length >=
                              tournamentSize;

                          return (
                            <button
                              key={team.team_id}
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                toggleTournamentTeam(
                                  team.team_id
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
                  disabled={true}
                  className="mt-6 rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tournament execution unavailable in Phase 1
                </button>

                <p className="mt-3 text-xs text-zinc-400">
                  These setup controls do not run a simulation or produce tournament results in Phase 1.
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
                href={current.saved ? `/predictions?prediction_id=${current.saved.prediction_id}` : "/predictions"}
                className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
              >
                Back to Prediction
              </Link>

              <Link
                href={scenarioId ? `/matches?scenario_id=${scenarioId}` : "/matches?preview=1"}
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
            snapshot.output
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
              key={`${snapshot.generated_at}-${index}`}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">
                  {snapshot.input_snapshot.match_minute}

                  {snapshot.input_snapshot.extra_minute
                    ? `+${snapshot.input_snapshot.extra_minute}`
                    : ""}

                  &apos;
                </span>

                <span className="text-sm text-zinc-400">
                  {formatDate(
                    snapshot.generated_at
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
            snapshot.input_snapshot.team1_possession;

          const second =
            snapshot.input_snapshot.team2_possession;

          return (
            <div
              key={`${snapshot.generated_at}-possession-${index}`}
            >
              <div className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {snapshot.input_snapshot.match_minute}
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
        snapshot.output
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
            snapshot.output
              .expected_goals_remaining!;

          return (
            <div
              key={`${snapshot.generated_at}-xg-${index}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-zinc-400">
                {snapshot.input_snapshot.match_minute}
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
              snapshot.generated_at
            )}
          </p>

          <p className="mt-1 text-lg font-bold">
            {snapshot.input_snapshot.team1_name}{" "}
            {snapshot.input_snapshot.team1_goals}

            <span className="mx-2 text-zinc-500">
              –
            </span>

            {snapshot.input_snapshot.team2_goals}{" "}
            {snapshot.input_snapshot.team2_name}
          </p>
        </div>

        <div className="rounded-lg border border-pink-400/20 bg-pink-500/10 px-4 py-2 font-semibold text-pink-300">
          {snapshot.input_snapshot.match_minute}

          {snapshot.input_snapshot.extra_minute
            ? `+${snapshot.input_snapshot.extra_minute}`
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
      Save multiple predictions to
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
    return "Saved prediction";
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