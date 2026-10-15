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

  most_likely_score?: [number, number];

  top_scorelines?: {
    team1_goals: number;
    team2_goals: number;
    probability: number;
  }[];

  confidence?: {
    label: string;
    percent: number;
  };

  momentum_percent?: {
    team1: number;
    team2: number;
  };

  advancement?: {
    team1: number;
    team2: number;
  };

  reasoning?: string[];

  events?: {
    minute: number | string;
    team: string;
    type: string;
    detail: string;
  }[];
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

export default function PredictionsView() {
  const [result, setResult] =
    React.useState<StoredPrediction | null>(null);

  const [history, setHistory] =
    React.useState<SnapshotRecord[]>([]);

  const [error, setError] = React.useState("");
  const [historyError, setHistoryError] = React.useState("");
  const [saveMessage, setSaveMessage] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(
        "goalstats-current-prediction"
      );

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as StoredPrediction;

      if (!parsed?.prediction || !parsed?.scenario) {
        throw new Error("Saved prediction is incomplete.");
      }

      setResult(parsed);
    } catch (err) {
      console.error("PREDICTION LOAD ERROR:", err);
      setError("Unable to load the current prediction.");
    }
  }, []);

  React.useEffect(() => {
    if (!result) {
      return;
    }

    void loadHistory(result.scenario.team1, result.scenario.team2);
  }, [result?.scenario.team1, result?.scenario.team2]);

  function percentFraction(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function percentValue(value: number) {
    return `${Number(value).toFixed(1)}%`;
  }

  async function saveSnapshot() {
    if (!result || saving) {
      return;
    }

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/football/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.scenario),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to save snapshot."
        );
      }

      if (data?.prediction) {
        const updated: StoredPrediction = {
          scenario: result.scenario,
          prediction: data.prediction as PredictionResponse,
        };

        setResult(updated);

        sessionStorage.setItem(
          "goalstats-current-prediction",
          JSON.stringify(updated)
        );
      }

      setSaveMessage("Snapshot saved successfully.");

      await loadHistory(
        result.scenario.team1,
        result.scenario.team2
      );
    } catch (err) {
      console.error("SNAPSHOT SAVE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save snapshot."
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory(team1?: string, team2?: string) {
    const firstTeam = team1 ?? result?.scenario.team1;
    const secondTeam = team2 ?? result?.scenario.team2;

    if (!firstTeam || !secondTeam || loadingHistory) {
      return;
    }

    setLoadingHistory(true);
    setHistoryError("");

    try {
      const params = new URLSearchParams({
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
          data?.detail || "Unable to load prediction history."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Prediction history returned an invalid response.");
      }

      setHistory(data as SnapshotRecord[]);
    } catch (err) {
      console.error("SNAPSHOT HISTORY ERROR:", err);

      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to load prediction history."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function loadSnapshot(snapshot: SnapshotRecord) {
    if (!snapshot?.state || !snapshot?.prediction) {
      setHistoryError("This saved snapshot is incomplete.");
      return;
    }

    const stored: StoredPrediction = {
      scenario: snapshot.state,
      prediction: snapshot.prediction,
    };

    setResult(stored);

    sessionStorage.setItem(
      "goalstats-current-prediction",
      JSON.stringify(stored)
    );

    setSaveMessage("Saved prediction loaded.");
    setHistoryError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function formatSavedDate(value?: string) {
    if (!value) {
      return "Saved prediction";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  if (!result) {
    return (
      <main
        className="min-h-screen bg-cover bg-center bg-fixed text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(3,10,18,0.82), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <ViewNavigation currentPath="/predictions" />

          <section className="mt-8 rounded-3xl border border-white/10 bg-[#071522]/90 p-8 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Prediction Analysis
            </p>

            <h1 className="mt-3 text-5xl font-bold">
              No Prediction Loaded
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Create a match scenario first, then Goal Stats will show the full
              prediction analysis here.
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

  const { prediction, scenario } = result;

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,10,18,0.80), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <ViewNavigation currentPath="/predictions" />

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#071522]/90 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div
            className="pointer-events-none absolute right-[-70px] top-[-50px] h-[380px] w-[380px] bg-contain bg-center bg-no-repeat opacity-10"
            style={{
              backgroundImage: "url('/images/matches-watermark.png')",
            }}
          />

          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Prediction Analysis
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold md:text-5xl">
                  {prediction.team1}
                  <span className="mx-3 text-zinc-500">vs</span>
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
                  <span className="mx-3 text-zinc-500">–</span>
                  {scenario.team2_stats.goals}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSnapshot}
                disabled={saving}
                className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Snapshot"}
              </button>

              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loadingHistory}
                className="rounded-xl border border-white/20 bg-black/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingHistory
                  ? "Loading History..."
                  : "Reload History"}
              </button>
            </div>

            {saveMessage && (
              <p className="mt-4 rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-green-200">
                {saveMessage}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                {error}
              </p>
            )}

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">
                Win{" "}
                <span className="text-pink-400">
                  Probabilities
                </span>
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label={`${prediction.team1} Win`}
                  value={percentFraction(
                    prediction.probabilities.team1
                  )}
                />

                <MetricCard
                  label="Draw"
                  value={percentFraction(
                    prediction.probabilities.draw
                  )}
                />

                <MetricCard
                  label={`${prediction.team2} Win`}
                  value={percentFraction(
                    prediction.probabilities.team2
                  )}
                />
              </div>
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-2">
              {prediction.most_likely_score && (
                <InfoPanel title="Most Likely Score">
                  <p className="text-3xl font-bold">
                    {prediction.team1}{" "}
                    {prediction.most_likely_score[0]}
                    <span className="mx-3 text-zinc-500">
                      –
                    </span>
                    {prediction.most_likely_score[1]}{" "}
                    {prediction.team2}
                  </p>
                </InfoPanel>
              )}

              {prediction.confidence && (
                <InfoPanel title="Prediction Confidence">
                  <p className="text-2xl font-bold">
                    {prediction.confidence.label}
                  </p>

                  <p className="mt-2 text-pink-400">
                    {percentValue(
                      prediction.confidence.percent
                    )}
                  </p>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-pink-500"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            prediction.confidence.percent
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </InfoPanel>
              )}
            </section>

            {prediction.expected_goals_remaining && (
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Expected Goals{" "}
                  <span className="text-pink-400">
                    Remaining
                  </span>
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label={prediction.team1}
                    value={prediction.expected_goals_remaining.team1.toFixed(
                      2
                    )}
                  />

                  <MetricCard
                    label={prediction.team2}
                    value={prediction.expected_goals_remaining.team2.toFixed(
                      2
                    )}
                  />
                </div>
              </section>
            )}

            {prediction.momentum_percent && (
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Match{" "}
                  <span className="text-pink-400">
                    Momentum
                  </span>
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label={prediction.team1}
                    value={percentValue(
                      prediction.momentum_percent.team1
                    )}
                  />

                  <MetricCard
                    label={prediction.team2}
                    value={percentValue(
                      prediction.momentum_percent.team2
                    )}
                  />
                </div>
              </section>
            )}

            {prediction.advancement && (
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Advancement{" "}
                  <span className="text-pink-400">
                    Probability
                  </span>
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label={prediction.team1}
                    value={percentFraction(
                      prediction.advancement.team1
                    )}
                  />

                  <MetricCard
                    label={prediction.team2}
                    value={percentFraction(
                      prediction.advancement.team2
                    )}
                  />
                </div>
              </section>
            )}

            {prediction.top_scorelines &&
              prediction.top_scorelines.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-2xl font-semibold">
                    Top{" "}
                    <span className="text-pink-400">
                      Scorelines
                    </span>
                  </h2>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/55">
                    {prediction.top_scorelines.map(
                      (row, index) => (
                        <div
                          key={`${row.team1_goals}-${row.team2_goals}-${index}`}
                          className="flex items-center justify-between border-b border-white/10 px-5 py-4 last:border-b-0"
                        >
                          <span className="font-medium">
                            {prediction.team1}{" "}
                            {row.team1_goals}
                            <span className="mx-2 text-zinc-500">
                              –
                            </span>
                            {row.team2_goals}{" "}
                            {prediction.team2}
                          </span>

                          <strong className="text-pink-400">
                            {percentFraction(
                              row.probability
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {prediction.reasoning &&
              prediction.reasoning.length > 0 && (
                <section className="mt-8">
                  <InfoPanel title="Prediction Reasoning">
                    <ul className="space-y-3 text-zinc-300">
                      {prediction.reasoning.map(
                        (reason, index) => (
                          <li
                            key={`${reason}-${index}`}
                          >
                            • {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </InfoPanel>
                </section>
              )}

            {prediction.events &&
              prediction.events.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-2xl font-semibold">
                    Event{" "}
                    <span className="text-pink-400">
                      Timeline
                    </span>
                  </h2>

                  <div className="mt-4 space-y-3">
                    {prediction.events.map(
                      (event, index) => (
                        <div
                          key={`${event.minute}-${event.team}-${index}`}
                          className="rounded-xl border border-white/10 bg-black/55 p-4"
                        >
                          <p className="font-semibold">
                            {event.minute}′ · {event.team}
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {event.type}
                            {event.detail
                              ? ` — ${event.detail}`
                              : ""}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <h2 className="text-2xl font-semibold">
                Match{" "}
                <span className="text-pink-400">
                  State
                </span>
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TeamStateCard
                  name={prediction.team1}
                  stats={scenario.team1_stats}
                />

                <TeamStateCard
                  name={prediction.team2}
                  stats={scenario.team2_stats}
                />
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                    Saved Predictions
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Previous Predictions
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Saved snapshots for {scenario.team1} vs{" "}
                    {scenario.team2}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadHistory()}
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
                    No saved snapshots yet. Press{" "}
                    <strong className="text-white">
                      Save Snapshot
                    </strong>{" "}
                    to save the current prediction.
                  </div>
                )}

              {history.length > 0 && (
                <div className="mt-5 space-y-3">
                  {history.map((snapshot, index) => {
                    const savedPrediction =
                      snapshot.prediction;

                    const savedState =
                      snapshot.state;

                    return (
                      <div
                        key={
                          snapshot.id ??
                          snapshot.uuid ??
                          snapshot.snapshot_id ??
                          `${snapshot.created_at}-${index}`
                        }
                        className="rounded-xl border border-white/10 bg-white/5 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-zinc-400">
                              {formatSavedDate(
                                snapshot.created_at
                              )}
                            </p>

                            <p className="mt-1 text-lg font-bold">
                              {savedState.team1}{" "}
                              {savedState.team1_stats.goals}
                              <span className="mx-2 text-zinc-500">
                                –
                              </span>
                              {savedState.team2_stats.goals}{" "}
                              {savedState.team2}
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                              Minute {savedState.minute}
                              {savedState.extra_minute
                                ? `+${savedState.extra_minute}`
                                : ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              loadSnapshot(snapshot)
                            }
                            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600"
                          >
                            Load Snapshot
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <SmallProbability
                            label={`${savedPrediction.team1} Win`}
                            value={percentFraction(
                              savedPrediction.probabilities
                                .team1
                            )}
                          />

                          <SmallProbability
                            label="Draw"
                            value={percentFraction(
                              savedPrediction.probabilities
                                .draw
                            )}
                          />

                          <SmallProbability
                            label={`${savedPrediction.team2} Win`}
                            value={percentFraction(
                              savedPrediction.probabilities
                                .team2
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/matches"
                className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
              >
                Edit Match Scenario
              </Link>

              <Link
                href="/analytics"
                className="rounded-xl border border-white/20 bg-black/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                View Analytics →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-pink-400/20 bg-pink-500/10 p-5 text-center">
      <p className="text-sm text-zinc-300">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}

function SmallProbability({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-center">
      <p className="text-xs text-zinc-400">
        {label}
      </p>

      <p className="mt-1 font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">
        {title}
      </p>

      <div className="mt-3">{children}</div>
    </div>
  );
}

function TeamStateCard({
  name,
  stats,
}: {
  name: string;
  stats: TeamStats;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-xl font-bold">
        {name}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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

      <strong>{value}</strong>
    </div>
  );
}