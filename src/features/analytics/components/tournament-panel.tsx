"use client";

import React from "react";
import type { Team } from "@/lib/football";
import { loadTournamentTeams, simulateTournament } from "../api/tournament";
import { buildTournamentRequest, experimentalValues, moveParticipant, participant, prefillParticipant, ratingFields, ratingLabels,
  type Participant, type TournamentDraft, type TournamentRequest, type TournamentResult } from "../domain/tournament";

const control = "rounded-lg border border-white/20 bg-black/60 p-3 text-white";
const button = "rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";
const message = (error: unknown) => error instanceof Error ? error.message : "Unable to run simulation. Please try again.";

export default function TournamentPanel() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState("");
  const [refresh, setRefresh] = React.useState(0);
  const [draft, setDraft] = React.useState<TournamentDraft>({ size: 4, participants: [], simulations: "1000", seed: "" });
  const [result, setResult] = React.useState<{ data: TournamentResult; request: TournamentRequest } | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [replaceId, setReplaceId] = React.useState<number | null>(null);
  const active = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    loadTournamentTeams(controller.signal).then(records => {
      if (!controller.signal.aborted) setTeams(records);
    }).catch(error => {
      if (!controller.signal.aborted) setCatalogError(message(error));
    }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  React.useEffect(() => () => { active.current?.abort(); }, []);

  function change(next: TournamentDraft) {
    active.current?.abort(); active.current = null;
    setLoading(false); setResult(null); setError(""); setReplaceId(null); setDraft(next);
  }
  function updateParticipant(index: number, p: Participant) {
    change({ ...draft, participants: draft.participants.map((old, i) => i === index ? p : old) });
  }
  function toggle(team: Team) {
    const selected = draft.participants.some(p => p.team.team_id === team.team_id);
    change({ ...draft, participants: selected ? draft.participants.filter(p => p.team.team_id !== team.team_id) : [...draft.participants, participant(team)] });
  }
  function prefill(index: number, overwrite = false) {
    const p = draft.participants[index];
    try { updateParticipant(index, prefillParticipant(p, overwrite)); }
    catch { setReplaceId(p.team.team_id); }
  }
  async function run() {
    if (active.current) return;
    let request: TournamentRequest;
    try { request = buildTournamentRequest(draft); }
    catch (error) { setError(message(error)); return; }
    const controller = new AbortController(); active.current = controller;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await simulateTournament(request, controller.signal);
      if (!controller.signal.aborted && active.current === controller) setResult({ data, request });
    } catch (error) {
      if (!controller.signal.aborted && active.current === controller) setError(message(error));
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }
  let validation = "";
  try { buildTournamentRequest(draft); } catch (error) { validation = message(error); }
  const ranked = teams.filter(t => t.fifa_rank !== null).sort((a, b) => a.fifa_rank! - b.fifa_rank! || a.team_id - b.team_id);

  return <section aria-labelledby="tournament-heading" className="mt-10 rounded-3xl border border-white/10 bg-[#071522]/90 p-6 text-white md:p-8">
    <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">Tournament Analysis</p>
    <h2 id="tournament-heading" className="mt-2 text-3xl font-bold">Monte Carlo Tournament Simulation</h2>
    <p className="mt-3 text-zinc-300">Hypothetical Monte Carlo simulation. These probabilities describe your assumptions, not observed historical outcomes or validated forecasts. No saved prediction is required.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <label className="grid gap-2">Tournament size<select className={control} value={draft.size} onChange={e => change({ ...draft, size: Number(e.target.value) })}>
        {[4, 8, 16, 32].map(size => <option key={size} value={size}>{size} teams</option>)}
      </select></label>
      <label className="grid gap-2">Simulation count<input className={control} type="number" min={1000} max={2000} step={1} value={draft.simulations} onChange={e => change({ ...draft, simulations: e.target.value })} /></label>
      <label className="grid gap-2">Random seed (optional)<input className={control} type="number" min={0} max={4294967295} step={1} value={draft.seed} placeholder="Generated by backend" onChange={e => change({ ...draft, seed: e.target.value })} /></label>
    </div>
    <p className="mt-4">Selected {draft.participants.length} of {draft.size} teams. Changing size preserves participants; add or remove teams explicitly.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <button type="button" className={button} disabled={catalogLoading || ranked.length === 0} onClick={() => change({ ...draft, participants: ranked.slice(0, draft.size).map(team => draft.participants.find(p => p.team.team_id === team.team_id) ?? participant(team)) })}>Select Top Ranked</button>
      <button type="button" className={button} onClick={() => change({ ...draft, participants: [] })}>Clear</button>
    </div>
    {catalogLoading && <p role="status" className="mt-4">Loading tournament teams...</p>}
    {catalogError && <div className="mt-4"><p role="alert">{catalogError}</p><button type="button" className={button} onClick={() => { setCatalogLoading(true); setCatalogError(""); setRefresh(n => n + 1); }}>Retry loading teams</button></div>}
    {!catalogLoading && !catalogError && teams.length === 0 && <p className="mt-4">No catalog teams available.</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {teams.map(team => {
        const selected = draft.participants.some(p => p.team.team_id === team.team_id);
        return <button type="button" key={team.team_id} aria-label={`Select ${team.name}`} aria-pressed={selected} disabled={!selected && draft.participants.length >= draft.size} onClick={() => toggle(team)} className={`${button} text-left ${selected ? "border-pink-400 bg-pink-500/20" : "bg-black/30"}`}>
          <span className="block font-semibold">{team.name}</span><span className="text-xs text-zinc-300">{team.fifa_rank === null ? "Rank unavailable" : `FIFA #${team.fifa_rank}`}</span>
        </button>;
      })}
    </div>
    <h3 className="mt-8 text-2xl font-semibold">Ordered bracket and hypothetical strengths</h3>
    <p className="mt-2 text-zinc-300">Adjacent slots play each other: Slot 1 vs Slot 2, Slot 3 vs Slot 4, and so on. Ranking order is not standard tournament seeding. Enter all five ratings from 0 to 100; zero is valid, blank is missing.</p>
    <ol className="mt-4 space-y-4">
      {draft.participants.map((p, index) => <li key={p.team.team_id} className="rounded-2xl border border-white/20 bg-black/30 p-4">
        <fieldset>
          <legend className="text-lg font-semibold">Slot {index + 1}: {p.team.name} — paired with Slot {index % 2 === 0 ? index + 2 : index}</legend>
          <div className="my-3 flex flex-wrap gap-2">
            <button type="button" className={button} aria-label={`Move ${p.team.name} up`} disabled={index === 0} onClick={() => change({ ...draft, participants: moveParticipant(draft.participants, index, -1) })}>Move Up</button>
            <button type="button" className={button} aria-label={`Move ${p.team.name} down`} disabled={index === draft.participants.length - 1} onClick={() => change({ ...draft, participants: moveParticipant(draft.participants, index, 1) })}>Move Down</button>
            <button type="button" className={button} aria-label={`Remove ${p.team.name}`} onClick={() => toggle(p.team)}>Remove</button>
            <button type="button" className={button} aria-label={`Prefill experimental ratings for ${p.team.name}`} disabled={Object.keys(experimentalValues(p.team)).length === 0} onClick={() => prefill(index)}>Prefill experimental Offense / Defense / Form</button>
          </div>
          {replaceId === p.team.team_id && <div className="mb-3 rounded-lg border border-amber-400 p-3" role="alert">
            <p>Replace existing Offense, Defense or Form values where experimental values are available? Star Power and Clutch will be preserved.</p>
            <button type="button" className={button} onClick={() => prefill(index, true)}>Confirm replacement</button>{" "}
            <button type="button" className={button} onClick={() => setReplaceId(null)}>Cancel replacement</button>
          </div>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ratingFields.map(field => <label key={field} className="grid gap-1">{ratingLabels[field]}<input aria-label={`${p.team.name} ${ratingLabels[field]}`} className={`${control} w-full`} type="number" min={0} max={100} step="any" value={p.ratings[field]} onChange={e => updateParticipant(index, { ...p, ratings: { ...p.ratings, [field]: e.target.value } })} /></label>)}
          </div>
          <p className="mt-2 text-sm text-zinc-300">Star Power and Clutch require your explicit hypothetical assumptions.</p>
          {Object.keys(experimentalValues(p.team)).length === 0 && <p className="mt-2 text-sm">Experimental enrichment unavailable; enter ratings manually. {p.team.ratings_metadata?.evidence.reason}</p>}
          {p.team.ratings_metadata && <details className="mt-2 break-words text-sm text-zinc-300"><summary>Experimental rating provenance{p.prefilled ? " — applied as editable assumptions" : " — optional prefill"}</summary>
            <p>Cutoff: {p.team.ratings_metadata.cutoff}; model: {p.team.ratings_metadata.model}; source: {p.team.ratings_metadata.source}</p>
            <p>Run: {p.team.ratings_metadata.run_id}; source SHA-256: {p.team.ratings_metadata.source_sha256}</p>
            <p>Experimental recorded-match ratings, not validated regulation-time forecasts. Edited values remain your hypothetical assumptions.</p>
          </details>}
        </fieldset>
      </li>)}
    </ol>
    {validation && <p className="mt-4 text-amber-200" aria-live="polite">{validation}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/20 p-4">{error}</p>}
    <button type="button" className="mt-6 rounded-xl goalstats-primary px-6 py-3 font-semibold disabled:opacity-50" disabled={loading || catalogLoading || !!catalogError} onClick={() => void run()}>{loading ? "Running simulation..." : error && !validation ? "Retry simulation" : "Run simulation"}</button>
    {loading && <p role="status" className="mt-3">Running hypothetical tournament simulation...</p>}
    {!result && !loading && <p className="mt-4 text-zinc-300">No simulation results for this configuration.</p>}
    {result && <div className="mt-8 space-y-4" aria-live="polite">
      <h3 className="text-2xl font-bold">Hypothetical Monte Carlo simulation results</h3>
      <p>Simulation model: {result.data.model_version ?? "Not provided by this backend"}</p>
      <p>Simulations executed: {result.data.simulations.toLocaleString()} · Random seed used: {result.data.seed}</p>
      <p>Most likely champion: {result.data.predicted_champion} (team #{result.data.predicted_champion_id})</p>
      <p>Most common final: {result.data.most_common_final ? `${result.data.most_common_final.team1} vs ${result.data.most_common_final.team2} (${result.data.most_common_final.probability.toFixed(2)}%)` : "Unavailable"}</p>
      <p>Executed bracket: {result.request.teams.map((team, i) => `Slot ${i + 1}: ${result.data.results.find(row => row.team_id === team.team_id)!.team}`).join(" · ")}</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left">
        <caption className="text-left text-zinc-300">Advancement probabilities (%), conditional on the entered assumptions</caption>
        <thead><tr>{["Team", "FIFA rank", "Semifinal", "Final", "Champion"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{result.data.results.map(row => <tr key={row.team_id} className="border-t border-white/10"><th scope="row" className="p-3">{row.team}</th><td className="p-3">{row.fifa_rank === null ? "Unavailable" : `#${row.fifa_rank}`}</td>{[row.semifinal_probability, row.final_probability, row.champion_probability].map((p, i) => <td key={i} className="p-3">{p.toFixed(2)}%</td>)}</tr>)}</tbody>
      </table></div>
    </div>}
  </section>;
}
