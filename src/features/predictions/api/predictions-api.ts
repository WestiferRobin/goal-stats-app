export type PredictionResponse = {
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

export type TeamStats = {
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

export type ScenarioState = {
  team1: string;
  team2: string;
  minute: number;
  extra_minute?: number;
  status?: string;

  team1_stats: TeamStats;
  team2_stats: TeamStats;
};

export type StoredPrediction = {
  prediction: PredictionResponse;
  scenario: ScenarioState;
};

export type SnapshotRecord = {
  id?: string;
  uuid?: string;
  snapshot_id?: string;
  created_at?: string;
  state: ScenarioState;
  prediction: PredictionResponse;
};

export async function savePredictionSnapshot(
  scenario: ScenarioState
): Promise<unknown> {
  const response = await fetch("/api/football/snapshots", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(scenario),
  });

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  return response.json();
}

export async function getPredictionHistory(
  team1: string,
  team2: string
): Promise<SnapshotRecord[]> {
  const params = new URLSearchParams({
    team1,
    team2,
    limit: "50",
  });

  const response = await fetch(
    `/api/football/snapshots?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("contract");
  }

  return data as SnapshotRecord[];
}