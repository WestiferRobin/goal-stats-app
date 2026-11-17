export type Team = {
  name: string;
  fifa_rank?: number | null;
  fifa_points?: number | null;
  ranking_date?: string | null;
  offense?: number | null;
  defense?: number | null;
  form?: number | null;
  star_power?: number | null;
  clutch?: number | null;
};

export type HistoryMatch = {
  team1: string;
  team2: string;
  final_team1_goals: number;
  final_team2_goals: number;
};

export type InsightsResponse = {
  note?: string;
  head_to_head?: HistoryMatch[];
  team1_history?: HistoryMatch[];
  team2_history?: HistoryMatch[];
};

export async function getTeams(): Promise<Team[]> {
  const response = await fetch("/api/football/teams");

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("contract");
  }

  return data as Team[];
}

export async function getTeamInsights(
  team1: string,
  team2: string
): Promise<InsightsResponse> {
  const params = new URLSearchParams({
    team1,
    team2,
  });

  const response = await fetch(
    `/api/football/insights?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  const data: unknown = await response.json();

  if (!data || typeof data !== "object") {
    throw new Error("contract");
  }

  return data as InsightsResponse;
}