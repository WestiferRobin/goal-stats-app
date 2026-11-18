import { isCatalogId, type Team } from "@/lib/football";

export const ratingFields = ["offense", "defense", "form", "star_power", "clutch"] as const;
export type RatingField = typeof ratingFields[number];
export const ratingLabels: Record<RatingField, string> = { offense: "Offense", defense: "Defense", form: "Form", star_power: "Star Power", clutch: "Clutch" };
export type RatingDraft = Record<RatingField, string>;
export type Participant = { team: Team; ratings: RatingDraft; prefilled?: boolean };
export type TournamentDraft = { size: number; participants: Participant[]; simulations: string; seed: string };
export type SimulationTeam = { team_id: number; fifa_rank: number | null } & Record<RatingField, number>;
export type TournamentRequest = { teams: SimulationTeam[]; simulations: number; seed?: number };
export type TournamentRow = {
  team_id: number; team: string; fifa_rank: number | null;
  semifinal_probability: number; final_probability: number; champion_probability: number;
};
export type TournamentResult = {
  model_version?: string | null;
  kind: "hypothetical_knockout"; probability_unit: "percent"; simulations: number; seed: number;
  predicted_champion_id: number; predicted_champion: string; results: TournamentRow[];
  most_common_final: { team1_id: number; team2_id: number; team1: string; team2: string; probability: number } | null;
};
export function participant(team: Team): Participant {
  return { team, ratings: { offense: "", defense: "", form: "", star_power: "", clutch: "" } };
}
function numberInput(value: string, label: string, min: number, max: number, integer = false): number {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`${label} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`);
  }
  return n;
}
export function buildTournamentRequest(draft: TournamentDraft): TournamentRequest {
  if (![4, 8, 16, 32].includes(draft.size)) throw new Error("Choose a 4, 8, 16 or 32 team tournament.");
  if (draft.participants.length !== draft.size) throw new Error(`Select exactly ${draft.size} teams; currently ${draft.participants.length} selected.`);
  const ids = draft.participants.map(p => p.team.team_id);
  if (ids.some(id => !isCatalogId(id)) || new Set(ids).size !== ids.length) throw new Error("Select unique catalog team IDs.");
  const teams = draft.participants.map(({ team, ratings }) => {
    if (team.fifa_rank !== null && !isCatalogId(team.fifa_rank)) throw new Error("Invalid FIFA rank.");
    return {
      team_id: team.team_id, fifa_rank: team.fifa_rank,
      ...Object.fromEntries(ratingFields.map(field => [field, numberInput(ratings[field], `${team.name}: ${ratingLabels[field]}`, 0, 100)])) as Record<RatingField, number>,
    };
  });
  return { teams, simulations: numberInput(draft.simulations, "Simulation count", 1000, 2000, true),
    ...(draft.seed.trim() ? { seed: numberInput(draft.seed, "Random seed", 0, 4294967295, true) } : {}) };
}
export function experimentalValues(team: Team): Partial<RatingDraft> {
  if (!team.ratings_metadata) return {};
  return Object.fromEntries((["offense", "defense", "form"] as const)
    .filter(field => team[field] !== null && Number.isFinite(team[field]) && team[field]! >= 0 && team[field]! <= 100)
    .map(field => [field, String(team[field])]));
}
export function prefillParticipant(p: Participant, overwrite = false): Participant {
  const values = experimentalValues(p.team);
  if (!overwrite && Object.keys(values).some(field => p.ratings[field as RatingField].trim() !== "")) {
    throw new Error("Confirm replacement of existing experimental rating fields.");
  }
  return { ...p, ratings: { ...p.ratings, ...values }, prefilled: Object.keys(values).length > 0 };
}
export function moveParticipant(participants: Participant[], index: number, direction: -1 | 1): Participant[] {
  const next = [...participants], target = index + direction;
  if (index >= 0 && index < next.length && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
  return next;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid tournament response.");
  return value as Record<string, unknown>;
}
const percent = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
export function decodeTournament(value: unknown, request: TournamentRequest): TournamentResult {
  const data = object(value), fail = () => { throw new Error("Invalid tournament response: results do not match the requested simulation."); };
  if (data.kind !== "hypothetical_knockout" || data.probability_unit !== "percent" || data.simulations !== request.simulations ||
    typeof data.seed !== "number" || !Number.isInteger(data.seed) || data.seed < 0 || data.seed > 4294967295 ||
    (request.seed !== undefined && data.seed !== request.seed) || !Array.isArray(data.results) || data.results.length !== request.teams.length) return fail();
  if (data.model_version !== undefined && data.model_version !== null &&
      (typeof data.model_version !== "string" || !/^[a-z0-9][a-z0-9.-]{0,79}$/.test(data.model_version))) return fail();
  const ids = new Set(request.teams.map(t => t.team_id)), seen = new Set<number>();
  const names = new Map<number, string>();
  for (const value of data.results) {
    const row = object(value);
    if (!isCatalogId(row.team_id) || !ids.has(row.team_id) || seen.has(row.team_id) || !text(row.team) ||
      (row.fifa_rank !== null && !isCatalogId(row.fifa_rank)) ||
      !percent(row.semifinal_probability) || !percent(row.final_probability) || !percent(row.champion_probability) ||
      row.champion_probability > row.final_probability || row.final_probability > row.semifinal_probability) return fail();
    seen.add(row.team_id); names.set(row.team_id, row.team);
  }
  if (!isCatalogId(data.predicted_champion_id) || !ids.has(data.predicted_champion_id) || names.get(data.predicted_champion_id) !== data.predicted_champion) return fail();
  if (data.most_common_final !== null) {
    const final = object(data.most_common_final);
    if (!isCatalogId(final.team1_id) || !isCatalogId(final.team2_id) || final.team1_id === final.team2_id ||
      !ids.has(final.team1_id) || !ids.has(final.team2_id) || names.get(final.team1_id) !== final.team1 ||
      names.get(final.team2_id) !== final.team2 || !percent(final.probability)) return fail();
  }
  return data as unknown as TournamentResult;
}
