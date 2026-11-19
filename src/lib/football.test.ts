import { expect, it } from "vitest";
import { isCatalogId, parseTeams, parseCompetitions, parseMatches, parseInsights } from "./football";

it("accepts normalized IDs only", () => {
  for (const value of [1, 2147483647]) expect(isCatalogId(value)).toBe(true);
  for (const value of [0, -1, 1.1, 2147483648, "1", null, NaN]) expect(isCatalogId(value)).toBe(false);
});
it("preserves null ratings and rejects prototype teams", () => {
  const team = {team_id:8,name:"United States",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false};
  expect(parseTeams([team])).toEqual([team]);
  expect(() => parseTeams([{name:"United States"}])).toThrow();
  expect(() => parseTeams([{...team,team_id:"8"}])).toThrow();
  expect(() => parseTeams([{...team,offense:NaN}])).toThrow();
});
it("uses edition_label and preserves home/away metadata", () => {
  const competition={competition_id:1,name:"FIFA Women's World Cup",edition_label:"1991",category:"women_senior_national"};
  expect(parseCompetitions([competition])).toEqual([competition]);
  expect(() => parseCompetitions([{...competition,edition_label:undefined,edition:"1991"}])).toThrow();
  const match={match_id:1,competition_id:1,competition_name:competition.name,edition_label:"1991",match_date:"1991-11-16",home_team_id:1,away_team_id:2,home_team_name:"China",away_team_name:"Norway",home_score:4,away_score:0,score_basis:"including_extra_time_no_shootout",neutral:false,city:null,country:null};
  expect(parseMatches([match])).toEqual([match]);
  expect(() => parseMatches([{...match,home_score:"4"}])).toThrow();
  expect(parseInsights({source:"approved_historical_results",team1_id:2,team2_id:1,team1_name:"Norway",team2_name:"China",head_to_head:[match],team1_history:[],team2_history:[],limit:50,offset:0,order:"match_date_asc_match_id_asc"}).head_to_head[0]).toEqual(match);
});
it("accepts empty lists but rejects malformed responses", () => {
  for (const parse of [parseTeams,parseCompetitions,parseMatches]) {
    expect(parse([])).toEqual([]);
    expect(() => parse({items:[]})).toThrow();
    expect(() => parse([null])).toThrow();
  }
  expect(() => parseInsights({head_to_head:[]})).toThrow();
});

import {parseScenarioInput,previewInput,parsePreviewSession,parseSavedPrediction,scenarioPatch,routeId,strengthFields,statFields} from "./football";
const input = {
  team1_id:1,team2_id:2,match_minute:65,
  team1_goals:1,team1_possession:60,team1_shots:8,team1_shots_on_target:4,team1_big_chances:0,team1_defender_blocks:0,team1_goalkeeper_saves:0,team1_corners:0,team1_yellow_cards:0,team1_red_cards:0,
  team2_goals:0,team2_possession:40,team2_shots:5,team2_shots_on_target:2,team2_big_chances:0,team2_defender_blocks:0,team2_goalkeeper_saves:0,team2_corners:0,team2_yellow_cards:0,team2_red_cards:0,
  team1_offense:70,team1_defense:71,team1_form:72,team1_star_power:73,team1_clutch:74,
  team2_offense:60,team2_defense:61,team2_form:62,team2_star_power:63,team2_clutch:64,
  team1_fifa_rank:null,team2_fifa_rank:null,team1_modifier_total:0,team2_modifier_total:0,
};
const output = {
  team1:"China",team2:"Norway",minute:65,status:"",model:"test-model",
  probabilities:{team1:.6,draw:.25,team2:.15},advancement:{team1:.75,team2:.25},
  expected_goals_remaining:{team1:.8,team2:.4},momentum_percent:{team1:60,team2:40},
  most_likely_score:[2,0],top_scorelines:[{team1_goals:2,team2_goals:0,probability:.3}],
  confidence:{label:"Medium",percent:55},reasoning:["Synthetic model explanation"],
};
const scenario = {...input,scenario_id:7,created_at:"2026-10-01T10:00:00Z",team1_name:"China",team2_name:"Norway",title:"Synthetic test scenario",match_id:null,prediction_ready:true};
const saved = {prediction_id:9,scenario_id:7,generated_at:"2026-10-16T12:00:00Z",model_version:"test-model",input_snapshot:{...scenario,adapter_version:"scenario-v1",extra_minute:0,status:""},output};
const preview = {version:2,kind:"preview",input:{...input,extra_minute:0,status:""},output};

it("validates every explicit strength, count, ID and optional field",()=>{
 expect(parseScenarioInput(input)).toEqual(input);
 for(const side of ['team1','team2']){
  for(const f of strengthFields)for(const value of [undefined,null,NaN,Infinity,-1,101,'70'])expect(()=>parseScenarioInput({...input,[`${side}_${f}`]:value})).toThrow();
  for(const f of statFields)for(const value of [NaN,-1,'1',f==='possession'?101:f==='red_cards'?12:1001])expect(()=>parseScenarioInput({...input,[`${side}_${f}`]:value})).toThrow();
 }
 for(const value of [-1,121,0.5,'65'])expect(()=>parseScenarioInput({...input,match_minute:value})).toThrow();
 expect(()=>parseScenarioInput({...input,team2_id:1})).toThrow();expect(()=>parseScenarioInput({...input,team1_modifier_total:3001})).toThrow();expect(()=>parseScenarioInput({...input,team1_fifa_rank:0})).toThrow();expect(()=>parseScenarioInput({...input,team1_possession:61})).toThrow();
});
it("separates preview metadata from create payload and validates session version",()=>{
 expect(previewInput({...scenario,extra_minute:0,status:''})).toEqual(preview.input);expect(parseScenarioInput(preview.input)).toEqual(input);expect(parsePreviewSession(preview)).toEqual(preview);expect(()=>parsePreviewSession({scenario:input,prediction:output})).toThrow();expect(()=>parsePreviewSession({...preview,output:{...output,probabilities:{team1:60,draw:25,team2:15}}})).toThrow();
});
it("preserves stored snapshots and rejects mismatched saved metadata",()=>{
 const record=parseSavedPrediction(saved);expect(record.input_snapshot.match_minute).toBe(65);expect(record.generated_at).toBe(saved.generated_at);expect(record.output.momentum_percent.team1).toBe(60);for(const value of [{...saved,scenario_id:8},{...saved,model_version:'other'},{...saved,output:{...output,minute:75}}])expect(()=>parseSavedPrediction(value)).toThrow();
});
it("PATCHes only changed state and rejects immutable changes",()=>{
 expect(scenarioPatch(input,{...input,match_minute:75})).toEqual({match_minute:75});expect(scenarioPatch(input,input)).toEqual({});expect(()=>scenarioPatch(input,{...input,team1_offense:80})).toThrow();expect(()=>scenarioPatch(input,{...input,team1_id:3})).toThrow();
});
it("rejects noncanonical saved IDs",()=>{expect(routeId(null)).toBeNull();expect(routeId('2147483647')).toBe(2147483647);for(const value of ['0','-1','01','1.1','abc','2147483648',''])expect(()=>routeId(value)).toThrow();});
it('retains supplied shots and rejects nonnumeric values without normalization',()=>{
 const original={...input,team1_shots:0,team1_shots_on_target:4};expect(()=>previewInput(original)).toThrow('Team 1 shots on target cannot exceed total shots.');expect(()=>scenarioPatch(input,original)).toThrow('shots on target');
 for(const value of [NaN,Infinity,'abc',-1,0.5])expect(()=>parseScenarioInput({...input,team1_shots:value})).toThrow();
});
it.each(['road-to-the-final-heuristic-v1','road-to-the-final-heuristic-v2'])('preserves %s snapshot outputs without recalculation',model=>{
 const record={...saved,model_version:model,output:{...output,model}};expect(parseSavedPrediction(record)).toEqual(record);
});

// Frozen pre-v2 response from backend d8d7452 tests/unit/services/test_prediction.py.
import frozenV1 from './fixtures/frozen-v1-prediction.json';
it('reads the actual frozen v1 contract without rewriting its output or assumptions',()=>{
 const before=JSON.stringify(frozenV1);expect(parseSavedPrediction(frozenV1)).toEqual(frozenV1);expect(JSON.stringify(frozenV1)).toBe(before);
});

import v2Cases from './fixtures/backend-v2-predictions.json';
import {parsePredictionOutput, parsePredictionHistory} from './football';
it.each(v2Cases)('preserves real backend v2 output and effective snapshot at minute $minute', fixture => {
 const before = JSON.stringify(fixture);
 expect(parsePredictionOutput(fixture.output)).toEqual(fixture.output);
 expect(parseSavedPrediction(fixture.saved)).toEqual(fixture.saved);
 expect(parsePreviewSession({version:2,kind:'preview',input:{...fixture.request,team1_shots:4},output:fixture.output}).output).toEqual(fixture.output);
 expect(fixture.request.team1_shots).toBe(0);
 expect(fixture.saved.input_snapshot.team1_shots).toBe(4);
 expect(Object.values(fixture.output.probabilities).reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);
 expect(fixture.output.reasoning.some(reason=>reason.includes('Confidence is a heuristic'))).toBe(true);
 if(fixture.minute>=90){
  expect(fixture.output.expected_goals_remaining).toEqual({team1:0,team2:0});
  expect(fixture.output.top_scorelines).toHaveLength(1);
  const home=fixture.request.team1_goals, away=fixture.request.team2_goals;
  expect(fixture.output.probabilities).toEqual({team1:Number(home>away),draw:Number(home===away),team2:Number(home<away)});
  expect(fixture.output.most_likely_score).toEqual([home,away]);
  expect(fixture.output.top_scorelines[0].probability).toBe(1);
  expect(fixture.output.reasoning.some(reason=>reason.includes('summarizes the supplied current score'))).toBe(true);
 } else expect(fixture.output.expected_goals_remaining.team1).toBeGreaterThan(0);
 expect(JSON.stringify(fixture)).toBe(before);
});
it.each([
 {probabilities:{team1:60,draw:25,team2:15}},
 {probabilities:{team1:-.1,draw:.5,team2:.6}},
 {probabilities:{team1:.2,draw:.2,team2:.2}},
 {confidence:{label:'High',percent:101}},
 {expected_goals_remaining:{team1:-1,team2:0}},
 {reasoning:[null]}, {minute:151}, {model:''},
 {top_scorelines:[{team1_goals:1,team2_goals:0,probability:2}]},
])('rejects malformed v2 output %j', changes => {
 expect(()=>parsePredictionOutput({...v2Cases[0].output,...changes})).toThrow();
});
it('preserves a mixed backend v1/v2 history and rejects a foreign scenario',()=>{
 // IDs are envelope metadata, not model outputs.
 const history=[v2Cases[0].saved,{...frozenV1,scenario_id:7,input_snapshot:{...frozenV1.input_snapshot,scenario_id:7}}];
 const before=JSON.stringify(history);
 expect(parsePredictionHistory(history,7)).toEqual(history);
 expect(JSON.stringify(history)).toBe(before);
 expect(()=>parsePredictionHistory(history,8)).toThrow();
});

it.each([[0,4,false],[4,4,true],[4,0,true],[0,0,true],[-1,0,false],[4,-1,false]])('validates shots %s and target %s explicitly', (shots,target,valid)=>{
 for(const side of ['team1','team2']) {
  const body={...input,[`${side}_shots`]:shots,[`${side}_shots_on_target`]:target};
  if(valid)expect(parseScenarioInput(body)).toMatchObject(body);else expect(()=>parseScenarioInput(body)).toThrow();
 }
});
it('reads legacy contradictory saved inputs without applying new write validation',()=>{
 const legacy={...saved,input_snapshot:{...saved.input_snapshot,team1_shots:0,team1_shots_on_target:4}};
 expect(parseSavedPrediction(legacy)).toEqual(legacy);
});
