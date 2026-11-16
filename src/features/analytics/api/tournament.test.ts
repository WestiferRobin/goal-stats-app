import { afterEach, expect, it, vi } from "vitest";
import { buildTournamentRequest } from "../domain/tournament";
import { catalog, responseFor, validDraft } from "../domain/tournament.fixtures";
import { loadTournamentTeams, simulateTournament } from "./tournament";
afterEach(() => vi.unstubAllGlobals());
it("posts the exact ordered contract through the existing proxy with cancellation", async () => {
  const draft = validDraft(); draft.seed = "0"; draft.participants.reverse();
  const request = buildTournamentRequest(draft), signal = new AbortController().signal;
  const fetch = vi.fn().mockResolvedValue(Response.json(responseFor(draft))); vi.stubGlobal("fetch", fetch);
  expect((await simulateTournament(request, signal)).seed).toBe(0);
  expect(fetch).toHaveBeenCalledWith("/api/football/competitions/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal });
  expect(Object.keys(request.teams[0]).sort()).toEqual(["team_id", "fifa_rank", "offense", "defense", "form", "star_power", "clutch"].sort());
});
it("validates catalog records and rejects duplicate IDs", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(catalog)); vi.stubGlobal("fetch", fetch);
  expect(await loadTournamentTeams(new AbortController().signal)).toHaveLength(32);
  fetch.mockResolvedValue(Response.json([catalog[0], catalog[0]]));
  await expect(loadTournamentTeams(new AbortController().signal)).rejects.toThrow(/duplicate/);
});
it.each([401, 429, 503, 504])("surfaces proxy errors for %i without producing results", async status => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "Safe proxy failure" }, { status })));
  await expect(simulateTournament(buildTournamentRequest(validDraft()), new AbortController().signal)).rejects.toThrow("Safe proxy failure");
});
it("rejects malformed JSON, malformed results and network failures", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("not JSON")); vi.stubGlobal("fetch", fetch);
  const run = () => simulateTournament(buildTournamentRequest(validDraft()), new AbortController().signal);
  await expect(run()).rejects.toThrow(/Invalid/);
  fetch.mockResolvedValue(Response.json({})); await expect(run()).rejects.toThrow(/Invalid/);
  fetch.mockRejectedValue(new TypeError("network details")); await expect(run()).rejects.toThrow("Football service is unavailable. Please try again.");
});
