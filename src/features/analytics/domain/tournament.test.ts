import { describe, expect, it } from "vitest";
import { buildTournamentRequest, decodeTournament, experimentalValues, moveParticipant, participant, prefillParticipant } from "./tournament";

import { catalog, validDraft, responseFor } from "./tournament.fixtures";

describe("tournament inputs", () => {
  it.each([4, 8, 16, 32])("accepts exactly %i unique ordered participants", size => {
    const draft = validDraft(size); expect(buildTournamentRequest(draft).teams).toHaveLength(size);
    draft.participants = moveParticipant(draft.participants, 0, 1);
    expect(buildTournamentRequest(draft).teams[0].team_id).toBe(2);
  });
  it("rejects wrong size, participant count, unknown IDs and duplicate IDs", () => {
    for (const draft of [{ ...validDraft(), size: 3 }, { ...validDraft(), size: 8 }, { ...validDraft(), participants: Array(4).fill(validDraft().participants[0]) }]) expect(() => buildTournamentRequest(draft)).toThrow();
    const draft = validDraft(); draft.participants[0] = { ...draft.participants[0], team: { ...catalog[0], team_id: 0 } };
    expect(() => buildTournamentRequest(draft)).toThrow(/IDs/);
  });
  it.each(["", " ", "NaN", "Infinity", "-1", "101", "not a number"])("rejects missing or invalid rating %j", rating => {
    const draft = validDraft(); draft.participants[0].ratings.offense = rating;
    expect(() => buildTournamentRequest(draft)).toThrow(/Offense/);
  });
  it("accepts zero and decimal ratings without inventing strengths", () => {
    const draft = validDraft(); draft.participants[0].ratings.form = "3.5";
    expect(buildTournamentRequest(draft).teams[0]).toEqual({ team_id: 1, fifa_rank: 1, offense: 0, defense: 100, form: 3.5, star_power: 0, clutch: 0 });
    expect(participant(catalog[0]).ratings.star_power).toBe("");
  });
  it.each(["", "999", "2001", "1000.5", "Infinity"])("rejects count %j", simulations => expect(() => buildTournamentRequest({ ...validDraft(), simulations })).toThrow(/Simulation count/));
  it.each(["1000", "2000"])("accepts count %s", simulations => expect(buildTournamentRequest({ ...validDraft(), simulations }).simulations).toBe(Number(simulations)));
  it.each(["-1", "4294967296", "0.5", "Infinity", "NaN"])("rejects seed %j", seed => expect(() => buildTournamentRequest({ ...validDraft(), seed })).toThrow(/seed/));
  it.each(["0", "4294967295"])("accepts seed %s", seed => expect(buildTournamentRequest({ ...validDraft(), seed }).seed).toBe(Number(seed)));
  it("omits an absent seed for backend generation", () => expect(buildTournamentRequest(validDraft())).not.toHaveProperty("seed"));
  it("prefills only documented experimental fields and protects manually entered zero", () => {
    const p = participant(catalog[0]);
    expect(prefillParticipant(p).ratings).toEqual({ offense: "0", defense: "65", form: "70", star_power: "", clutch: "" });
    p.ratings.offense = "0"; p.ratings.star_power = "22";
    expect(() => prefillParticipant(p)).toThrow(/Confirm/);
    expect(prefillParticipant(p, true).ratings.star_power).toBe("22");
    expect(experimentalValues({ ...catalog[0], ratings_metadata: null })).toEqual({});
  });
  it("keeps Equatorial Guinea selectable with entirely manual strengths", () => {
    expect(experimentalValues(catalog[3])).toEqual({});
    expect(prefillParticipant(participant(catalog[3])).ratings.offense).toBe("");
    expect(buildTournamentRequest(validDraft()).teams[3].offense).toBe(0);
  });
});
describe("tournament response decoding", () => {
  it("accepts generated seed and null final/rank", () => expect(decodeTournament(responseFor(), buildTournamentRequest(validDraft())).most_common_final).toBeNull());
  it("accepts a final linked by unique participant IDs", () => {
    const data = { ...responseFor(), most_common_final: { team1_id: 1, team2_id: 3, team1: "Team 1", team2: "Team 3", probability: 30 } };
    expect(decodeTournament(data, buildTournamentRequest(validDraft())).most_common_final).toEqual(data.most_common_final);
  });
  it.each([
    { seed: -1 }, { seed: "123" }, { simulations: 2000 }, { kind: "historical" }, { probability_unit: "fraction" }, { predicted_champion_id: 999 },
    { predicted_champion: "Other" }, { most_common_final: undefined },
    { most_common_final: { team1_id: 1, team2_id: 1, team1: "Team 1", team2: "Team 1", probability: 50 } },
    { results: [] },
  ])("rejects invalid response envelope %j", changes => expect(() => decodeTournament({ ...responseFor(), ...changes }, buildTournamentRequest(validDraft()))).toThrow());
  it.each([{ team_id: 999 }, { team_id: 2 }, { champion_probability: NaN }, { champion_probability: -1 }, { champion_probability: 101 }, { final_probability: "50" }, { semifinal_probability: 20 }, { fifa_rank: 0 }])("rejects malformed or duplicate result %j", changes => {
    const data = responseFor(); data.results[0] = { ...data.results[0], ...changes } as typeof data.results[number];
    expect(() => decodeTournament(data, buildTournamentRequest(validDraft()))).toThrow();
  });
  it("requires a supplied seed to be echoed exactly", () => expect(() => decodeTournament(responseFor(), buildTournamentRequest({ ...validDraft(), seed: "0" }))).toThrow());
});
