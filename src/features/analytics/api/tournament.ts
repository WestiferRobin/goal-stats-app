import { parseTeams } from "@/lib/football";
import { decodeTournament, type TournamentRequest } from "../domain/tournament";

async function json(url: string, options: RequestInit): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, options); }
  catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Football service is unavailable. Please try again.");
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error(response.ok ? "Invalid football service response." : "Football service could not complete the request. Please try again."); }
  if (!response.ok) {
    const detail = data && typeof data === "object" && "detail" in data && typeof data.detail === "string" ? data.detail : "Football service could not complete the request. Please try again.";
    throw new Error(detail);
  }
  return data;
}
export async function loadTournamentTeams(signal: AbortSignal) {
  const teams = parseTeams(await json("/api/football/catalog/teams", { signal }));
  if (new Set(teams.map(team => team.team_id)).size !== teams.length) throw new Error("Invalid catalog: duplicate team IDs.");
  return teams;
}
export async function simulateTournament(request: TournamentRequest, signal: AbortSignal) {
  const data = await json("/api/football/competitions/simulate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal,
  });
  return decodeTournament(data, request);
}
