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
