import type { Team } from "@/lib/football";
import { buildTournamentRequest, participant, type TournamentDraft } from "./tournament";

export const catalog: Team[] = Array.from({ length: 32 }, (_, i) => ({
  team_id: i + 1, name: i === 3 ? "Equatorial Guinea" : `Team ${i + 1}`, category: "women_senior_national",
  offense: i === 3 ? null : 0, defense: i === 3 ? null : 65, form: i === 3 ? null : 70,
  star_power: null, clutch: null, fifa_rank: i === 3 ? null : i + 1, ranking_date: "2026-10-20", prediction_ready: false,
  ratings_metadata: { run_id: "a".repeat(64), model: "experimental-v1", cutoff: "2026-06-10", source: "Pinned international results", source_sha256: "b".repeat(64), status: "experimental", evidence: { reason: i === 3 ? "insufficient_recent_results" : null } },
}));
export function validDraft(size = 4): TournamentDraft {
  return { size, simulations: "1000", seed: "", participants: catalog.slice(0, size).map(team => ({ ...participant(team), ratings: { offense: "0", defense: "100", form: "50", star_power: "0", clutch: "0" } })) };
}
export function responseFor(draft = validDraft()) {
  const req = buildTournamentRequest(draft);
  return { kind: "hypothetical_knockout", probability_unit: "percent", simulations: req.simulations, seed: req.seed ?? 123,
    predicted_champion_id: req.teams[0].team_id, predicted_champion: draft.participants[0].team.name,
    most_common_final: null,
    results: draft.participants.map(p => ({ team_id: p.team.team_id, team: p.team.name, fifa_rank: p.team.fifa_rank, semifinal_probability: 400 / req.teams.length, final_probability: 200 / req.teams.length, champion_probability: 100 / req.teams.length })),
  };
}

