import { isCatalogId, parseTeamSummary, parseTeamSummaryFilters, type TeamSummary, type TeamSummaryFilters } from "@/lib/football";

export async function getTeamSummary(teamId: number, filters: Partial<TeamSummaryFilters> = {}, signal?: AbortSignal): Promise<TeamSummary> {
  if (!isCatalogId(teamId)) throw new Error("Invalid team ID.");
  const scope = parseTeamSummaryFilters({ competition_id: null, date_from: null, date_to: null, ...filters });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) if (value !== null) params.set(key, String(value));
  const query = params.size ? `?${params}` : "";
  const response = await fetch(`/api/football/catalog/teams/${teamId}/summary${query}`, { signal });
  const data: unknown = await response.json();
  if (!response.ok) {
    const detail = data && typeof data === "object" && "detail" in data && typeof data.detail === "string" ? data.detail : "Unable to load historical summary.";
    throw new Error(detail);
  }
  const summary = parseTeamSummary(data);
  if (summary.team_id !== teamId || Object.entries(scope).some(([key, value]) => summary.filters[key as keyof TeamSummaryFilters] !== value)) {
    throw new Error("Historical summary does not match the selected team or filters.");
  }
  return summary;
}
