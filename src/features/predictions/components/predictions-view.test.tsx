import React from "react";
import {beforeEach,afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import PredictionsView from "./predictions-view";
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

beforeEach(()=>{window.history.replaceState(null,"","/predictions");});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();sessionStorage.clear();});
function backend(write?:(url:string,options:RequestInit)=>Promise<Response>){const fetch=vi.fn(async(url:string,options:RequestInit={})=>{
 if(options.method)return write?write(url,options):Response.json({}, {status:500});
 if(url.startsWith('/api/football/scenarios?'))return Response.json([scenario]);
 if(url==='/api/football/scenarios/7')return Response.json({...scenario,match_minute:75});
 if(url.startsWith('/api/football/scenarios/7/predictions?'))return Response.json([saved]);
 if(url==='/api/football/predictions/9')return Response.json(saved);
 return Response.json({detail:'Not found'},{status:404});
});vi.stubGlobal('fetch',fetch);return fetch;}
function previewMount(){sessionStorage.setItem('goalstats-current-prediction',JSON.stringify(preview));render(<PredictionsView/>);}
it("creates a scenario then generates bodylessly and retains saved IDs",async()=>{
 const fetch=backend(async url=>Response.json(url==='/api/football/scenarios'?scenario:saved,{status:201}));previewMount();fireEvent.click(await screen.findByRole('button',{name:'Save new scenario and prediction'}));await screen.findByText('Prediction #9 saved for scenario #7.');const writes=fetch.mock.calls.filter(([,o])=>o?.method);expect(writes).toHaveLength(2);expect(JSON.parse(writes[0][1]!.body as string)).toEqual(input);expect(writes[1]).toEqual(['/api/football/scenarios/7/predictions',{method:'POST'}]);expect(window.location.search).toBe('?prediction_id=9');expect(sessionStorage.getItem('goalstats-pending-save')).toBeNull();
});
it("retains scenario identity after rejected generation and retries only generation",async()=>{
 let fail=true;const fetch=backend(async url=>url==='/api/football/scenarios'?Response.json(scenario,{status:201}):fail?Response.json({detail:'Rejected'},{status:400}):Response.json(saved,{status:201}));previewMount();fireEvent.click(await screen.findByRole('button',{name:'Save new scenario and prediction'}));await screen.findByText(/Scenario #7 is retained/);expect(window.location.search).toBe('?scenario_id=7');fail=false;fireEvent.click(screen.getByRole('button',{name:'Generate another saved prediction'}));await screen.findByText('Prediction #9 saved for scenario #7.');expect(fetch.mock.calls.filter(([url,o])=>url==='/api/football/scenarios'&&o?.method)).toHaveLength(1);
});
it("marks generation uncertainty, reads history and never retries automatically",async()=>{
 const fetch=backend(async url=>url==='/api/football/scenarios'?Response.json(scenario,{status:201}):Response.json({detail:'Timed out'},{status:504}));previewMount();fireEvent.click(await screen.findByRole('button',{name:'Save new scenario and prediction'}));await screen.findByText(/Generation outcome is uncertain/);await waitFor(()=>expect(fetch.mock.calls.some(([u])=>u.includes('/7/predictions?'))).toBe(true));expect((screen.getByRole('button',{name:'Generate another saved prediction'}) as HTMLButtonElement).disabled).toBe(true);expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(2);
});
it("keeps creation uncertainty across refresh and offers discovery without POST",async()=>{
 const fetch=backend(async()=>{throw new Error('Network unavailable')});previewMount();fireEvent.click(await screen.findByRole('button',{name:'Save new scenario and prediction'}));await screen.findByText(/Creation outcome is uncertain/);cleanup();render(<PredictionsView/>);await screen.findByText(/A scenario creation may have completed/);expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(1);expect(screen.getByRole('link',{name:'Open predictions for scenario #7'})).toBeTruthy();
});
it("directly retrieves immutable saved output without session storage or writes",async()=>{
 const fetch=backend();window.history.replaceState(null,'','/predictions?prediction_id=9');vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('Storage disabled')});render(<PredictionsView/>);await screen.findByText(/Saved prediction #9/);expect(screen.getByText('Minute 65')).toBeTruthy();expect(screen.queryByText('Minute 75')).toBeNull();expect(screen.getByText(/test-model/)).toBeTruthy();expect(fetch.mock.calls.every(([,o])=>!o?.method)).toBe(true);
});
it("discovers scenarios with no preview and opens a prediction by GET",async()=>{
 const fetch=backend();window.history.replaceState(null,'','/predictions?scenario_id=7');vi.spyOn(window,'scrollTo').mockImplementation(()=>{});render(<PredictionsView/>);fireEvent.click(await screen.findByRole('button',{name:/Open prediction #9/}));await screen.findByText(/Saved prediction #9/);expect(window.location.search).toBe('?prediction_id=9');expect(fetch.mock.calls.every(([,o])=>!o?.method)).toBe(true);
});
it("rejects obsolete storage and invalid durable IDs",async()=>{
 const fetch=backend();sessionStorage.setItem('goalstats-current-prediction',JSON.stringify({scenario:input,prediction:output}));render(<PredictionsView/>);await screen.findByText(/obsolete format/);cleanup();window.history.replaceState(null,'','/predictions?prediction_id=0');render(<PredictionsView/>);await screen.findByText('Invalid saved record ID.');expect(fetch.mock.calls.some(([u])=>u.endsWith('/predictions/0'))).toBe(false);
});
it("preserves preview on validation failure without generating",async()=>{
 const fetch=backend(async()=>Response.json({detail:'Invalid inputs'},{status:400}));previewMount();fireEvent.click(await screen.findByRole('button',{name:'Save new scenario and prediction'}));await screen.findByText(/Invalid inputs.*preview is preserved/);expect(sessionStorage.getItem('goalstats-current-prediction')).toBe(JSON.stringify(preview));expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(1);
});
it("paginates scenario discovery and scenario-scoped history",async()=>{
 const fetch=vi.fn(async(url:string)=>{const offset=new URL(url,'http://localhost').searchParams.get('offset');if(url.includes('/7/predictions?'))return Response.json(offset==='50'?[]:Array.from({length:50},(_,i)=>({...saved,prediction_id:i+1})));if(url.includes('/scenarios?'))return Response.json(offset==='50'?[]:Array.from({length:50},(_,i)=>({...scenario,scenario_id:i+1})));return Response.json(scenario);});vi.stubGlobal('fetch',fetch);window.history.replaceState(null,'','/predictions?scenario_id=7');render(<PredictionsView/>);await screen.findByRole('button',{name:/Open prediction #50/});fireEvent.click(screen.getByRole('button',{name:'Next predictions'}));await screen.findByText('Prediction page 2');fireEvent.click(screen.getByRole('button',{name:'Next scenarios'}));await screen.findByText('Scenario page 2');expect(fetch.mock.calls.some(([u])=>u.includes('/7/predictions?limit=50&offset=50'))).toBe(true);expect(fetch.mock.calls.some(([u])=>u.includes('/scenarios?limit=50&offset=50'))).toBe(true);
});
