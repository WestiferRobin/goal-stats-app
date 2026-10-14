"use client";

import React from "react";
import ViewNavigation from "@/components/view-navigation";

type Team = {
  name: string;
  fifa_rank?: number | null;
  offense?: number | null;
  defense?: number | null;
  form?: number | null;
  star_power?: number | null;
  clutch?: number | null;
};

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

export default function MatchesView() {
  const [teams, setTeams] = React.useState<Team[]>([]);

  const [team1, setTeam1] = React.useState("");
  const [team2, setTeam2] = React.useState("");

  const [minute, setMinute] = React.useState(0);

  const [team1Score, setTeam1Score] = React.useState(0);
  const [team2Score, setTeam2Score] = React.useState(0);

  const [team1Possession, setTeam1Possession] = React.useState(50);
  const [team2Possession, setTeam2Possession] = React.useState(50);

  const [team1TotalShots, setTeam1TotalShots] = React.useState(0);
  const [team2TotalShots, setTeam2TotalShots] = React.useState(0);

  const [team1ShotsOnTarget, setTeam1ShotsOnTarget] = React.useState(0);
  const [team2ShotsOnTarget, setTeam2ShotsOnTarget] = React.useState(0);

  const [team1BigChances, setTeam1BigChances] = React.useState(0);
  const [team2BigChances, setTeam2BigChances] = React.useState(0);

  const [team1DefenderBlocks, setTeam1DefenderBlocks] = React.useState(0);
  const [team2DefenderBlocks, setTeam2DefenderBlocks] = React.useState(0);

  const [team1GoalkeeperSaves, setTeam1GoalkeeperSaves] =
    React.useState(0);
  const [team2GoalkeeperSaves, setTeam2GoalkeeperSaves] =
    React.useState(0);

  const [team1Corners, setTeam1Corners] = React.useState(0);
  const [team2Corners, setTeam2Corners] = React.useState(0);

  const [team1YellowCards, setTeam1YellowCards] = React.useState(0);
  const [team2YellowCards, setTeam2YellowCards] = React.useState(0);

  const [team1RedCards, setTeam1RedCards] = React.useState(0);
  const [team2RedCards, setTeam2RedCards] = React.useState(0);

  const [prediction, setPrediction] =
    React.useState<PredictionResponse | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function loadTeams() {
      try {
        const response = await fetch("/api/football/teams");

        if (!response.ok) {
          throw new Error("Could not load teams.");
        }

        const data: Team[] = await response.json();
        setTeams(data);
      } catch (err) {
        console.error("TEAM LOAD ERROR:", err);
        setError("Unable to load team data.");
      }
    }

    loadTeams();
  }, []);

  function resetForm() {
    setTeam1("");
    setTeam2("");

    setMinute(0);

    setTeam1Score(0);
    setTeam2Score(0);

    setTeam1Possession(50);
    setTeam2Possession(50);

    setTeam1TotalShots(0);
    setTeam2TotalShots(0);

    setTeam1ShotsOnTarget(0);
    setTeam2ShotsOnTarget(0);

    setTeam1BigChances(0);
    setTeam2BigChances(0);

    setTeam1DefenderBlocks(0);
    setTeam2DefenderBlocks(0);

    setTeam1GoalkeeperSaves(0);
    setTeam2GoalkeeperSaves(0);

    setTeam1Corners(0);
    setTeam2Corners(0);

    setTeam1YellowCards(0);
    setTeam2YellowCards(0);

    setTeam1RedCards(0);
    setTeam2RedCards(0);

    setPrediction(null);
    setError("");

    sessionStorage.removeItem("goalstats-current-prediction");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!team1 || !team2) {
      setError("Please select two teams.");
      return;
    }

    if (team1 === team2) {
      setError("Team 1 and Team 2 must be different.");
      return;
    }

    if (team1Possession + team2Possession !== 100) {
      setError("Team possession must add up to 100%.");
      return;
    }

    if (
      team1ShotsOnTarget > team1TotalShots ||
      team2ShotsOnTarget > team2TotalShots
    ) {
      setError("Shots on target cannot be greater than total shots.");
      return;
    }

    setError("");
    setPrediction(null);
    setLoading(true);

    const scenario = {
      team1,
      team2,
      minute,
      extra_minute: 0,
      status: "",

      team1_stats: {
        goals: team1Score,
        big_chances: team1BigChances,
        defender_blocks: team1DefenderBlocks,
        goalkeeper_saves: team1GoalkeeperSaves,
        corners: team1Corners,
        yellow_cards: team1YellowCards,
        red_cards: team1RedCards,
        shots: team1TotalShots,
        shots_on_target: team1ShotsOnTarget,
        possession: team1Possession,
      },

      team2_stats: {
        goals: team2Score,
        big_chances: team2BigChances,
        defender_blocks: team2DefenderBlocks,
        goalkeeper_saves: team2GoalkeeperSaves,
        corners: team2Corners,
        yellow_cards: team2YellowCards,
        red_cards: team2RedCards,
        shots: team2TotalShots,
        shots_on_target: team2ShotsOnTarget,
        possession: team2Possession,
      },
    };

    try {
      const response = await fetch("/api/football/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scenario),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to calculate prediction."
        );
      }

      const predictionData = data as PredictionResponse;

      setPrediction(predictionData);

      sessionStorage.setItem(
        "goalstats-current-prediction",
        JSON.stringify({
          prediction: predictionData,
          scenario,
        })
      );

      window.location.href = "/predictions";
    } catch (err) {
      console.error("PREDICTION ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to calculate prediction."
      );
    } finally {
      setLoading(false);
    }
  }

  function percent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.62)), url('/images/matches-bg.png')",
      }}
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <ViewNavigation currentPath="/matches" />

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#071522]/80 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div
            className="pointer-events-none absolute right-[-70px] top-[-45px] h-[380px] w-[380px] bg-contain bg-center bg-no-repeat opacity-10"
            style={{
              backgroundImage: "url('/images/matches-watermark.png')",
            }}
          />

          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Match Analysis
            </p>

            <h1 className="mt-2 text-5xl font-bold leading-tight">
              Build Your Match
              <span className="block text-pink-500">Scenario</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
              Select two teams, enter the current match state, and prepare the
              scenario for prediction analysis.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">
                  Select <span className="text-pink-400">Teams</span>
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Choose two different national teams to build your matchup.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-zinc-300">
                      Team 1
                    </label>

                    <select
                      value={team1}
                      onChange={(event) => setTeam1(event.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
                    >
                      <option value="">Select a team</option>

                      {teams.map((team) => (
                        <option key={team.name} value={team.name}>
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
                      value={team2}
                      onChange={(event) => setTeam2(event.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
                    >
                      <option value="">Select a team</option>

                      {teams.map((team) => (
                        <option key={team.name} value={team.name}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(team1 || team2) && (
                  <div className="mt-5 rounded-xl border border-pink-400/20 bg-pink-500/10 p-4 text-center">
                    <p className="text-sm uppercase tracking-widest text-pink-300">
                      Current Matchup
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {team1 || "Team 1"}
                      <span className="mx-3 text-zinc-500">vs</span>
                      {team2 || "Team 2"}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">
                  Match <span className="text-pink-400">Scenario</span>
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Enter the current minute and score of the match.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <StatInput
                    label="Minute"
                    value={minute}
                    setValue={setMinute}
                    max={120}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Score`}
                    value={team1Score}
                    setValue={setTeam1Score}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Score`}
                    value={team2Score}
                    setValue={setTeam2Score}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">
                  Match <span className="text-pink-400">Statistics</span>
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Add the current match statistics used by the prediction model.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <StatInput
                    label={`${team1 || "Team 1"} Possession %`}
                    value={team1Possession}
                    setValue={setTeam1Possession}
                    max={100}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Possession %`}
                    value={team2Possession}
                    setValue={setTeam2Possession}
                    max={100}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Total Shots`}
                    value={team1TotalShots}
                    setValue={setTeam1TotalShots}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Total Shots`}
                    value={team2TotalShots}
                    setValue={setTeam2TotalShots}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Shots on Target`}
                    value={team1ShotsOnTarget}
                    setValue={setTeam1ShotsOnTarget}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Shots on Target`}
                    value={team2ShotsOnTarget}
                    setValue={setTeam2ShotsOnTarget}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Big Chances`}
                    value={team1BigChances}
                    setValue={setTeam1BigChances}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Big Chances`}
                    value={team2BigChances}
                    setValue={setTeam2BigChances}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Defender Blocks`}
                    value={team1DefenderBlocks}
                    setValue={setTeam1DefenderBlocks}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Defender Blocks`}
                    value={team2DefenderBlocks}
                    setValue={setTeam2DefenderBlocks}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Goalkeeper Saves`}
                    value={team1GoalkeeperSaves}
                    setValue={setTeam1GoalkeeperSaves}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Goalkeeper Saves`}
                    value={team2GoalkeeperSaves}
                    setValue={setTeam2GoalkeeperSaves}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Corners`}
                    value={team1Corners}
                    setValue={setTeam1Corners}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Corners`}
                    value={team2Corners}
                    setValue={setTeam2Corners}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Yellow Cards`}
                    value={team1YellowCards}
                    setValue={setTeam1YellowCards}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Yellow Cards`}
                    value={team2YellowCards}
                    setValue={setTeam2YellowCards}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Red Cards`}
                    value={team1RedCards}
                    setValue={setTeam1RedCards}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Red Cards`}
                    value={team2RedCards}
                    setValue={setTeam2RedCards}
                  />
                </div>
              </section>

              {error && (
                <p className="rounded-xl border border-red-400/30 bg-red-500/20 p-4 font-medium text-red-200">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating Prediction..." : "Create Scenario →"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl border border-white/20 bg-black/50 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </form>

            {prediction && (
              <section className="mt-8 rounded-2xl border border-pink-400/30 bg-black/70 p-6 shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                  Prediction Result
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {prediction.team1}
                  <span className="mx-3 text-zinc-500">vs</span>
                  {prediction.team2}
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <ProbabilityCard
                    label={prediction.team1}
                    value={percent(prediction.probabilities.team1)}
                  />

                  <ProbabilityCard
                    label="Draw"
                    value={percent(prediction.probabilities.draw)}
                  />

                  <ProbabilityCard
                    label={prediction.team2}
                    value={percent(prediction.probabilities.team2)}
                  />
                </div>

                {prediction.most_likely_score && (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm uppercase tracking-wider text-zinc-400">
                      Most Likely Score
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {prediction.team1} {prediction.most_likely_score[0]}
                      <span className="mx-3 text-zinc-500">–</span>
                      {prediction.most_likely_score[1]} {prediction.team2}
                    </p>
                  </div>
                )}

                {prediction.expected_goals_remaining && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-zinc-400">
                        {prediction.team1} Expected Goals Remaining
                      </p>

                      <p className="mt-1 text-2xl font-bold text-pink-400">
                        {prediction.expected_goals_remaining.team1.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-zinc-400">
                        {prediction.team2} Expected Goals Remaining
                      </p>

                      <p className="mt-1 text-2xl font-bold text-pink-400">
                        {prediction.expected_goals_remaining.team2.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {prediction.confidence && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-400">Confidence</p>

                    <p className="mt-1 text-xl font-bold">
                      {prediction.confidence.label} —{" "}
                      {prediction.confidence.percent.toFixed(1)}%
                    </p>
                  </div>
                )}

                {prediction.reasoning &&
                  prediction.reasoning.length > 0 && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="font-semibold text-pink-400">
                        Prediction Reasoning
                      </p>

                      <ul className="mt-3 space-y-2 text-zinc-300">
                        {prediction.reasoning.map((reason, index) => (
                          <li key={`${reason}-${index}`}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatInput({
  label,
  value,
  setValue,
  max,
}: {
  label: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium text-zinc-200">
        {label}
      </label>

      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
      />
    </div>
  );
}

function ProbabilityCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-pink-400/20 bg-pink-500/10 p-5 text-center">
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="mt-2 text-3xl font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}