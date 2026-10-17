"use client";

import Link from "next/link";
import React from "react";
import ViewNavigation from "@/components/view-navigation";

import {parseScenarioInput,parseScenario,parseScenarios,parseSavedPrediction,parsePredictionHistory,parsePreviewSession,previewPredictionView,savedPredictionView,displayScenario,previewStorageKey,routeId,isCatalogId,strengthFields,type TeamStats,type ScenarioRecord,type PredictionView as StoredPrediction,type SavedPrediction as SnapshotRecord} from "@/lib/football";

export default function PredictionsView() {
  const [result, setResult] =
    React.useState<StoredPrediction | null>(null);

  const [history, setHistory] =
    React.useState<SnapshotRecord[]>([]);

  const [error, setError] = React.useState("");
  const [historyError, setHistoryError] = React.useState("");
  const [saveMessage, setSaveMessage] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  const [scenarioId, setScenarioId] = React.useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = React.useState<ScenarioRecord | null>(null);
  const [scenarios, setScenarios] = React.useState<ScenarioRecord[]>([]);
  const [scenarioOffset, setScenarioOffset] = React.useState(0);
  const [scenarioRefresh, setScenarioRefresh] = React.useState(0);
  const [scenariosLoading, setScenariosLoading] = React.useState(true);
  const [scenariosError, setScenariosError] = React.useState("");
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [historyOffset, setHistoryOffset] = React.useState(0);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [uncertain, setUncertain] = React.useState<"create" | "generate" | null>(null);
  const [historyReviewed, setHistoryReviewed] = React.useState(false);
  const savingRef = React.useRef(false);
  const mounted = React.useRef(true);
  const detailRequest = React.useRef<AbortController|null>(null);
  const historyRequest = React.useRef<AbortController | null>(null);
  const pendingKey = "goalstats-pending-save";
  const pageSize = 50;

  function clearPending() {
    try { sessionStorage.removeItem(pendingKey); } catch { /* The URL still retains known server IDs. */ }
  }
  function retainLocation(id: number, predictionId?: number) {
    if(!mounted.current || window.location.pathname!=="/predictions")return;
    window.history.replaceState(null, "", predictionId ? `/predictions?prediction_id=${predictionId}` : `/predictions?scenario_id=${id}`);
  }

  React.useEffect(() => {
    mounted.current=true;
    const controller = new AbortController();
    async function initialize() {
      try {
        const params = new URLSearchParams(window.location.search);
        const predictionId = routeId(params.get("prediction_id"));
        const requestedScenario = routeId(params.get("scenario_id"));
        if (predictionId && requestedScenario) throw new Error("Open either a prediction or a scenario, not both.");
        try {
        const pending = sessionStorage.getItem(pendingKey);
        if (pending) {
          const marker: unknown = JSON.parse(pending);
          if (marker && typeof marker === "object" && "kind" in marker && marker.kind === "create") setUncertain("create");
          if (marker && typeof marker === "object" && "kind" in marker && marker.kind === "generate" && "scenario_id" in marker && isCatalogId(marker.scenario_id) && (!requestedScenario || requestedScenario === marker.scenario_id) && !predictionId) {
            setUncertain("generate"); setScenarioId(marker.scenario_id);
          }
        }
        } catch { /* Durable GETs do not require browser storage. */ }
        if (predictionId) {
          const response = await fetch(`/api/football/predictions/${predictionId}`, {signal:controller.signal});
          const data = await response.json();
          if (!response.ok) throw new Error(data?.detail || "Unable to retrieve saved prediction.");
          const record = parseSavedPrediction(data);
          if (record.prediction_id !== predictionId) throw new Error("Prediction ID does not match the requested record.");
          if (controller.signal.aborted) return;
          setResult(savedPredictionView(record)); setScenarioId(record.scenario_id);
        } else if (requestedScenario) {
          setScenarioId(requestedScenario);
        } else {
          const stored = sessionStorage.getItem(previewStorageKey);
          if (stored) setResult(previewPredictionView(parsePreviewSession(JSON.parse(stored))));
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load prediction.");
      } finally {
        if (!controller.signal.aborted) setInitialLoading(false);
      }
    }
    void initialize();
    return () => {mounted.current=false;controller.abort();detailRequest.current?.abort();};
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    async function discover() {
      setScenariosLoading(true); setScenariosError("");
      try {
        const response = await fetch(`/api/football/scenarios?limit=${pageSize}&offset=${scenarioOffset}`, {signal:controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to load saved scenarios.");
        const records = parseScenarios(data);
        if (!controller.signal.aborted) setScenarios(records);
      } catch (err) {
        if (!controller.signal.aborted) setScenariosError(err instanceof Error ? err.message : "Unable to load saved scenarios.");
      } finally { if (!controller.signal.aborted) setScenariosLoading(false); }
    }
    void discover();
    return () => controller.abort();
  }, [scenarioOffset, scenarioRefresh]);

  React.useEffect(() => {
    const controller = new AbortController();
    async function reopen() {
      if (!scenarioId) return;
      try {
        const response = await fetch(`/api/football/scenarios/${scenarioId}`, {signal:controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to reopen saved scenario.");
        const record = parseScenario(data);
        if (record.scenario_id !== scenarioId) throw new Error("Invalid scenario identity.");
        if (!controller.signal.aborted) setSelectedScenario(record);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to reopen saved scenario."); }
    }
    void reopen();
    return () => controller.abort();
  }, [scenarioId]);

  React.useEffect(() => {
    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    async function historyPage() {
      if (!scenarioId) return;
      setLoadingHistory(true); setHistoryError(""); setHistory([]);
      try {
        const response = await fetch(`/api/football/scenarios/${scenarioId}/predictions?limit=${pageSize}&offset=${historyOffset}`, {signal:controller.signal});
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to load prediction history.");
        const records = parsePredictionHistory(data,scenarioId);
        if (!controller.signal.aborted) { setHistory(records); setHistoryReviewed(true); }
      } catch (err) {
        if (!controller.signal.aborted) setHistoryError(err instanceof Error ? err.message : "Unable to load prediction history.");
      } finally { if (!controller.signal.aborted) setLoadingHistory(false); }
    }
    void historyPage();
    return () => controller.abort();
  }, [scenarioId, historyOffset, historyRefresh]);

  function loadHistory() { setHistoryReviewed(false); setHistoryOffset(0); setHistoryRefresh(value => value + 1); }
  function percentFraction(value: number) { return `${(value * 100).toFixed(1)}%`; }
  function percentValue(value: number) { return `${Number(value).toFixed(1)}%`; }

  async function saveSnapshot() {
    if (savingRef.current || uncertain || (!result && !selectedScenario)) return;
    detailRequest.current?.abort();
    savingRef.current = true; setSaving(true); setError(""); setSaveMessage("");
    let id = scenarioId;
    let stage: "create" | "generate" = id ? "generate" : "create";
    let sent = false;
    let status: number | undefined;
    try {
      if (!id) {
        if (!result || result.saved) throw new Error("Load an unsaved preview before creating a scenario.");
        // A marker precedes the request so refresh cannot quietly turn an uncertain save into a retry.
        sessionStorage.setItem(pendingKey,JSON.stringify({kind:"create"}));
        const input = parseScenarioInput(result.scenario.input);
        sent = true;
        const response = await fetch("/api/football/scenarios", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
        status = response.status;
        const data = await response.json();
        if (status !== 201) throw new Error(data?.detail || "Unable to create scenario.");
        const record = parseScenario(data);
        id = record.scenario_id;
        // Retain identity before any second request. These are separate transactions.
        setScenarioId(id); setSelectedScenario(record); retainLocation(id);
        setSaveMessage(`Scenario #${id} saved. Generating its prediction...`);
        setScenarioRefresh(value=>value+1);
        sent = false;
      }
      stage = "generate"; status = undefined;
      sessionStorage.setItem(pendingKey,JSON.stringify({kind:"generate",scenario_id:id}));
      setHistoryReviewed(false);
      sent = true;
      const response = await fetch(`/api/football/scenarios/${id}/predictions`, {method:"POST"});
      status = response.status;
      const data = await response.json();
      if (status !== 201) throw new Error(data?.detail || "Unable to generate saved prediction.");
      const record = parseSavedPrediction(data);
      if (record.scenario_id !== id) throw new Error("Saved prediction belongs to another scenario.");
      setResult(savedPredictionView(record)); retainLocation(id,record.prediction_id);
      clearPending(); setUncertain(null);
      setSaveMessage(`Prediction #${record.prediction_id} saved for scenario #${id}.`);
      loadHistory();
    } catch (err) {
      const unknownOutcome = sent && (status === undefined || status >= 500 || (status >= 200 && status < 300));
      if (unknownOutcome) {
        setUncertain(stage);
        if (stage === "generate") {
          setHistoryReviewed(false);
          setHistoryOffset(0); setHistoryRefresh(value=>value+1);
        } else setScenarioRefresh(value=>value+1);
      } else clearPending();
      setError(`${err instanceof Error ? err.message : "Unable to save prediction."}${unknownOutcome ? stage === "create" ? " Creation outcome is uncertain. Inspect saved scenarios before deciding to create another." : " Generation outcome is uncertain. Inspect the refreshed history; another generation may append a duplicate." : id ? ` Scenario #${id} is retained. You can retry generation without creating another scenario.` : " Your preview is preserved."}`);
    } finally { savingRef.current=false; setSaving(false); }
  }

  async function loadSnapshot(snapshot: SnapshotRecord) {
    if (savingRef.current) return;
    detailRequest.current?.abort();
    const controller=new AbortController();detailRequest.current=controller;
    setHistoryError("");
    try {
      const response = await fetch(`/api/football/predictions/${snapshot.prediction_id}`,{signal:controller.signal});
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Unable to retrieve prediction.");
      const record = parseSavedPrediction(data);
      if (record.prediction_id !== snapshot.prediction_id || record.scenario_id !== scenarioId) throw new Error("Invalid saved prediction identity.");
      if(controller.signal.aborted)return;
      setResult(savedPredictionView(record)); retainLocation(record.scenario_id,record.prediction_id);
      setSaveMessage("Saved prediction loaded from its immutable inputs and output.");
      if (uncertain === "generate") { clearPending(); setUncertain(null); }
      window.scrollTo({top:0,behavior:"smooth"});
    } catch (err) { if(!controller.signal.aborted)setHistoryError(err instanceof Error ? err.message : "Unable to retrieve prediction."); }
  }

  const recovery = uncertain && <div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
    {uncertain === "create" ? "A scenario creation may have completed. Inspect saved scenarios below before another creation." : "A prediction generation may have completed. Inspect saved history before another generation; retrying can append a duplicate."}
    <button type="button" className="ml-3 underline" disabled={saving || (uncertain === "generate" ? !historyReviewed || loadingHistory || !!historyError : scenariosLoading || !!scenariosError)} onClick={() => {clearPending();setUncertain(null);setError("");}}>I reviewed the saved records; allow another attempt</button>
  </div>;
  const historyPagination = scenarioId && <div className="mt-4 flex flex-wrap items-center gap-4">
    <button type="button" disabled={loadingHistory || historyOffset === 0} onClick={()=>setHistoryOffset(value=>Math.max(0,value-pageSize))}>Previous predictions</button>
    <span>Prediction page {historyOffset/pageSize+1}</span>
    <button type="button" disabled={loadingHistory || !!historyError || history.length < pageSize} onClick={()=>setHistoryOffset(value=>value+pageSize)}>Next predictions</button>
  </div>;
  const discovery = <section aria-label="Saved scenarios" className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
    <h2 className="text-2xl font-semibold">Saved Scenarios</h2>
    <p className="mt-2 text-sm text-zinc-400">Browse persisted hypothetical scenarios. Preview state is temporary; saved records can be reopened in a new browser session.</p>
    <button type="button" className="mt-3 underline" disabled={scenariosLoading} onClick={()=>setScenarioRefresh(value=>value+1)}>Reload scenarios</button>
    {scenariosLoading && <p role="status">Loading saved scenarios...</p>}
    {scenariosError && <p role="alert" className="mt-3 text-red-200">{scenariosError}</p>}
    {!scenariosLoading && !scenariosError && scenarios.length===0 && <p>No saved scenarios on this page.</p>}
    {!scenariosLoading && !scenariosError && <ul className="mt-4 space-y-3">{scenarios.map(record=><li key={record.scenario_id} className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p>{record.title || `${record.team1_name} vs ${record.team2_name}`} · Scenario #{record.scenario_id}</p>
      <p className="text-sm text-zinc-400">{record.team1_name} vs {record.team2_name} · {formatSavedDate(record.created_at)}</p>
      <a className="mr-4 underline" href={`/predictions?scenario_id=${record.scenario_id}`}>Open predictions for scenario #{record.scenario_id}</a>
      <Link className="underline" href={`/matches?scenario_id=${record.scenario_id}`}>Reopen scenario #{record.scenario_id}</Link>
    </li>)}</ul>}
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button type="button" disabled={scenariosLoading || scenarioOffset===0} onClick={()=>setScenarioOffset(value=>Math.max(0,value-pageSize))}>Previous scenarios</button>
      <span>Scenario page {scenarioOffset/pageSize+1}</span>
      <button type="button" disabled={scenariosLoading || !!scenariosError || scenarios.length<pageSize} onClick={()=>setScenarioOffset(value=>value+pageSize)}>Next scenarios</button>
    </div>
  </section>;

  function formatSavedDate(value?: string) {
    if (!value) {
      return "Saved prediction";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  if (!result) {
    return (
      <main
        className="min-h-screen bg-cover bg-center bg-fixed text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(3,10,18,0.82), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <ViewNavigation currentPath="/predictions" />
          {discovery}{recovery}



          <section className="mt-8 rounded-3xl border border-white/10 bg-[#071522]/90 p-8 shadow-2xl backdrop-blur-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Prediction Analysis
            </p>

            <h1 className="mt-3 text-5xl font-bold">
              {initialLoading ? "Loading prediction..." : "No Prediction Loaded"}
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Create a match scenario first, then Goal Stats will show the full
              prediction analysis here.
            </p>

            {error && (
              <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                {error}
              </p>
            )}

            <Link
              href={scenarioId ? `/matches?scenario_id=${scenarioId}` : "/matches?preview=1"}
              className="mt-6 inline-block rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
            >
              Build a Match Scenario →
            </Link>
            {selectedScenario && <div className="mt-4">
              <p>Scenario #{selectedScenario.scenario_id}: {selectedScenario.team1_name} vs {selectedScenario.team2_name}, minute {selectedScenario.match_minute}</p>
              <button type="button" disabled={saving||!!uncertain} onClick={()=>void saveSnapshot()}>Generate saved prediction</button>
              {saveMessage && <p role="status">{saveMessage}</p>}
              {historyError && <p role="alert">{historyError}</p>}
              {loadingHistory && <p>Loading prediction history...</p>}
              {!loadingHistory&&!historyError&&history.length===0&&<p>No saved predictions yet.</p>}
              {history.map(r=><button type="button" key={r.prediction_id} onClick={()=>void loadSnapshot(r)}>Open prediction #{r.prediction_id} · {formatSavedDate(r.generated_at)}</button>)}
              {historyPagination}
            </div>}
          </section>
        </div>
      </main>
    );
  }

  const { prediction, scenario } = result;

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,10,18,0.80), rgba(3,10,18,0.94)), url('/images/matches-bg.png')",
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <ViewNavigation currentPath="/predictions" />
{discovery}{recovery}
        <p className="mt-4 text-sm text-zinc-400">{result.saved ? `Saved prediction #${result.saved.prediction_id} · ${formatSavedDate(result.saved.generated_at)} · ${result.saved.model_version}` : `Unsaved hypothetical preview · ${result.prediction.model}`}</p>
        <p className="mt-2 text-sm text-zinc-400">Saving creates a scenario, then generates a prediction in a separate request. Further generation uses the current saved scenario.</p>
        <details className="mt-4"><summary>Hypothetical strength assumptions</summary>{(["team1","team2"] as const).map(side=><p key={side}>{result.scenario[side]}: {strengthFields.map(f=>`${f.replace("_"," ")} ${result.scenario.input[`${side}_${f}`]}`).join(" · ")}</p>)}</details>

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#071522]/90 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div
            className="pointer-events-none absolute right-[-70px] top-[-50px] h-[380px] w-[380px] bg-contain bg-center bg-no-repeat opacity-10"
            style={{
              backgroundImage: "url('/images/matches-watermark.png')",
            }}
          />

          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Prediction Analysis
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold md:text-5xl">
                  {prediction.team1}
                  <span className="mx-3 text-zinc-500">vs</span>
                  {prediction.team2}
                </h1>

                <p className="mt-3 text-zinc-300">
                  Minute {scenario.minute}
                  {scenario.extra_minute
                    ? `+${scenario.extra_minute}`
                    : ""}
                  {scenario.status
                    ? ` · ${scenario.status}`
                    : ""}
                </p>
              </div>

              <div className="rounded-xl border border-pink-400/20 bg-pink-500/10 px-5 py-3">
                <p className="text-sm uppercase tracking-widest text-pink-300">
                  Current Score
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {scenario.team1_stats.goals}
                  <span className="mx-3 text-zinc-500">–</span>
                  {scenario.team2_stats.goals}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSnapshot}
                disabled={saving || !!uncertain}
                className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : (scenarioId ? "Generate another saved prediction" : "Save new scenario and prediction")}
              </button>

              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loadingHistory}
                className="rounded-xl border border-white/20 bg-black/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingHistory
                  ? "Loading History..."
                  : "Reload History"}
              </button>
            </div>

            {saveMessage && (
              <p className="mt-4 rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-green-200">
                {saveMessage}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                {error}
              </p>
            )}

            <section className="mt-8">
              <h2 className="text-2xl font-semibold">
                Win{" "}
                <span className="text-pink-400">
                  Probabilities
                </span>
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label={`${prediction.team1} Win`}
                  value={percentFraction(
                    prediction.probabilities.team1
                  )}
                />

                <MetricCard
                  label="Draw"
                  value={percentFraction(
                    prediction.probabilities.draw
                  )}
                />

                <MetricCard
                  label={`${prediction.team2} Win`}
                  value={percentFraction(
                    prediction.probabilities.team2
                  )}
                />
              </div>
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-2">
              {prediction.most_likely_score && (
                <InfoPanel title="Most Likely Score">
                  <p className="text-3xl font-bold">
                    {prediction.team1}{" "}
                    {prediction.most_likely_score[0]}
                    <span className="mx-3 text-zinc-500">
                      –
                    </span>
                    {prediction.most_likely_score[1]}{" "}
                    {prediction.team2}
                  </p>
                </InfoPanel>
              )}

              {prediction.confidence && (
                <InfoPanel title="Prediction Confidence">
                  <p className="text-2xl font-bold">
                    {prediction.confidence.label}
                  </p>

                  <p className="mt-2 text-pink-400">
                    {percentValue(
                      prediction.confidence.percent
                    )}
                  </p>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-pink-500"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            prediction.confidence.percent
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </InfoPanel>
              )}
            </section>

            {prediction.expected_goals_remaining && (
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Expected Goals{" "}
                  <span className="text-pink-400">
                    Remaining
                  </span>
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label={prediction.team1}
                    value={prediction.expected_goals_remaining.team1.toFixed(
                      2
                    )}
                  />

                  <MetricCard
                    label={prediction.team2}
                    value={prediction.expected_goals_remaining.team2.toFixed(
                      2
                    )}
                  />
                </div>
              </section>
            )}

            {prediction.momentum_percent && (
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Match{" "}
                  <span className="text-pink-400">
                    Momentum
                  </span>
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label={prediction.team1}
                    value={percentValue(
                      prediction.momentum_percent.team1
                    )}
                  />

                  <MetricCard
                    label={prediction.team2}
                    value={percentValue(
                      prediction.momentum_percent.team2
                    )}
                  />
                </div>
              </section>
            )}

            {prediction.advancement && (
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Advancement{" "}
                  <span className="text-pink-400">
                    Probability
                  </span>
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label={prediction.team1}
                    value={percentFraction(
                      prediction.advancement.team1
                    )}
                  />

                  <MetricCard
                    label={prediction.team2}
                    value={percentFraction(
                      prediction.advancement.team2
                    )}
                  />
                </div>
              </section>
            )}

            {prediction.top_scorelines &&
              prediction.top_scorelines.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-2xl font-semibold">
                    Top{" "}
                    <span className="text-pink-400">
                      Scorelines
                    </span>
                  </h2>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/55">
                    {prediction.top_scorelines.map(
                      (row, index) => (
                        <div
                          key={`${row.team1_goals}-${row.team2_goals}-${index}`}
                          className="flex items-center justify-between border-b border-white/10 px-5 py-4 last:border-b-0"
                        >
                          <span className="font-medium">
                            {prediction.team1}{" "}
                            {row.team1_goals}
                            <span className="mx-2 text-zinc-500">
                              –
                            </span>
                            {row.team2_goals}{" "}
                            {prediction.team2}
                          </span>

                          <strong className="text-pink-400">
                            {percentFraction(
                              row.probability
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {prediction.reasoning &&
              prediction.reasoning.length > 0 && (
                <section className="mt-8">
                  <InfoPanel title="Prediction Reasoning">
                    <ul className="space-y-3 text-zinc-300">
                      {prediction.reasoning.map(
                        (reason, index) => (
                          <li
                            key={`${reason}-${index}`}
                          >
                            • {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </InfoPanel>
                </section>
              )}

            {prediction.events &&
              prediction.events.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-2xl font-semibold">
                    Event{" "}
                    <span className="text-pink-400">
                      Timeline
                    </span>
                  </h2>

                  <div className="mt-4 space-y-3">
                    {prediction.events.map(
                      (event, index) => (
                        <div
                          key={`${event.minute}-${event.team}-${index}`}
                          className="rounded-xl border border-white/10 bg-black/55 p-4"
                        >
                          <p className="font-semibold">
                            {event.minute}′ · {event.team}
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {event.type}
                            {event.detail
                              ? ` — ${event.detail}`
                              : ""}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <h2 className="text-2xl font-semibold">
                Match{" "}
                <span className="text-pink-400">
                  State
                </span>
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TeamStateCard
                  name={prediction.team1}
                  stats={scenario.team1_stats}
                />

                <TeamStateCard
                  name={prediction.team2}
                  stats={scenario.team2_stats}
                />
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/55 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                    Saved Predictions
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Previous Predictions
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Saved predictions for {scenario.team1} vs{" "}
                    {scenario.team2}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadHistory()}
                  disabled={loadingHistory}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingHistory
                    ? "Loading..."
                    : "Refresh"}
                </button>
              </div>

              {historyPagination}
              {historyError && (
                <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
                  {historyError}
                </p>
              )}

              {!loadingHistory &&
                !historyError &&
                history.length === 0 && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5 text-zinc-400">
                    No saved predictions yet. Press{" "}
                    <strong className="text-white">
                      Save scenario and prediction
                    </strong>{" "}
                    to save the current prediction.
                  </div>
                )}

              {history.length > 0 && (
                <div className="mt-5 space-y-3">
                  {history.map((snapshot) => {
                    const savedPrediction =
                      snapshot.output;

                    const savedState =
                      displayScenario(snapshot.input_snapshot,snapshot.input_snapshot.team1_name,snapshot.input_snapshot.team2_name);

                    return (
                      <div
                        key={
                          snapshot.prediction_id
                        }
                        className="rounded-xl border border-white/10 bg-white/5 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-zinc-400">
                              {formatSavedDate(
                                snapshot.generated_at
                              )}
                            </p>

                            <p className="mt-1 text-lg font-bold">
                              {savedState.team1}{" "}
                              {savedState.team1_stats.goals}
                              <span className="mx-2 text-zinc-500">
                                –
                              </span>
                              {savedState.team2_stats.goals}{" "}
                              {savedState.team2}
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                              Minute {savedState.minute}
                              {savedState.extra_minute
                                ? `+${savedState.extra_minute}`
                                : ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              loadSnapshot(snapshot)
                            }
                            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600"
                          >
                            Open saved prediction
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <SmallProbability
                            label={`${savedPrediction.team1} Win`}
                            value={percentFraction(
                              savedPrediction.probabilities
                                .team1
                            )}
                          />

                          <SmallProbability
                            label="Draw"
                            value={percentFraction(
                              savedPrediction.probabilities
                                .draw
                            )}
                          />

                          <SmallProbability
                            label={`${savedPrediction.team2} Win`}
                            value={percentFraction(
                              savedPrediction.probabilities
                                .team2
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={scenarioId ? `/matches?scenario_id=${scenarioId}` : "/matches?preview=1"}
                className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
              >
                Edit Match Scenario
              </Link>

              <Link
                href={result.saved ? `/analytics?prediction_id=${result.saved.prediction_id}` : "/analytics"}
                className="rounded-xl border border-white/20 bg-black/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                View Analytics →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-pink-400/20 bg-pink-500/10 p-5 text-center">
      <p className="text-sm text-zinc-300">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}

function SmallProbability({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-center">
      <p className="text-xs text-zinc-400">
        {label}
      </p>

      <p className="mt-1 font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">
        {title}
      </p>

      <div className="mt-3">{children}</div>
    </div>
  );
}

function TeamStateCard({
  name,
  stats,
}: {
  name: string;
  stats: TeamStats;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-xl font-bold">
        {name}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <StatLine
          label="Goals"
          value={stats.goals}
        />

        <StatLine
          label="Possession"
          value={`${stats.possession}%`}
        />

        <StatLine
          label="Shots"
          value={stats.shots}
        />

        <StatLine
          label="Shots on Target"
          value={stats.shots_on_target}
        />

        <StatLine
          label="Big Chances"
          value={stats.big_chances}
        />

        <StatLine
          label="Blocks"
          value={stats.defender_blocks}
        />

        <StatLine
          label="GK Saves"
          value={stats.goalkeeper_saves}
        />

        <StatLine
          label="Corners"
          value={stats.corners}
        />

        <StatLine
          label="Yellow Cards"
          value={stats.yellow_cards}
        />

        <StatLine
          label="Red Cards"
          value={stats.red_cards}
        />
      </div>
    </div>
  );
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400">
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}