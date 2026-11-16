"use client";

import React from "react";
import { loadTournamentTeams } from "../api/tournament";
import { evaluateBacktest } from "../api/backtesting";
import { buildBacktestRequest, classes, datasetId, pilotDatasetId, fullDatasetId, editionCounts, predictedClass, reasonLabel, type BacktestResult, type Draft, type Case } from "../domain/backtesting";

const control = "rounded-lg border border-white/20 bg-black/60 p-3 text-white";
const button = "rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10 disabled:opacity-40";
const outcomeLabel = { home_win: "Home win", draw: "Draw", away_win: "Away win" };
const message = (e: unknown) => e instanceof Error ? e.message : "Evaluation failed. Please retry.";
export default function BacktestingPanel() {
  const [draft, setDraft] = React.useState<Draft>({ dataset: datasetId, mode: "strict_historical", offset: "0", limit: "1", packageId: "", assumptions: [] });
  const [assumptionJson, setAssumptionJson] = React.useState("");
  const [names, setNames] = React.useState<Record<number, string>>({});
  const [catalogError, setCatalogError] = React.useState(false);
  const [cohort, setCohort] = React.useState<Case[] | null>(null);
  const [result, setResult] = React.useState<BacktestResult | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [operation, setOperation] = React.useState<"evaluate" | "inspect">("evaluate");
  const active = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    loadTournamentTeams(controller.signal).then(teams => { if (!controller.signal.aborted) setNames(Object.fromEntries(teams.map(t => [t.team_id, t.name]))); })
      .catch(() => { if (!controller.signal.aborted) setCatalogError(true); });
    return () => { controller.abort(); active.current?.abort(); active.current = null; };
  }, []);
  function change(next: Draft, clearCohort = false) {
    active.current?.abort(); active.current = null; setLoading(false); setError(""); setResult(null);
    if (clearCohort) { setCohort(null); next = { ...next, assumptions: [] }; }
    setDraft(next);
  }
  async function run(inspect = false) {
    if (active.current) return;
    let request;
    try { request = buildBacktestRequest(inspect ? { ...draft, mode: "strict_historical" } : draft); }
    catch (e) { setOperation(inspect ? "inspect" : "evaluate"); setError(message(e)); return; }
    const controller = new AbortController(); active.current = controller;
    setOperation(inspect ? "inspect" : "evaluate"); setLoading(true); setResult(null); setError("");
    const timer = window.setTimeout(() => {
      if (active.current !== controller) return;
      controller.abort(); active.current = null; setLoading(false); setError("Evaluation timed out. Use a smaller limit and retry.");
    }, 35_000);
    try {
      const data = await evaluateBacktest(request, controller.signal);
      if (controller.signal.aborted || active.current !== controller) return;
      if (inspect) {
        setResult(data);
        setCohort(data.cases);
        setDraft(current => ({ ...current, assumptions: data.cases.flatMap(c => [c.home_team_id, c.away_team_id].map(team_id => ({ match_key: c.match_key, team_id, star_power: "", clutch: "" }))) }));
      } else setResult(data);
    } catch (e) { if (!controller.signal.aborted && active.current === controller) setError(message(e)); }
    finally { window.clearTimeout(timer); if (active.current === controller) { active.current = null; setLoading(false); } }
  }
  const teamName = (id: number) => names[id] ?? `Team #${id}`;
  const full = draft.dataset === fullDatasetId;
  const retrospective = draft.mode === "retrospective_assumptions";
  return <section aria-labelledby="backtesting-heading" className="mt-10 rounded-3xl border border-white/10 bg-[#071522]/90 p-6 text-white md:p-8">
    <h2 id="backtesting-heading" className="text-3xl font-bold">Model Evaluation — Backtesting</h2>
    <p className="mt-3 text-zinc-300">Experimental model diagnostics. Evaluate an approved historical cohort independently of saved hypothetical predictions. Recorded scores may include extra time; only verified regulation labels can be scored.</p>
    {draft.dataset === pilotDatasetId && <p className="mt-3">Two-match sample: New Zealand vs Norway and Australia vs Republic of Ireland, 20 July 2023. Retrospective assumption-based evaluation with experimental historical ratings. Two matches are insufficient for meaningful accuracy conclusions. No prospective forecasting claim. Strict mode remains unavailable.</p>}
    {full && <p className="mt-3">All 348 matches across nine editions are accounted for. 1991 has an 80-minute protocol and cannot be scored by the current model. Eligible 1995–2023 cases use the 90-minute protocol. Metrics never combine incompatible horizons. Historical ratings remain experimental; retrospective assumptions are not observations or validated prospective forecasts.</p>}
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <label className="grid gap-2">Evaluation dataset<select className={control} value={draft.dataset} onChange={e => change({ ...draft, dataset: e.target.value, offset: "0", edition: "", limit: e.target.value === fullDatasetId ? "348" : e.target.value === pilotDatasetId ? "2" : "1" }, true)}><option value={datasetId}>Women&apos;s World Cup 1991–2023 (recorded v1)</option><option value={pilotDatasetId}>2023 Retrospective Evaluation Pilot</option><option value={fullDatasetId}>Full World Cup Evidence — 1991–2023</option></select></label>
      <label className="grid gap-2">Evaluation mode<select className={control} value={draft.mode} onChange={e => change({ ...draft, mode: e.target.value })}><option value="strict_historical">Strict historical evaluation</option><option value="retrospective_assumptions">Retrospective assumption-based evaluation</option></select></label>
      {full && <label className="grid gap-2">World Cup edition<select className={control} value={draft.edition ?? ""} onChange={e => change({...draft, edition:e.target.value, offset:"0", limit:String(e.target.value ? editionCounts[Number(e.target.value)] : 348)},true)}><option value="">All nine editions — 348 matches</option>{Object.keys(editionCounts).map(year=><option key={year} value={year}>{year} — {editionCounts[Number(year)]} matches · {year === "1991" ? "80 minutes (model blocked)" : "90 minutes"}</option>)}</select></label>}
      <label className="grid gap-2">Match offset<input className={control} type="number" min={0} max={347} step={1} value={draft.offset} onChange={e => change({ ...draft, offset: e.target.value }, true)} /></label>
      <label className="grid gap-2">Evaluation limit<input className={control} type="number" min={1} max={full ? 348 : 16} step={1} value={draft.limit} onChange={e => change({ ...draft, limit: e.target.value }, true)} /></label>
    </div>
    <p className="mt-3">{retrospective ? "Retrospective assumption-based evaluation uses your hypothetical Star Power and Clutch values. It is not genuine historical forecasting evidence." : "Strict historical evaluation requires evidence-backed historical inputs, source availability, and compatible regulation outcomes."}</p>
    <p className="mt-2 text-sm text-zinc-300">{full ? "Edition-specific regulation: 1991 = 80 minutes (scoring blocked); 1995–2023 = 90 minutes. Numerical metrics cover only eligible 90-minute cases." : "Pregame regulation horizon: 90 minutes, excluding extra time and shootouts."} Cutoff: previous calendar day. Model: road-to-the-final-heuristic-v2. Ratings: international-recorded-score-poisson-v1.</p>
    <p className="mt-2 text-sm text-zinc-300">Counts and metrics cover only the selected page. Start with one match; use offset and limit to inspect more. Do not average page averages without weighting by eligible sample size.</p>
    {retrospective && <div className="mt-5 space-y-4">
      <label className="grid gap-2">Assumption package name<input className={control} maxLength={80} value={draft.packageId} onChange={e => change({ ...draft, packageId: e.target.value })} /></label>
      <button type="button" className={button} disabled={loading} onClick={() => void run(true)}>Load cohort for assumptions</button>
      {full && <div className="space-y-3"><label className="grid gap-2">Versioned assumption package JSON<textarea className={control} rows={5} value={assumptionJson} onChange={e=>setAssumptionJson(e.target.value)} /></label><p>Paste an object containing assumption_package_id and an assumptions array. Every entry must declare match_key, team_id, star_power and clutch. Values apply only to the selected cohort; none are generated automatically.</p><button type="button" className={button} disabled={loading} onClick={()=>{try {const value=JSON.parse(assumptionJson);if(!value || typeof value.assumption_package_id !== "string" || !Array.isArray(value.assumptions)) throw new Error("Expected a named assumption package and an assumptions array.");const assumptions=value.assumptions.map((a: Record<string,unknown>)=>{if(!a || typeof a.match_key!=="string" || typeof a.team_id!=="number" || typeof a.star_power!=="number" || typeof a.clutch!=="number") throw new Error("Every assumption requires explicit numeric ratings and participant identity.");return {match_key:a.match_key,team_id:a.team_id,star_power:String(a.star_power),clutch:String(a.clutch)};});const next={...draft,packageId:value.assumption_package_id,assumptions};buildBacktestRequest(next);change(next);}catch(e){setError(message(e));}}}>Apply explicit assumption package</button></div>}
      <p>Loading reads eligibility and participant identities. Enter both ratings explicitly for each team and match. Blank values are missing; zero is valid. In the pilot and full evidence package, incomplete participant assumptions exclude that match. Reloading clears entered ratings.</p>
      {cohort?.length === 0 && <p>No candidate matches on this page. Change the offset.</p>}
      {cohort?.map(c => <fieldset key={c.match_key} className="rounded-xl border border-white/20 p-4">
        <legend>Match #{c.match_id} · {c.match_date} · {teamName(c.home_team_id)} vs {teamName(c.away_team_id)}</legend>
        {draft.assumptions.map((a, index) => a.match_key !== c.match_key ? null : <div key={a.team_id} className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["star_power", "clutch"] as const).map(field => <label key={field} className="grid gap-2">{`Match ${c.match_id} ${teamName(a.team_id)} ${field === "star_power" ? "Star Power" : "Clutch"}`}<input className={control} type="number" min={0} max={100} step="any" value={a[field]} onChange={e => change({ ...draft, assumptions: draft.assumptions.map((old, i) => i === index ? { ...old, [field]: e.target.value } : old) })} /></label>)}
        </div>)}
      </fieldset>)}
    </div>}
    <div className="mt-5"><button type="button" className={button} disabled={loading} onClick={() => void run(Boolean(error) && operation === "inspect")}>{loading ? "Evaluating…" : error ? "Retry evaluation" : "Run evaluation"}</button></div>
    {loading && <p role="status" className="mt-3">Reading historical evidence and evaluating the selected page…</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 p-4 text-red-200">{error}</p>}
    {catalogError && <p className="mt-3">Team names are unavailable. Results retain the backend&apos;s catalog team IDs.</p>}
    {!result && !loading && !error && <p className="mt-4 text-zinc-300">No evaluation results yet. Submit a configuration to inspect actual evidence coverage.</p>}
    {result && <div className="mt-6 space-y-5" aria-label="Evaluation results">
      <h3 className="text-2xl font-semibold">{result.mode === "strict_historical" ? "Historical evaluation" : "Retrospective assumption-based evaluation"}</h3>
      {result.evidence_kind === "synthetic" && <p role="status">Synthetic test evidence — not historical accuracy.</p>}
      <p>{result.interpretation}</p>
      <dl className="grid gap-4 sm:grid-cols-4">{[["Dataset matches",result.dataset_match_count],["Cohort matches",result.cohort_match_count],["Candidate matches",result.total_candidate_matches],["Eligible matches",result.eligible_matches],["Excluded matches",result.excluded_matches]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd className="text-2xl font-bold">{value}</dd></div>)}</dl>
      {result.edition_summaries && result.edition_summaries.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left"><caption>Edition evidence coverage — selected cohort; metrics are 90-minute only</caption><thead><tr>{["Edition","Catalog total","Accounted for","Verified labels","Rating complete","Eligible","Excluded","Accuracy","Log loss","Brier score"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{result.edition_summaries.map(s=><tr key={s.edition}><th>{s.edition} · {s.edition===1991?"80 min — blocked":"90 min"}</th>{[s.catalog_total,s.total,s.verified_labels,s.rating_complete,s.eligible,s.excluded].map((v,i)=><td key={i}>{v}</td>)}<td>{s.accuracy===null?"Unavailable":`${(s.accuracy*100).toFixed(1)}%`}</td><td>{s.log_loss?.toFixed(6)??"Unavailable"}</td><td>{s.brier_score?.toFixed(6)??"Unavailable"}</td></tr>)}</tbody></table></div>}
      {result.total_candidate_matches === 0 && <p>No candidate matches on this page. Change the offset or inspect the dataset.</p>}
      {result.status === "unavailable" ? <p role="status">Historical accuracy unavailable: no eligible cases on this page. Accuracy, log loss, Brier score and confusion matrix are unavailable. Additional evidence is required.</p> : <>
        <dl className="grid gap-4 sm:grid-cols-3"><div><dt>Win/draw/loss accuracy</dt><dd>{(result.accuracy! * 100).toFixed(1)}%</dd></div><div><dt>Multiclass log loss</dt><dd>{result.log_loss!.toFixed(6)}</dd></div><div><dt>Multiclass Brier score</dt><dd>{result.brier_score!.toFixed(6)}</dd></div></dl>
        <p>Log loss uses natural logarithms and a 1e-15 clipping floor. Brier score sums all three squared errors (0–2). Lower is better for both losses. Accuracy uses the most likely class; ties select home win, then draw, then away win.</p>
        <div className="overflow-x-auto"><table className="w-full text-left"><caption>Confusion matrix — rows actual, columns predicted</caption><thead><tr><th scope="col">Actual / predicted</th>{classes.map(c => <th scope="col" key={c}>{outcomeLabel[c]}</th>)}</tr></thead><tbody>{result.confusion_matrix!.map((row,i) => <tr key={i}><th scope="row">{outcomeLabel[classes[i]]}</th>{row.map((v,j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
      </>}
      {Object.keys(result.exclusion_reasons).length > 0 && <div><h4 className="font-semibold">Exclusion reasons</h4><p>Counts may overlap: a match can have several missing prerequisites.</p><ul>{Object.entries(result.exclusion_reasons).map(([reason,count]) => <li key={reason}>{reasonLabel(reason)}: {count}</li>)}</ul></div>}
      <ul>{result.limitations.map((s,i) => <li key={i}>{s}</li>)}</ul>
      {result.cases.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><caption>Historical cases — selected page</caption><thead><tr>{["Match / date","Teams (home vs away)","Actual regulation outcome","Predicted H / D / A","Predicted class / classification","Eligibility and provenance"].map(h => <th scope="col" className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{result.cases.map(c => <tr key={c.match_key} className="border-t border-white/10">
        <th scope="row" className="p-2">#{c.match_id}<br/>{c.match_date}</th><td className="p-2">{teamName(c.home_team_id)} vs {teamName(c.away_team_id)}</td>
        <td className="p-2">{c.outcome ? outcomeLabel[c.outcome] : "Unavailable"}</td><td className="p-2">{c.probabilities ? c.probabilities.map(p => `${(p*100).toFixed(1)}%`).join(" / ") : "Unavailable"}</td>
        <td className="p-2">{c.probabilities ? `${outcomeLabel[predictedClass(c.probabilities)]} · ${predictedClass(c.probabilities) === c.outcome ? "Correct" : "Incorrect"}` : "Not evaluated"}</td>
        <td className="p-2">{c.status}<ul>{c.exclusion_reasons.map(r => <li key={r}>{reasonLabel(r)}</li>)}</ul><details><summary>Case provenance</summary><p>Protocol: {c.evaluation_protocol ?? "pregame-regulation-90-v1"}. Cutoff: {c.cutoff}. Ratings: {c.rating_reconstruction}. Model: {result.prediction_model_version}</p><p className="break-all">Source match key: {c.match_key}</p><ul>{c.warnings.map((w,i) => <li key={i}>{reasonLabel(w)}</li>)}</ul><pre className="max-w-lg whitespace-pre-wrap break-all text-xs">{JSON.stringify({ ranking_provenance: c.ranking_provenance, input_manifest: c.input_manifest, label_provenance: c.label_provenance, evidence_record:c.evidence_record, rating_evidence:c.rating_evidence }, null, 2)}</pre></details></td>
      </tr>)}</tbody></table></div>}
      <details><summary>Evaluation identity and reproducibility</summary><dl className="break-all">{["dataset_id","protocol_version","prediction_model_version","rating_model_version","prediction_horizon","cutoff_policy","dataset_hash","package_hash","source_hash","manifest_hash"].map(key => <div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{String(result[key as keyof BacktestResult])}</dd></div>)}</dl><p>Assumption package: {result.assumption_package_id ?? "None — strict historical mode"}</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(result.assumptions,null,2)}</pre></details>
    </div>}
  </section>;
}
