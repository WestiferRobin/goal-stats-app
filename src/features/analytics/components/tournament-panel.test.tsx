import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TournamentPanel from "./tournament-panel";
import { catalog, responseFor, validDraft } from "../domain/tournament.fixtures";
import { ratingFields, ratingLabels } from "../domain/tournament";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function backend(simulate: () => Promise<Response> = async () => Response.json(responseFor())) {
  const fetch = vi.fn((url: string) => url.includes("catalog") ? Promise.resolve(Response.json(catalog.slice(0, 8))) : simulate());
  vi.stubGlobal("fetch", fetch); return fetch;
}
async function selectFour() {
  await screen.findByRole("button", { name: "Select Team 1" });
  for (const team of catalog.slice(0, 4)) fireEvent.click(screen.getByRole("button", { name: `Select ${team.name}` }));
}
function fillFour() {
  for (const team of catalog.slice(0, 4)) for (const field of ratingFields) fireEvent.change(screen.getByLabelText(`${team.name} ${ratingLabels[field]}`), { target: { value: "0" } });
}
async function ready() { render(<TournamentPanel/>); await selectFour(); fillFour(); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

it("preserves participants on size changes and supports clear/top-ranked explicit selection", async () => {
  const fetch = backend(); render(<TournamentPanel/>); await selectFour();
  fireEvent.change(screen.getByLabelText("Tournament size"), { target: { value: "8" } });
  expect(screen.getByText(/Selected 4 of 8 teams/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
  expect(screen.getByRole("alert").textContent).toContain("Select exactly 8");
  expect(fetch.mock.calls.filter(([url]) => url.includes("simulate"))).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Select Top Ranked" }));
  expect(screen.getByText(/Selected 7 of 8 teams/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Tournament size"), { target: { value: "4" } });
  expect(screen.getByText(/Selected 7 of 4 teams/)).toBeTruthy();
  expect(screen.getByText(/Select exactly 4 teams; currently 7/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.getByText(/Selected 0 of 4 teams/)).toBeTruthy();
});
it("prefills only on request, confirms overwrite and preserves manual Star Power/Clutch", async () => {
  backend(); render(<TournamentPanel/>); await selectFour();
  const offense = screen.getByLabelText("Team 1 Offense") as HTMLInputElement;
  expect(offense.value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Prefill experimental ratings for Team 1" }));
  expect(offense.value).toBe("0"); expect((screen.getByLabelText("Team 1 Star Power") as HTMLInputElement).value).toBe("");
  expect(screen.getAllByText(/Cutoff: 2026-06-10/).length).toBe(4);
  fireEvent.change(offense, { target: { value: "99" } });
  fireEvent.change(screen.getByLabelText("Team 1 Star Power"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Prefill experimental ratings for Team 1" }));
  expect(offense.value).toBe("99");
  fireEvent.click(screen.getByRole("button", { name: "Cancel replacement" })); expect(offense.value).toBe("99");
  fireEvent.click(screen.getByRole("button", { name: "Prefill experimental ratings for Team 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm replacement" }));
  expect(offense.value).toBe("0"); expect((screen.getByLabelText("Team 1 Star Power") as HTMLInputElement).value).toBe("12");
  expect((screen.getByRole("button", { name: "Prefill experimental ratings for Equatorial Guinea" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText("Equatorial Guinea Offense") as HTMLInputElement).value).toBe("");
  fireEvent.change(screen.getByLabelText("Equatorial Guinea Offense"), { target: { value: "55" } });
  expect((screen.getByLabelText("Equatorial Guinea Offense") as HTMLInputElement).value).toBe("55");
});
it("submits ordered explicit strengths including zero and renders returned seed/null fields", async () => {
  const draft = validDraft(); draft.participants = [draft.participants[1], draft.participants[0], ...draft.participants.slice(2)];
  const fetch = backend(async () => Response.json(responseFor(draft))); await ready();
  fireEvent.click(screen.getByRole("button", { name: "Move Team 1 down" }));
  expect(screen.getByText("Slot 1: Team 2 — paired with Slot 2")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
  await screen.findByText(/Random seed used: 123/);
  expect(screen.getByText("Most common final: Unavailable")).toBeTruthy();
  expect(screen.getByText(/Executed bracket: Slot 1: Team 2 · Slot 2: Team 1/)).toBeTruthy();
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const request = JSON.parse(calls.find(([url]) => String(url).includes("simulate"))![1]!.body as string);
  expect(request.teams.map((t: {team_id:number}) => t.team_id)).toEqual([2, 1, 3, 4]);
  expect(request.teams[3]).toEqual({ team_id: 4, fifa_rank: null, offense: 0, defense: 0, form: 0, star_power: 0, clutch: 0 });
  expect(request).not.toHaveProperty("seed"); expect(fetch).toHaveBeenCalledTimes(2);
});
it("disables duplicate execution while loading and recovers from an API failure", async () => {
  const pending = deferred<Response>(); let attempt = 0;
  backend(() => ++attempt === 1 ? pending.promise : Promise.resolve(Response.json(responseFor()))); await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
  expect((screen.getByRole("button", { name: "Running simulation..." }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Running hypothetical");
  await act(async () => pending.resolve(Response.json({ detail: "Try again later" }, { status: 503 })));
  expect(screen.getByRole("alert").textContent).toContain("Try again later");
  fireEvent.click(screen.getByRole("button", { name: "Retry simulation" })); await screen.findByText(/Random seed used: 123/);
});
it.each(["ratings", "participants", "order", "count", "seed", "size"])("invalidates results after changing %s", async kind => {
  backend(); await ready(); fireEvent.click(screen.getByRole("button", { name: "Run simulation" })); await screen.findByText(/Random seed used: 123/);
  if (kind === "ratings") fireEvent.change(screen.getByLabelText("Team 1 Form"), { target: { value: "1" } });
  if (kind === "participants") fireEvent.click(screen.getByRole("button", { name: "Remove Team 1" }));
  if (kind === "order") fireEvent.click(screen.getByRole("button", { name: "Move Team 1 down" }));
  if (kind === "count") fireEvent.change(screen.getByLabelText("Simulation count"), { target: { value: "2000" } });
  if (kind === "seed") fireEvent.change(screen.getByLabelText("Random seed (optional)"), { target: { value: "0" } });
  if (kind === "size") fireEvent.change(screen.getByLabelText("Tournament size"), { target: { value: "8" } });
  expect(screen.queryByText(/Random seed used:/)).toBeNull(); expect(screen.getByText("No simulation results for this configuration.")).toBeTruthy();
});
it("ignores an older response even when fetch ignores abort and a newer run completes", async () => {
  const old = deferred<Response>(); let attempt = 0;
  backend(() => ++attempt === 1 ? old.promise : Promise.resolve(Response.json(responseFor({ ...validDraft(), seed: "0" })))); await ready();
  fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
  const signal = vi.mocked(globalThis.fetch).mock.calls.find(([url]) => String(url).includes("simulate"))![1]!.signal!;
  fireEvent.change(screen.getByLabelText("Random seed (optional)"), { target: { value: "0" } }); expect(signal.aborted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Run simulation" })); await screen.findByText(/Random seed used: 0/);
  await act(async () => old.resolve(Response.json(responseFor())));
  expect(screen.queryByText(/Random seed used: 123/)).toBeNull(); expect(screen.getByText(/Random seed used: 0/)).toBeTruthy();
});
it("aborts simulation on unmount and ignores its late completion", async () => {
  const pending = deferred<Response>(); backend(() => pending.promise); const view = render(<TournamentPanel/>); await selectFour(); fillFour();
  fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
  const signal = vi.mocked(globalThis.fetch).mock.calls.find(([url]) => String(url).includes("simulate"))![1]!.signal!;
  view.unmount(); expect(signal.aborted).toBe(true); await act(async () => pending.resolve(Response.json(responseFor())));
  expect(screen.queryByText(/Random seed used:/)).toBeNull();
});
it("retries catalog errors and keeps missing enrichment manually editable", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ detail: "Catalog unavailable" }, { status: 503 })).mockResolvedValue(Response.json(catalog.slice(0, 4).map(team => ({ ...team, ratings_metadata: null, offense: null, defense: null, form: null }))));
  vi.stubGlobal("fetch", fetch); render(<TournamentPanel/>); await screen.findByText("Catalog unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry loading teams" })); await selectFour(); fillFour();
  expect((screen.getByLabelText("Team 1 Offense") as HTMLInputElement).value).toBe("0");
  await waitFor(() => expect(screen.queryByText("Catalog unavailable")).toBeNull());
});
