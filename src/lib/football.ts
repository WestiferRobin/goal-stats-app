/** Shared historical catalog contracts. No networking or prediction calculations. */
export type Team = {
  team_id: number;
  name: string;
  category: string;
  offense: number | null;
  defense: number | null;
  form: number | null;
  star_power: number | null;
  clutch: number | null;
  fifa_rank: number | null;
  ranking_date: string | null;
  prediction_ready: false;
};
export type Competition = {
  competition_id: number;
  name: string;
  edition_label: string;
  category: string;
};
export type HistoryMatch = {
  match_id: number;
  match_date: string;
  competition_id: number;
  competition_name: string;
  edition_label: string;
  home_team_id: number;
  home_team_name: string;
  away_team_id: number;
  away_team_name: string;
  home_score: number;
  away_score: number;
  score_basis: string;
  neutral: boolean | null;
  city: string | null;
  country: string | null;
};
export type InsightsResponse = {
  source: "approved_historical_results";
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team2_name: string;
  head_to_head: HistoryMatch[];
  team1_history: HistoryMatch[];
  team2_history: HistoryMatch[];
  limit: number;
  offset: number;
  order: "match_date_asc_match_id_asc";
};
export function isCatalogId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid catalog response.");
  return value as Record<string, unknown>;
}
function requireFields(value: unknown, fields: Record<string, (value: unknown) => boolean>) {
  const row = object(value);
  if (!Object.entries(fields).every(([key, check]) => check(row[key]))) throw new Error("Invalid catalog response.");
}
const string = (value: unknown) => typeof value === "string";
const count = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0;
const nullableString = (value: unknown) => value === null || string(value);
const nullableRating = (value: unknown) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
function rows<T>(value: unknown, check: (row: unknown) => void): T[] {
  if (!Array.isArray(value)) throw new Error("Invalid catalog response.");
  value.forEach(check);
  return value as T[];
}
export function parseTeams(value: unknown): Team[] {
  return rows<Team>(value, row => requireFields(row, {
    team_id: isCatalogId, name: string, category: string,
    offense: nullableRating, defense: nullableRating, form: nullableRating,
    star_power: nullableRating, clutch: nullableRating,
    fifa_rank: value => value === null || isCatalogId(value),
    ranking_date: value => value === null || date(value), prediction_ready: value => value === false,
  }));
}
export function parseCompetitions(value: unknown): Competition[] {
  return rows<Competition>(value, row => requireFields(row, {
    competition_id: isCatalogId, name: string, edition_label: string, category: string,
  }));
}
export function parseMatches(value: unknown): HistoryMatch[] {
  return rows<HistoryMatch>(value, row => requireFields(row, {
    match_id: isCatalogId, match_date: date, competition_id: isCatalogId,
    competition_name: string, edition_label: string,
    home_team_id: isCatalogId, home_team_name: string, away_team_id: isCatalogId, away_team_name: string,
    home_score: count, away_score: count, score_basis: string,
    neutral: value => value === null || typeof value === "boolean", city: nullableString, country: nullableString,
  }));
}
export function parseInsights(value: unknown): InsightsResponse {
  requireFields(value, {
    source: value => value === "approved_historical_results",
    team1_id: isCatalogId, team2_id: isCatalogId, team1_name: string, team2_name: string,
    limit: value => count(value) && Number(value) >= 1 && Number(value) <= 200,
    offset: count, order: value => value === "match_date_asc_match_id_asc",
  });
  const row = object(value);
  parseMatches(row.head_to_head);
  parseMatches(row.team1_history);
  parseMatches(row.team2_history);
  return value as InsightsResponse;
}

export const strengthFields = ["offense","defense","form","star_power","clutch"] as const;
export const statFields = ["goals","possession","shots","shots_on_target","big_chances","defender_blocks","goalkeeper_saves","corners","yellow_cards","red_cards"] as const;
type Side = "team1" | "team2";
export type StrengthKey = `${Side}_${typeof strengthFields[number]}`;
export type TeamStats = Record<typeof statFields[number],number>;
export type ScenarioInput = Record<StrengthKey | `${Side}_${typeof statFields[number]}` | `${Side}_modifier_total`,number> & {team1_id:number;team2_id:number;match_minute:number;team1_fifa_rank:number|null;team2_fifa_rank:number|null;title?:string|null;match_id?:number|null};
export type PreviewInput = ScenarioInput & {extra_minute:number;status:string};
export type ScenarioRecord = ScenarioInput & {scenario_id:number;created_at:string;team1_name:string;team2_name:string;prediction_ready:true};
type Pair = {team1:number;team2:number};
export type PredictionOutput = {team1:string;team2:string;minute:number;status:string;model:string;probabilities:Pair&{draw:number};advancement:Pair;expected_goals_remaining:Pair;momentum_percent:Pair;most_likely_score:[number,number];top_scorelines:{team1_goals:number;team2_goals:number;probability:number}[];confidence:{label:string;percent:number};reasoning:string[]};
// Preserve the existing optional events presentation; the approved parser never fabricates events.
export type PredictionPresentation = PredictionOutput & {events?:{minute:number|string;team:string;type:string;detail:string}[]};
export type SavedPrediction = {prediction_id:number;scenario_id:number;generated_at:string;model_version:string;input_snapshot:ScenarioRecord & {adapter_version:"scenario-v1";extra_minute:0;status:""};output:PredictionOutput};
export type ScenarioDisplay = {team1:string;team2:string;minute:number;extra_minute:number;status:string;team1_stats:TeamStats;team2_stats:TeamStats;input:ScenarioInput};
export type PredictionView = {prediction:PredictionPresentation;scenario:ScenarioDisplay;saved:SavedPrediction|null};
export type PreviewSession = {version:2;kind:"preview";input:PreviewInput;output:PredictionOutput};
export const previewStorageKey = "goalstats-current-prediction";
const finiteRange=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
const integerRange=(v:unknown,max:number)=>finiteRange(v,0,max)&&Number.isInteger(v);
const timestamp=(v:unknown)=>typeof v==="string"&&!Number.isNaN(Date.parse(v));
export function routeId(value:string|null):number|null {
  if(value===null)return null;
  if(!/^[1-9]\d*$/.test(value)||!isCatalogId(Number(value)))throw new Error("Invalid saved record ID.");
  return Number(value);
}
export function parseScenarioInput(value:unknown):ScenarioInput {
  const row=object(value),input:Record<string,unknown>={};
  if(!isCatalogId(row.team1_id)||!isCatalogId(row.team2_id)||row.team1_id===row.team2_id)throw new Error("Select two different catalog teams.");
  if(!integerRange(row.match_minute,120))throw new Error("Match minute must be an integer from 0 to 120.");
  input.team1_id=row.team1_id;input.team2_id=row.team2_id;input.match_minute=row.match_minute;
  for(const side of ["team1","team2"] as const){
    for(const field of statFields){const key=`${side}_${field}`;if(!(field==="possession"?finiteRange(row[key],0,100):integerRange(row[key],field==="red_cards"?11:1000)))throw new Error(`Invalid ${key}.`);input[key]=row[key];}
    for(const field of strengthFields){const key=`${side}_${field}`;if(!finiteRange(row[key],0,100))throw new Error("Enter all ten hypothetical strength assumptions as numbers from 0 to 100.");input[key]=row[key];}
    const rank=row[`${side}_fifa_rank`]??null;if(rank!==null&&!isCatalogId(rank))throw new Error("Ranks must be positive integers or null.");input[`${side}_fifa_rank`]=rank;
    const modifier=row[`${side}_modifier_total`]===undefined?0:row[`${side}_modifier_total`];if(!finiteRange(modifier,-3000,3000))throw new Error("Modifier totals must be between -3000 and 3000.");input[`${side}_modifier_total`]=modifier;
  }
  if(Math.abs(Number(input.team1_possession)+Number(input.team2_possession)-100)>0.01)throw new Error("Team possession must total 100% (within 0.01).");
  if(row.title!==undefined){if(row.title!==null&&(typeof row.title!=="string"||row.title.length<1||row.title.length>120))throw new Error("Invalid scenario title.");input.title=row.title;}
  if(row.match_id!==undefined){if(row.match_id!==null&&!isCatalogId(row.match_id))throw new Error("Invalid historical match ID.");input.match_id=row.match_id;}
  return input as ScenarioInput;
}
export function previewInput(value:unknown):PreviewInput {
  const row=object(value),input=parseScenarioInput(row),extra=row.extra_minute===undefined?0:row.extra_minute,status=row.status===undefined?"":row.status;
  if(!integerRange(extra,30)||typeof status!=="string"||status.length>10)throw new Error("Invalid extra minute or status.");
  const {title,match_id,...state}=input;void title;void match_id;return {...state,extra_minute:extra as number,status};
}
export function parseScenario(value:unknown):ScenarioRecord {
  const input=parseScenarioInput(value),row=object(value);
  if(!isCatalogId(row.scenario_id)||!timestamp(row.created_at)||!string(row.team1_name)||!string(row.team2_name)||row.prediction_ready!==true)throw new Error("Invalid saved scenario response.");
  return {...input,scenario_id:row.scenario_id,created_at:row.created_at as string,team1_name:row.team1_name as string,team2_name:row.team2_name as string,prediction_ready:true};
}
export function parseScenarios(value:unknown):ScenarioRecord[]{if(!Array.isArray(value))throw new Error("Invalid scenario list.");return value.map(parseScenario);}
export function parsePredictionOutput(value:unknown):PredictionOutput {
  const row=object(value);for(const key of ["team1","team2","status","model"])if(!string(row[key]))throw new Error("Invalid prediction metadata.");
  if(!(row.model as string).trim()||!integerRange(row.minute,150))throw new Error("Invalid prediction metadata.");
  const pair=(key:string,max:number):Pair=>{const p=object(row[key]);if(!finiteRange(p.team1,0,max)||!finiteRange(p.team2,0,max))throw new Error(`Invalid ${key}.`);return {team1:p.team1 as number,team2:p.team2 as number};};
  const probs=object(row.probabilities),p=pair("probabilities",1);if(!finiteRange(probs.draw,0,1)||Math.abs(p.team1+p.team2+Number(probs.draw)-1)>1e-9)throw new Error("Invalid outcome probabilities.");
  const confidence=object(row.confidence);if(!finiteRange(confidence.percent,0,100)||!string(confidence.label))throw new Error("Invalid confidence.");
  if(!Array.isArray(row.most_likely_score)||row.most_likely_score.length!==2||!row.most_likely_score.every(v=>integerRange(v,32767)))throw new Error("Invalid predicted score.");
  if(!Array.isArray(row.reasoning)||!row.reasoning.every(string)||!Array.isArray(row.top_scorelines))throw new Error("Invalid prediction explanation.");
  const top_scorelines=row.top_scorelines.map(value=>{const s=object(value);if(!integerRange(s.team1_goals,32767)||!integerRange(s.team2_goals,32767)||!finiteRange(s.probability,0,1))throw new Error("Invalid scoreline.");return {team1_goals:s.team1_goals as number,team2_goals:s.team2_goals as number,probability:s.probability as number};});
  return {team1:row.team1 as string,team2:row.team2 as string,minute:row.minute as number,status:row.status as string,model:row.model as string,probabilities:{...p,draw:probs.draw as number},advancement:pair("advancement",1),expected_goals_remaining:pair("expected_goals_remaining",Number.MAX_VALUE),momentum_percent:pair("momentum_percent",100),most_likely_score:row.most_likely_score as [number,number],confidence:{label:confidence.label as string,percent:confidence.percent as number},reasoning:row.reasoning as string[],top_scorelines};
}
export function parseSavedPrediction(value:unknown):SavedPrediction {
 const row=object(value),input=parseScenario(row.input_snapshot),raw=object(row.input_snapshot),output=parsePredictionOutput(row.output);
 if(!isCatalogId(row.prediction_id)||!isCatalogId(row.scenario_id)||input.scenario_id!==row.scenario_id||!timestamp(row.generated_at)||row.model_version!==output.model||raw.adapter_version!=="scenario-v1"||raw.extra_minute!==0||raw.status!==""||output.minute!==input.match_minute||output.team1!==input.team1_name||output.team2!==input.team2_name)throw new Error("Invalid saved prediction response.");
 return {prediction_id:row.prediction_id,scenario_id:row.scenario_id,generated_at:row.generated_at as string,model_version:output.model,input_snapshot:{...input,adapter_version:"scenario-v1",extra_minute:0,status:""},output};
}
export function parsePredictionHistory(value:unknown,scenarioId:number):SavedPrediction[]{if(!Array.isArray(value))throw new Error("Invalid prediction history.");return value.map(v=>{const r=parseSavedPrediction(v);if(r.scenario_id!==scenarioId)throw new Error("Prediction belongs to another scenario.");return r;});}
export function displayScenario(input:ScenarioInput,team1:string,team2:string,extra_minute=0,status=""):ScenarioDisplay {
 const stats=(side:Side)=>Object.fromEntries(statFields.map(f=>[f,input[`${side}_${f}`]])) as TeamStats;
 return {team1,team2,minute:input.match_minute,extra_minute,status,team1_stats:stats("team1"),team2_stats:stats("team2"),input};
}
export function savedPredictionView(record:SavedPrediction):PredictionView{return {prediction:record.output,scenario:displayScenario(record.input_snapshot,record.input_snapshot.team1_name,record.input_snapshot.team2_name),saved:record};}
export function parsePreviewSession(value:unknown):PreviewSession {const row=object(value);if(row.version!==2||row.kind!=="preview")throw new Error("This stored preview uses an obsolete format. Generate a new preview.");const input=previewInput(row.input),output=parsePredictionOutput(row.output);if(output.minute!==input.match_minute)throw new Error("Preview inputs do not match its output.");return {version:2,kind:"preview",input,output};}
export function previewPredictionView(session:PreviewSession):PredictionView{return {prediction:session.output,scenario:displayScenario(session.input,session.output.team1,session.output.team2,session.input.extra_minute,session.input.status),saved:null};}
export function scenarioPatch(before:ScenarioInput,after:ScenarioInput):Partial<ScenarioInput>{
 for(const key of ["team1_id","team2_id","title","match_id",...(["team1","team2"] as const).flatMap(side=>[`${side}_fifa_rank`,...strengthFields.map(f=>`${side}_${f}`)])] as (keyof ScenarioInput)[])if((before[key]??null)!==(after[key]??null))throw new Error("Teams and strength assumptions cannot be changed on a saved scenario. Generate a preview and explicitly save a new scenario instead.");
 const patch:Record<string,number>={};for(const key of ["match_minute",...(["team1","team2"] as const).flatMap(side=>[`${side}_modifier_total`,...statFields.map(f=>`${side}_${f}`)])] as (keyof ScenarioInput)[])if(before[key]!==after[key])patch[key]=after[key] as number;return patch;
}
