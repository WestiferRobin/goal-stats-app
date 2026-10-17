import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import AnalyticsView from "./analytics-view";
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

afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();sessionStorage.clear();window.history.replaceState(null,'','/analytics');});
function backend(records:unknown[]=[saved]){const fetch=vi.fn(async(url:string)=>Response.json(url.includes('/catalog/teams')?[]:url.includes('/predictions?')?records:saved));vi.stubGlobal('fetch',fetch);return fetch;}
it("renders stored output and immutable inputs with generation timestamps",async()=>{
 const fetch=backend();window.history.replaceState(null,'','/analytics?prediction_id=9');render(<AnalyticsView/>);await screen.findByText(/Saved prediction #9/);expect(screen.getByText(/Saved Hypothetical Scenario Revisions/)).toBeTruthy();expect(screen.getAllByText(/60\.0%/).length).toBeGreaterThan(0);expect(screen.getAllByText(/65/).length).toBeGreaterThan(0);expect(screen.getByText(/explicit strengths for every participant/)).toBeTruthy();expect((screen.getByRole('button',{name:'Run Monte Carlo Simulation'}) as HTMLButtonElement).disabled).toBe(true);expect(fetch.mock.calls.every(([u])=>!u.includes('snapshots')&&!u.includes('backtests'))).toBe(true);
});
it("supports validated unsaved previews with no fake saved history",async()=>{
 const fetch=backend([]);sessionStorage.setItem('goalstats-current-prediction',JSON.stringify(preview));render(<AnalyticsView/>);await screen.findByText(/Unsaved hypothetical preview/);expect(fetch.mock.calls.every(([u])=>u.includes('/catalog/teams'))).toBe(true);
});
it("shows an empty scenario without manufacturing output",async()=>{
 backend([]);window.history.replaceState(null,'','/analytics?scenario_id=7');render(<AnalyticsView/>);await screen.findByText(/no saved predictions yet/);expect(screen.getByRole('link',{name:'Browse saved predictions'})).toBeTruthy();
});
it("paginates and reverses generation order, independent of match minute",async()=>{
 const later={...saved,prediction_id:10,generated_at:'2026-10-17T12:00:00Z',input_snapshot:{...saved.input_snapshot,match_minute:60},output:{...output,minute:60}};
 const fetch=vi.fn(async(url:string)=>Response.json(url.includes('/catalog/')?[]:url.includes('offset=50')?[]:url.includes('/predictions?')?[later,...Array.from({length:49},(_,i)=>({...saved,prediction_id:i+20}))]:saved));vi.stubGlobal('fetch',fetch);window.history.replaceState(null,'','/analytics?prediction_id=9');render(<AnalyticsView/>);await screen.findByText(/Saved prediction #9/);await waitFor(()=>expect((screen.getByRole('button',{name:'Next predictions'}) as HTMLButtonElement).disabled).toBe(false));const chart=screen.getByRole('heading',{name:'Probability History'}).closest('section')!;const minutes=within(chart).getAllByText(/^(65|60)'$/).map(e=>e.textContent);expect(minutes[0]).toBe("65'");expect(minutes[minutes.length-1]).toBe("60'");fireEvent.click(screen.getByRole('button',{name:'Next predictions'}));await screen.findByText('Prediction page 2');expect(fetch.mock.calls.some(([u])=>u.includes('offset=50'))).toBe(true);
});
it("rejects prototype session state and handles retrieval failure",async()=>{
 backend();sessionStorage.setItem('goalstats-current-prediction','{}');render(<AnalyticsView/>);await screen.findByText(/obsolete format/);cleanup();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({detail:'Not found'},{status:404})));window.history.replaceState(null,'','/analytics?prediction_id=9');render(<AnalyticsView/>);await screen.findByText('Not found');
});
