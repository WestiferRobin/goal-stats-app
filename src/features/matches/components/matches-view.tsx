"use client";

import React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {strengthFields, statFields, parseScenarioInput, previewInput, parsePredictionOutput, parsePreviewSession, parseScenario, routeId, scenarioPatch, previewStorageKey, type StrengthKey, type ScenarioInput, type ScenarioRecord, type PredictionOutput} from "@/lib/football";
import ViewNavigation from "@/components/view-navigation";

import { parseTeams, parseCompetitions, parseMatches, type Team, type Competition, type HistoryMatch } from "@/lib/football";

export default function MatchesView() {
  const router = useRouter();
  const [strengths,setStrengths] = React.useState<Partial<Record<StrengthKey,string>>>({});
  const [savedScenario,setSavedScenario] = React.useState<ScenarioRecord|null>(null);
  const [scenarioLoading,setScenarioLoading] = React.useState(true);
  const [scenarioError,setScenarioError] = React.useState("");
  const [scenarioMessage,setScenarioMessage] = React.useState("");
  const [patchUncertain,setPatchUncertain] = React.useState(false);
  const submitting=React.useRef(false);
  const previewRequest=React.useRef<AbortController|null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);

  const [team1Id, setTeam1Id] = React.useState<number | "">("");
  const [team2Id, setTeam2Id] = React.useState<number | "">("");

  const [minute, setMinute] = React.useState(0);

  const [team1Score, setTeam1Score] = React.useState(0);
  const [team2Score, setTeam2Score] = React.useState(0);

  const [team1Possession, setTeam1Possession] = React.useState(50);
  const [team2Possession, setTeam2Possession] = React.useState(50);

  const [team1TotalShots, setTeam1TotalShots] = React.useState(0);
  const [team2TotalShots, setTeam2TotalShots] = React.useState(0);

  const [team1ShotsOnTarget, setTeam1ShotsOnTarget] = React.useState(0);
  const [team2ShotsOnTarget, setTeam2ShotsOnTarget] = React.useState(0);

  const [team1BigChances, setTeam1BigChances] = React.useState(0);
  const [team2BigChances, setTeam2BigChances] = React.useState(0);

  const [team1DefenderBlocks, setTeam1DefenderBlocks] = React.useState(0);
  const [team2DefenderBlocks, setTeam2DefenderBlocks] = React.useState(0);

  const [team1GoalkeeperSaves, setTeam1GoalkeeperSaves] =
    React.useState(0);
  const [team2GoalkeeperSaves, setTeam2GoalkeeperSaves] =
    React.useState(0);

  const [team1Corners, setTeam1Corners] = React.useState(0);
  const [team2Corners, setTeam2Corners] = React.useState(0);

  const [team1YellowCards, setTeam1YellowCards] = React.useState(0);
  const [team2YellowCards, setTeam2YellowCards] = React.useState(0);

  const [team1RedCards, setTeam1RedCards] = React.useState(0);
  const [team2RedCards, setTeam2RedCards] = React.useState(0);

  const [prediction, setPrediction] =
    React.useState<PredictionOutput | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const team1 = teams.find(team => team.team_id === team1Id)?.name ?? "";
  const team2 = teams.find(team => team.team_id === team2Id)?.name ?? "";
  const [competitions, setCompetitions] = React.useState<Competition[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState("");
  const [matches, setMatches] = React.useState<HistoryMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = React.useState(true);
  const [matchesError, setMatchesError] = React.useState("");
  const [filters, setFilters] = React.useState({ competition: "", team: "", offset: 0 });
  const pageSize = 50;

  React.useEffect(() => {
    const controller = new AbortController();
    async function loadCatalog() {
      try {
        const [teamResponse, competitionResponse] = await Promise.all([
          fetch("/api/football/catalog/teams", { signal: controller.signal }),
          fetch("/api/football/catalog/competitions", { signal: controller.signal }),
        ]);
        if (!teamResponse.ok || !competitionResponse.ok) throw new Error("Unable to load the historical catalog.");
        const loadedTeams = parseTeams(await teamResponse.json());
        const loadedCompetitions = parseCompetitions(await competitionResponse.json());
        if (controller.signal.aborted) return;
        setTeams(loadedTeams);
        setCompetitions(loadedCompetitions);
      } catch (err) {
        if (!controller.signal.aborted) setCatalogError(err instanceof Error ? err.message : "Unable to load the historical catalog.");
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    }
    void loadCatalog();
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    async function loadMatches() {
      setMatchesLoading(true);
      setMatchesError("");
      setMatches([]);
      try {
        const params = new URLSearchParams({ limit: String(pageSize), offset: String(filters.offset) });
        if (filters.competition) params.set("competition_id", filters.competition);
        if (filters.team) params.set("team_id", filters.team);
        const response = await fetch(`/api/football/catalog/matches?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Unable to load historical matches.");
        const records = parseMatches(data);
        if (!controller.signal.aborted) setMatches(records);
      } catch (err) {
        if (!controller.signal.aborted) setMatchesError(err instanceof Error ? err.message : "Unable to load historical matches.");
      } finally {
        if (!controller.signal.aborted) setMatchesLoading(false);
      }
    }
    void loadMatches();
    return () => controller.abort();
  }, [filters]);

  const restoreInputs = React.useCallback((input:ScenarioInput)=>{
    setTeam1Id(input.team1_id);setTeam2Id(input.team2_id);setMinute(input.match_minute);
    setTeam1Score(input.team1_goals);
    setTeam1Possession(input.team1_possession);
    setTeam1TotalShots(input.team1_shots);
    setTeam1ShotsOnTarget(input.team1_shots_on_target);
    setTeam1BigChances(input.team1_big_chances);
    setTeam1DefenderBlocks(input.team1_defender_blocks);
    setTeam1GoalkeeperSaves(input.team1_goalkeeper_saves);
    setTeam1Corners(input.team1_corners);
    setTeam1YellowCards(input.team1_yellow_cards);
    setTeam1RedCards(input.team1_red_cards);
    setTeam2Score(input.team2_goals);
    setTeam2Possession(input.team2_possession);
    setTeam2TotalShots(input.team2_shots);
    setTeam2ShotsOnTarget(input.team2_shots_on_target);
    setTeam2BigChances(input.team2_big_chances);
    setTeam2DefenderBlocks(input.team2_defender_blocks);
    setTeam2GoalkeeperSaves(input.team2_goalkeeper_saves);
    setTeam2Corners(input.team2_corners);
    setTeam2YellowCards(input.team2_yellow_cards);
    setTeam2RedCards(input.team2_red_cards);
    setStrengths(Object.fromEntries((["team1","team2"] as const).flatMap(side=>strengthFields.map(f=>[`${side}_${f}`,String(input[`${side}_${f}`])]))));
  },[]);
  React.useEffect(()=>{
    const controller=new AbortController();
    async function reopen(){try{
      const params=new URLSearchParams(window.location.search),id=routeId(params.get("scenario_id"));
      if(id){const response=await fetch(`/api/football/scenarios/${id}`,{signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data?.detail||"Unable to reopen scenario.");const record=parseScenario(data);if(record.scenario_id!==id)throw new Error("Invalid scenario identity.");if(controller.signal.aborted)return;restoreInputs(record);setSavedScenario(record);}
      else if(params.get("preview")==="1"){const stored=sessionStorage.getItem(previewStorageKey);if(!stored)throw new Error("No unsaved preview is available.");restoreInputs(parsePreviewSession(JSON.parse(stored)).input);}
    }catch(err){if(!controller.signal.aborted)setScenarioError(err instanceof Error?err.message:"Unable to reopen scenario.");}finally{if(!controller.signal.aborted)setScenarioLoading(false);}}
    void reopen();return ()=>{controller.abort();previewRequest.current?.abort();};
  },[restoreInputs]);

  function resetForm() {
    setStrengths({});setSavedScenario(null);setScenarioError("");setScenarioMessage("");setPatchUncertain(false);window.history.replaceState(null,"","/matches");
    setTeam1Id("");
    setTeam2Id("");

    setMinute(0);

    setTeam1Score(0);
    setTeam2Score(0);

    setTeam1Possession(50);
    setTeam2Possession(50);

    setTeam1TotalShots(0);
    setTeam2TotalShots(0);

    setTeam1ShotsOnTarget(0);
    setTeam2ShotsOnTarget(0);

    setTeam1BigChances(0);
    setTeam2BigChances(0);

    setTeam1DefenderBlocks(0);
    setTeam2DefenderBlocks(0);

    setTeam1GoalkeeperSaves(0);
    setTeam2GoalkeeperSaves(0);

    setTeam1Corners(0);
    setTeam2Corners(0);

    setTeam1YellowCards(0);
    setTeam2YellowCards(0);

    setTeam1RedCards(0);
    setTeam2RedCards(0);

    setPrediction(null);
    setError("");

    sessionStorage.removeItem("goalstats-current-prediction");
  }

  function formInput():ScenarioInput {
    if(!teams.some(t=>t.team_id===team1Id)||!teams.some(t=>t.team_id===team2Id))throw new Error("Select two valid catalog teams.");
    const scenario = {
      team1,
      team2,
      minute,
      extra_minute: 0,
      status: "",

      team1_stats: {
        goals: team1Score,
        big_chances: team1BigChances,
        defender_blocks: team1DefenderBlocks,
        goalkeeper_saves: team1GoalkeeperSaves,
        corners: team1Corners,
        yellow_cards: team1YellowCards,
        red_cards: team1RedCards,
        shots: team1TotalShots,
        shots_on_target: team1ShotsOnTarget,
        possession: team1Possession,
      },

      team2_stats: {
        goals: team2Score,
        big_chances: team2BigChances,
        defender_blocks: team2DefenderBlocks,
        goalkeeper_saves: team2GoalkeeperSaves,
        corners: team2Corners,
        yellow_cards: team2YellowCards,
        red_cards: team2RedCards,
        shots: team2TotalShots,
        shots_on_target: team2ShotsOnTarget,
        possession: team2Possession,
      },
    };

    const ratings=Object.fromEntries((["team1","team2"] as const).flatMap(side=>strengthFields.map(f=>{const key:StrengthKey=`${side}_${f}`,value=strengths[key];if(value===undefined||!value.trim())throw new Error("Enter all ten hypothetical strength assumptions.");return [key,Number(value)];})));
    return parseScenarioInput({team1_id:team1Id,team2_id:team2Id,match_minute:scenario.minute,...ratings,...Object.fromEntries((["team1","team2"] as const).flatMap(side=>statFields.map(f=>[`${side}_${f}`,scenario[`${side}_stats`][f]]))),team1_fifa_rank:savedScenario?.team1_fifa_rank??null,team2_fifa_rank:savedScenario?.team2_fifa_rank??null,team1_modifier_total:savedScenario?.team1_modifier_total??0,team2_modifier_total:savedScenario?.team2_modifier_total??0,title:savedScenario?.title??null,match_id:savedScenario?.match_id??null});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submitting.current||scenarioLoading)return;

    if (!team1Id || !team2Id) {
      setError("Please select two teams.");
      return;
    }

    if (team1Id === team2Id) {
      setError("Team 1 and Team 2 must be different.");
      return;
    }

    if (Math.abs(team1Possession + team2Possession - 100) > 0.01) {
      setError("Team possession must add up to 100%.");
      return;
    }

    if (
      team1ShotsOnTarget > team1TotalShots ||
      team2ShotsOnTarget > team2TotalShots
    ) {
      setError("Shots on target cannot be greater than total shots.");
      return;
    }

    setError("");
    setPrediction(null);
    setLoading(true);submitting.current=true;


    try {
      const input=previewInput(formInput()),controller=new AbortController();previewRequest.current=controller;
      const response=await fetch("/api/football/predictions/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),signal:controller.signal});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to calculate prediction."
        );
      }

      if(controller.signal.aborted)return;
      const predictionData = parsePredictionOutput(data);
      if(predictionData.team1!==team1||predictionData.team2!==team2||predictionData.minute!==input.match_minute)throw new Error("Preview response does not match requested inputs.");

      setPrediction(predictionData);

      sessionStorage.setItem(
        "goalstats-current-prediction",
        JSON.stringify({version:2,kind:"preview",input,output:predictionData})
      );

      router.push("/predictions");
    } catch (err) {
      if(previewRequest.current?.signal.aborted)return;
      console.error("PREDICTION ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to calculate prediction."
      );
    } finally {
      setLoading(false);submitting.current=false;
    }
  }

  function percent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  async function updateScenario(){
    if(!savedScenario||submitting.current||patchUncertain)return;
    submitting.current=true;setLoading(true);setError("");setScenarioMessage("");let sent=false;
    try{const input=formInput(),patch=scenarioPatch(savedScenario,input);if(!Object.keys(patch).length){setScenarioMessage("No match-state changes to save.");return;}
      if(input.team1_shots_on_target>input.team1_shots||input.team2_shots_on_target>input.team2_shots)throw new Error("Shots on target cannot be greater than total shots.");
      sent=true;const response=await fetch(`/api/football/scenarios/${savedScenario.scenario_id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
      if(response.status<500)sent=false;const data=await response.json();if(!response.ok)throw new Error(data?.detail||"Unable to update scenario.");sent=true;const updated=parseScenario(data);if(updated.scenario_id!==savedScenario.scenario_id)throw new Error("Invalid scenario identity.");setSavedScenario(updated);restoreInputs(updated);setScenarioMessage("Scenario state updated. Existing predictions are unchanged; no prediction was generated.");sent=false;
    }catch(err){if(sent)setPatchUncertain(true);setError(`${err instanceof Error?err.message:"Unable to update scenario."}${sent?" Update outcome is uncertain. Reopen the saved scenario to inspect it before retrying.":""}`);}finally{submitting.current=false;setLoading(false);}
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.62)), url('/images/matches-bg.png')",
      }}
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <ViewNavigation currentPath="/matches" />

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#071522]/80 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div
            className="pointer-events-none absolute right-[-70px] top-[-45px] h-[380px] w-[380px] bg-contain bg-center bg-no-repeat opacity-10"
            style={{
              backgroundImage: "url('/images/matches-watermark.png')",
            }}
          />

          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
              Match Analysis
            </p>

            <h1 className="mt-2 text-5xl font-bold leading-tight">
              Build Your Match
              <span className="block text-pink-500">Scenario</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
              Select two teams, enter the current match state, and prepare the
              scenario for prediction analysis.
            </p>

            <section className="mt-8 rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg" aria-label="Historical matches">
              <h2 className="text-2xl font-semibold">Historical <span className="text-pink-400">Matches</span></h2>
              <p className="mt-2 text-sm text-zinc-400">Verified Women&apos;s World Cup results, oldest first. Final scores include extra time and exclude shootouts. Browsing does not change your hypothetical match inputs.</p>
              {catalogLoading && <p role="status" className="mt-4 text-zinc-300">Loading catalog...</p>}
              {catalogError && <p role="alert" className="mt-4 text-red-200">{catalogError}</p>}
              {!catalogLoading && !catalogError && teams.length === 0 && <p role="status">No teams are available.</p>}
              {!catalogLoading && !catalogError && competitions.length === 0 && <p role="status">No competition editions are available.</p>}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label>Competition edition
                  <select aria-label="Competition edition" value={filters.competition} disabled={catalogLoading || !!catalogError}
                    onChange={event => setFilters(previous => ({ ...previous, competition: event.target.value, offset: 0 }))}
                    className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400">
                    <option value="">All editions</option>
                    {competitions.map(competition => <option key={competition.competition_id} value={competition.competition_id}>{competition.name} · {competition.edition_label}</option>)}
                  </select>
                </label>
                <label>Historical team
                  <select aria-label="Historical team" value={filters.team} disabled={catalogLoading || !!catalogError}
                    onChange={event => setFilters(previous => ({ ...previous, team: event.target.value, offset: 0 }))}
                    className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400">
                    <option value="">All teams</option>
                    {teams.map(team => <option key={team.team_id} value={team.team_id}>{team.name}</option>)}
                  </select>
                </label>
              </div>
              {matchesLoading && <p role="status" className="mt-4 text-zinc-300">Loading historical matches...</p>}
              {matchesError && <p role="alert" className="mt-4 text-red-200">{matchesError}</p>}
              {!matchesLoading && !matchesError && matches.length === 0 && <p role="status" className="mt-4 text-zinc-300">No historical matches on this page. Adjust filters or return to the previous page.</p>}
              {!matchesLoading && !matchesError && <ul className="mt-5 space-y-3">
                {matches.map(match => <li key={match.match_id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-zinc-400">{match.match_date} · {match.edition_label} · {[match.city, match.country].filter(Boolean).join(", ")}</p>
                  <p className="font-semibold">{match.home_team_name} {match.home_score} – {match.away_score} {match.away_team_name}</p>
                </li>)}
              </ul>}
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="button" disabled={matchesLoading || filters.offset === 0} onClick={() => setFilters(previous => ({ ...previous, offset: Math.max(0, previous.offset - pageSize) }))} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">Previous page</button>
                <span>Page {filters.offset / pageSize + 1}</span>
                <button type="button" disabled={matchesLoading || !!matchesError || matches.length < pageSize} onClick={() => setFilters(previous => ({ ...previous, offset: previous.offset + pageSize }))} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">Next page</button>
              </div>
            </section>
            {scenarioLoading && <p role="status">Loading saved inputs...</p>}
            {scenarioError && <p role="alert">{scenarioError}</p>}
            {scenarioMessage && <p role="status">{scenarioMessage}</p>}
            {savedScenario && <p>Editing scenario #{savedScenario.scenario_id}. Team and strength changes require a new scenario. <Link href={`/predictions?scenario_id=${savedScenario.scenario_id}`}>Open saved predictions</Link>{patchUncertain && <a href={`/matches?scenario_id=${savedScenario.scenario_id}`}>Reopen saved scenario to inspect update</a>}</p>}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <fieldset disabled={loading||scenarioLoading} className="contents">
              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">
                  Select <span className="text-pink-400">Teams</span>
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Choose two different national teams to build your matchup.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-zinc-300">
                      Team 1
                    </label>

                    <select
                      aria-label="Team 1"
                      value={team1Id}
                      onChange={(event) => setTeam1Id(event.target.value ? Number(event.target.value) : "")}
                      className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
                    >
                      <option value="">Select a team</option>

                      {teams.map((team) => (
                        <option key={team.team_id} value={team.team_id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-zinc-300">
                      Team 2
                    </label>

                    <select
                      aria-label="Team 2"
                      value={team2Id}
                      onChange={(event) => setTeam2Id(event.target.value ? Number(event.target.value) : "")}
                      className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
                    >
                      <option value="">Select a team</option>

                      {teams.map((team) => (
                        <option key={team.team_id} value={team.team_id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(team1 || team2) && (
                  <div className="mt-5 rounded-xl border border-pink-400/20 bg-pink-500/10 p-4 text-center">
                    <p className="text-sm uppercase tracking-widest text-pink-300">
                      Current Matchup
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {team1 || "Team 1"}
                      <span className="mx-3 text-zinc-500">vs</span>
                      {team2 || "Team 2"}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">Hypothetical Team Strength Assumptions</h2>
                <p className="mt-2 text-sm text-zinc-400">Enter all ten assumptions from 0 to 100. These are hypothetical inputs, not historical ratings.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">{(["team1","team2"] as const).map((side,index)=><div key={side} className="space-y-4">{strengthFields.map(f=>{const key:StrengthKey=`${side}_${f}`,label=`Team ${index+1} ${f.replace("_"," ")}`;return <label key={key} className="block font-medium text-zinc-200">{label}<input aria-label={label} type="number" min={0} max={100} step="any" required value={strengths[key]??""} onChange={e=>setStrengths(previous=>({...previous,[key]:e.target.value}))} className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"/></label>;})}</div>)}</div>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">
                  Match <span className="text-pink-400">Scenario</span>
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Enter the current minute and score of the match.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <StatInput
                    label="Minute"
                    value={minute}
                    setValue={setMinute}
                    max={120}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Score`}
                    value={team1Score}
                    setValue={setTeam1Score}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Score`}
                    value={team2Score}
                    setValue={setTeam2Score}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-white/15 bg-black/60 p-6 shadow-lg">
                <h2 className="text-2xl font-semibold">
                  Match <span className="text-pink-400">Statistics</span>
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Add the current match statistics used by the prediction model.
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <StatInput
                    label={`${team1 || "Team 1"} Possession %`}
                    value={team1Possession}
                    setValue={setTeam1Possession}
                    max={100}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Possession %`}
                    value={team2Possession}
                    setValue={setTeam2Possession}
                    max={100}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Total Shots`}
                    value={team1TotalShots}
                    setValue={setTeam1TotalShots}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Total Shots`}
                    value={team2TotalShots}
                    setValue={setTeam2TotalShots}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Shots on Target`}
                    value={team1ShotsOnTarget}
                    setValue={setTeam1ShotsOnTarget}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Shots on Target`}
                    value={team2ShotsOnTarget}
                    setValue={setTeam2ShotsOnTarget}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Big Chances`}
                    value={team1BigChances}
                    setValue={setTeam1BigChances}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Big Chances`}
                    value={team2BigChances}
                    setValue={setTeam2BigChances}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Defender Blocks`}
                    value={team1DefenderBlocks}
                    setValue={setTeam1DefenderBlocks}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Defender Blocks`}
                    value={team2DefenderBlocks}
                    setValue={setTeam2DefenderBlocks}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Goalkeeper Saves`}
                    value={team1GoalkeeperSaves}
                    setValue={setTeam1GoalkeeperSaves}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Goalkeeper Saves`}
                    value={team2GoalkeeperSaves}
                    setValue={setTeam2GoalkeeperSaves}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Corners`}
                    value={team1Corners}
                    setValue={setTeam1Corners}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Corners`}
                    value={team2Corners}
                    setValue={setTeam2Corners}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Yellow Cards`}
                    value={team1YellowCards}
                    setValue={setTeam1YellowCards}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Yellow Cards`}
                    value={team2YellowCards}
                    setValue={setTeam2YellowCards}
                  />

                  <StatInput
                    label={`${team1 || "Team 1"} Red Cards`}
                    value={team1RedCards}
                    setValue={setTeam1RedCards}
                    max={11}
                  />

                  <StatInput
                    label={`${team2 || "Team 2"} Red Cards`}
                    value={team2RedCards}
                    setValue={setTeam2RedCards}
                    max={11}
                  />
                </div>
              </section>

              {error && (
                <p className="rounded-xl border border-red-400/30 bg-red-500/20 p-4 font-medium text-red-200">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-4">
                {savedScenario && <button type="button" disabled={loading||patchUncertain} onClick={()=>void updateScenario()} className="rounded-xl border border-white/20 bg-black/50 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50">Save scenario changes</button>}
                <button
                  type="submit"
                  disabled={loading || catalogLoading || !!catalogError || teams.length < 2}
                  className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Generating Preview..." : "Generate Preview →"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl border border-white/20 bg-black/50 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </fieldset>
            </form>

            {prediction && (
              <section className="mt-8 rounded-2xl border border-pink-400/30 bg-black/70 p-6 shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-400">
                  Prediction Result
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {prediction.team1}
                  <span className="mx-3 text-zinc-500">vs</span>
                  {prediction.team2}
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <ProbabilityCard
                    label={prediction.team1}
                    value={percent(prediction.probabilities.team1)}
                  />

                  <ProbabilityCard
                    label="Draw"
                    value={percent(prediction.probabilities.draw)}
                  />

                  <ProbabilityCard
                    label={prediction.team2}
                    value={percent(prediction.probabilities.team2)}
                  />
                </div>

                {prediction.most_likely_score && (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm uppercase tracking-wider text-zinc-400">
                      Most Likely Score
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {prediction.team1} {prediction.most_likely_score[0]}
                      <span className="mx-3 text-zinc-500">–</span>
                      {prediction.most_likely_score[1]} {prediction.team2}
                    </p>
                  </div>
                )}

                {prediction.expected_goals_remaining && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-zinc-400">
                        {prediction.team1} Expected Goals Remaining
                      </p>

                      <p className="mt-1 text-2xl font-bold text-pink-400">
                        {prediction.expected_goals_remaining.team1.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-zinc-400">
                        {prediction.team2} Expected Goals Remaining
                      </p>

                      <p className="mt-1 text-2xl font-bold text-pink-400">
                        {prediction.expected_goals_remaining.team2.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {prediction.confidence && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-400">Confidence</p>

                    <p className="mt-1 text-xl font-bold">
                      {prediction.confidence.label} —{" "}
                      {prediction.confidence.percent.toFixed(1)}%
                    </p>
                  </div>
                )}

                {prediction.reasoning &&
                  prediction.reasoning.length > 0 && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="font-semibold text-pink-400">
                        Prediction Reasoning
                      </p>

                      <ul className="mt-3 space-y-2 text-zinc-300">
                        {prediction.reasoning.map((reason, index) => (
                          <li key={`${reason}-${index}`}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatInput({
  label,
  value,
  setValue,
  max = 1000,
}: {
  label: string;
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium text-zinc-200">
        {label}
      </label>

      <input
        type="number"
        aria-label={label}
        required
        step={label.includes("Possession")?"any":1}
        min="0"
        max={max}
        value={Number.isNaN(value)?"":value}
        onChange={(event) => setValue(event.target.value===""?NaN:Number(event.target.value))}
        className="w-full rounded-lg border border-white/20 bg-black/75 p-3 text-white outline-none transition focus:border-pink-400"
      />
    </div>
  );
}

function ProbabilityCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-pink-400/20 bg-pink-500/10 p-5 text-center">
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="mt-2 text-3xl font-bold text-pink-400">
        {value}
      </p>
    </div>
  );
}
