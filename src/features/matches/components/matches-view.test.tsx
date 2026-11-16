import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MatchesView from "./matches-view";
const push=vi.fn();vi.mock("next/navigation",()=>({useRouter:()=>({push})}));
const teams=[{team_id:1,name:"China",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false},{team_id:2,name:"Norway",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false}];
const competition={competition_id:1,name:"FIFA Women's World Cup",edition_label:"1991",category:"women_senior_national"};
const match={match_id:1,competition_id:1,competition_name:competition.name,edition_label:"1991",match_date:"1991-11-16",home_team_id:1,home_team_name:"China",away_team_id:2,away_team_name:"Norway",home_score:4,away_score:0,score_basis:"including_extra_time_no_shootout",neutral:false,city:"Guangzhou",country:"China"};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();sessionStorage.clear();window.history.replaceState(null,"","/matches");push.mockClear();});
function setup() {
 const fetch=vi.fn(async(url:string)=>{
  if(url.endsWith("/teams")) return Response.json(teams);
  if(url.endsWith("/competitions")) return Response.json([competition]);
  const params=new URL(url,"http://localhost").searchParams;
  return Response.json(params.get("offset")==="50"?[]:Array.from({length:50},(_,i)=>({...match,match_id:i+1})));
 });
 vi.stubGlobal("fetch",fetch);render(<MatchesView/>);return fetch;
}
it("loads historical catalog, filters and pages without populating hypothetical statistics",async()=>{
 const fetch=setup();
 await screen.findAllByText("China 4 – 0 Norway");
 expect(screen.getAllByText(/1991-11-16/)).toHaveLength(50);
 const inputs=screen.getAllByRole("spinbutton") as HTMLInputElement[];
 expect(inputs.map(input=>input.value).filter(value=>value==="50")).toHaveLength(2);
 expect(inputs.every(input=>["","0","50"].includes(input.value))).toBe(true);
 fireEvent.change(screen.getByRole("combobox",{name:"Competition edition"}),{target:{value:"1"}});
 fireEvent.change(screen.getByRole("combobox",{name:"Historical team"}),{target:{value:"2"}});
 await waitFor(()=>expect(fetch.mock.calls.some(([url])=>url.includes("competition_id=1&team_id=2"))).toBe(true));
 await waitFor(()=>expect((screen.getByRole("button",{name:"Next page"}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole("button",{name:"Next page"}));
 await screen.findByText(/No historical matches on this page/);
 expect(fetch.mock.calls.some(([url])=>url.includes("offset=50"))).toBe(true);
 fireEvent.click(screen.getByRole("button",{name:"Previous page"}));
 await screen.findAllByText("China 4 – 0 Norway");
 expect(inputs.every(input=>["","0","50"].includes(input.value))).toBe(true);
});
it("requires explicit strengths while retaining selection, original controls and reset",async()=>{
 const fetch=setup();vi.spyOn(console,"error").mockImplementation(()=>{});
 await screen.findAllByText("China 4 – 0 Norway");
 fireEvent.change(screen.getByRole("combobox",{name:"Team 1"}),{target:{value:"1"}});
 fireEvent.change(screen.getByRole("combobox",{name:"Team 2"}),{target:{value:"2"}});
 expect((screen.getByRole("combobox",{name:"Team 1"}) as HTMLSelectElement).value).toBe("1");
 expect(screen.getAllByRole("spinbutton")).toHaveLength(31);
 fireEvent.submit(screen.getByRole("button",{name:"Generate Preview →"}).closest("form")!);
 await screen.findByText("Enter all ten hypothetical strength assumptions.");
 expect(fetch.mock.calls.every(([url])=>url.includes("/catalog/"))).toBe(true);
 expect(sessionStorage.getItem("goalstats-current-prediction")).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Reset"}));
 expect((screen.getByRole("combobox",{name:"Team 1"}) as HTMLSelectElement).value).toBe("");
});
it("shows loading, empty catalog, and empty matches",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json([])));render(<MatchesView/>);
 expect(screen.getByText("Loading catalog...")).toBeTruthy();
 await screen.findByText("No teams are available.");
 await screen.findByText(/No historical matches on this page/);
 expect((screen.getByRole("button",{name:"Generate Preview →"}) as HTMLButtonElement).disabled).toBe(true);
});
it("reports backend failures without displaying prototype records",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({detail:"Service unavailable"},{status:503})));render(<MatchesView/>);
 await screen.findByText("Unable to load the historical catalog.");
 await screen.findByText("Service unavailable");
 expect(screen.queryByText("China 4 – 0 Norway")).toBeNull();
});

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
const savedScenario = {...input,scenario_id:7,created_at:"2026-10-01T10:00:00Z",team1_name:"China",team2_name:"Norway",title:"Synthetic test scenario",match_id:null,prediction_ready:true};
const preview = {version:2,kind:"preview",input:{...input,extra_minute:0,status:""},output};

function workflow(){const fetch=vi.fn(async(url:string,options:RequestInit={})=>{
 if(url.endsWith('/catalog/teams'))return Response.json(teams);
 if(url.endsWith('/catalog/competitions'))return Response.json([competition]);
 if(url.includes('/catalog/matches'))return Response.json([]);
 if(options.method==='POST')return Response.json(output);
 if(options.method==='PATCH')return Response.json({...savedScenario,...JSON.parse(options.body as string)});
 return Response.json(savedScenario);
});vi.stubGlobal('fetch',fetch);return fetch;}
it("maps a restored unsaved preview to flat input without persistence",async()=>{
 const fetch=workflow();sessionStorage.setItem('goalstats-current-prediction',JSON.stringify(preview));window.history.replaceState(null,'','/matches?preview=1');render(<MatchesView/>);await waitFor(()=>expect((screen.getByRole('spinbutton',{name:'Minute'}) as HTMLInputElement).value).toBe('65'));
 fireEvent.submit(screen.getByRole('button',{name:'Generate Preview →'}).closest('form')!);await waitFor(()=>expect(push).toHaveBeenCalledWith('/predictions'));
 const writes=fetch.mock.calls.filter(([,o])=>o?.method);expect(writes).toHaveLength(1);expect(writes[0][0]).toBe('/api/football/predictions/preview');expect(JSON.parse(writes[0][1]!.body as string)).toEqual(preview.input);expect(JSON.parse(sessionStorage.getItem('goalstats-current-prediction')!)).toEqual(preview);
});
it("reopens state then PATCHes only a changed minute, with no generation",async()=>{
 const fetch=workflow();window.history.replaceState(null,'','/matches?scenario_id=7');render(<MatchesView/>);await waitFor(()=>expect((screen.getByRole('spinbutton',{name:'Minute'}) as HTMLInputElement).value).toBe('65'));expect((screen.getByRole('spinbutton',{name:'Team 1 offense'}) as HTMLInputElement).value).toBe('70');fireEvent.change(screen.getByRole('spinbutton',{name:'Minute'}),{target:{value:'75'}});fireEvent.click(screen.getByRole('button',{name:'Save scenario changes'}));await screen.findByText(/Scenario state updated/);const writes=fetch.mock.calls.filter(([,o])=>o?.method);expect(writes).toHaveLength(1);expect(writes[0][1]).toMatchObject({method:'PATCH',body:'{"match_minute":75}'});
});
it("rejects immutable edits and preserves values",async()=>{
 const fetch=workflow();window.history.replaceState(null,'','/matches?scenario_id=7');render(<MatchesView/>);await screen.findByText(/Editing scenario #7/);await waitFor(()=>expect(screen.getByRole('button',{name:'Save scenario changes'})).toBeTruthy());fireEvent.change(screen.getByRole('spinbutton',{name:'Team 1 offense'}),{target:{value:'90'}});fireEvent.click(screen.getByRole('button',{name:'Save scenario changes'}));await screen.findByText(/Teams and strength assumptions cannot/);expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(0);expect((screen.getByRole('spinbutton',{name:'Team 1 offense'}) as HTMLInputElement).value).toBe('90');
});
it("preserves edited state after PATCH validation failure and blocks uncertain retries",async()=>{
 let status=400;const fetch=vi.fn(async(url:string,options:RequestInit={})=>{
 if(options.method==='PATCH')return Response.json({detail:'Update rejected'},{status});
 if(url.endsWith('/catalog/teams'))return Response.json(teams);if(url.endsWith('/catalog/competitions'))return Response.json([competition]);if(url.includes('/catalog/matches'))return Response.json([]);return Response.json(savedScenario);
 });vi.stubGlobal('fetch',fetch);window.history.replaceState(null,'','/matches?scenario_id=7');render(<MatchesView/>);await screen.findByText(/Editing scenario #7/);fireEvent.change(screen.getByRole('spinbutton',{name:'Minute'}),{target:{value:'75'}});fireEvent.click(screen.getByRole('button',{name:'Save scenario changes'}));await screen.findByText('Update rejected');expect((screen.getByRole('spinbutton',{name:'Minute'}) as HTMLInputElement).value).toBe('75');status=504;fireEvent.click(screen.getByRole('button',{name:'Save scenario changes'}));await screen.findByText(/Update outcome is uncertain/);expect((screen.getByRole('button',{name:'Save scenario changes'}) as HTMLButtonElement).disabled).toBe(true);expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(2);
});
