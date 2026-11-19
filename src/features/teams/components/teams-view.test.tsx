import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import TeamsView from "./teams-view";
const teams=[{team_id:1,name:"China",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false},{team_id:2,name:"Norway",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false}];
const competition={competition_id:1,name:"FIFA Women's World Cup",edition_label:"1991",category:"women_senior_national"};
const match={match_id:1,competition_id:1,competition_name:competition.name,edition_label:"1991",match_date:"1991-11-16",home_team_id:1,home_team_name:"China",away_team_id:2,away_team_name:"Norway",home_score:4,away_score:0,score_basis:"including_extra_time_no_shootout",neutral:false,city:"Guangzhou",country:"China"};

const insights={source:"approved_historical_results",team1_id:1,team2_id:2,team1_name:"China",team2_name:"Norway",head_to_head:[match],team1_history:[match],team2_history:[match],limit:50,offset:0,order:"match_date_asc_match_id_asc"};
function stubFetch(fetch: (url: string) => Promise<Response>) {
 vi.stubGlobal('fetch', (url: string) => {
  const summary = /teams\/(\d+)\/summary$/.exec(url);
  if (!summary) return fetch(url);
  const id=Number(summary[1]);return Promise.resolve(Response.json({team_id:id,name:id===1?'China':id===2?'Norway':'Japan',matches_played:60,wins:30,draws:10,losses:20,goals_for:90,goals_against:50,goal_difference:40,tournament_appearances:9,filters:{competition_id:null,date_from:null,date_to:null},score_basis:'including_extra_time_no_shootout',result_definition:'recorded_final_score',coverage_status:'available_records_only'}));
 });
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("uses normalized identities, dated scores and nullable cards",async()=>{
 const fetch=vi.fn(async(url:string)=>Response.json(url.endsWith('/teams')?teams:insights));stubFetch(fetch);render(<TeamsView/>);
 expect(screen.getByText('Loading teams...')).toBeTruthy();await screen.findAllByText(/1991-11-16/);
 expect((screen.getByRole('combobox',{name:'Team 1'}) as HTMLSelectElement).value).toBe('1');expect(fetch.mock.calls[1][0]).toContain('team1_id=1&team2_id=2');expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(5);expect(screen.getAllByText((_,element)=>element?.tagName === 'SPAN' && element.textContent?.replace(/\s/g,'') === '4–0')).toHaveLength(3);
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(3));
});
it("handles empty teams and unavailable catalog without fallback",async()=>{
 stubFetch(vi.fn(async()=>Response.json([])));const view=render(<TeamsView/>);await screen.findByText('No teams are available. Comparison requires at least two teams.');view.unmount();vi.spyOn(console,'error').mockImplementation(()=>{});stubFetch(vi.fn(async()=>Response.json({detail:'Unavailable'},{status:503})));render(<TeamsView/>);await screen.findByText('Unavailable');expect(screen.queryByRole('combobox')).toBeNull();
});
it("handles empty and failed history with refresh",async()=>{
 let fail=false;stubFetch(vi.fn(async(url:string)=>Response.json(url.endsWith('/teams')?teams:fail?{detail:'History unavailable'}:{...insights,head_to_head:[],team1_history:[],team2_history:[]},{status:!url.endsWith('/teams')&&fail?503:200})));render(<TeamsView/>);await screen.findByText(/No imported head-to-head/);expect(screen.getAllByText(/No imported match history/)).toHaveLength(2);fail=true;fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await screen.findByText('History unavailable');expect(screen.queryByText(/No imported head-to-head/)).toBeNull();expect(screen.queryByText(/No imported match history/)).toBeNull();
});
it("ignores a stale response after selection changes even if fetch ignores abort",async()=>{
 let resolve!: (r:Response)=>void;const fetch=vi.fn(async(url:string)=>{
 if(url.endsWith('/teams'))return Response.json([...teams,{...teams[0],team_id:3,name:'Japan'}]);
 if(url.includes('team1_id=1'))return new Promise<Response>(r=>{resolve=r;});
 return Response.json({...insights,team1_id:3,team1_name:'Japan',head_to_head:[],team1_history:[],team2_history:[]});
 });stubFetch(fetch);render(<TeamsView/>);await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));fireEvent.change(screen.getByRole('combobox',{name:'Team 1'}),{target:{value:'3'}});await screen.findByText(/No imported head-to-head/);resolve(Response.json(insights));await waitFor(()=>expect(screen.queryByText(/1991-11-16/)).toBeNull());
});

it("does not show empty history while a request is pending",async()=>{
 stubFetch(vi.fn(async(url:string)=>url.endsWith('/teams')?Response.json(teams):new Promise<Response>(()=>{})));
 render(<TeamsView/>);await screen.findAllByText('Loading history...');
 expect(screen.queryByText(/No imported match history/)).toBeNull();
 expect(screen.queryByText(/No imported head-to-head/)).toBeNull();
});

it("paginates complete histories without changing full-history totals and resets on selection",async()=>{
 const first=Array.from({length:50},(_,i)=>({...match,match_id:i+1}));
 const fetch=vi.fn(async(url:string)=>{
  if(url.endsWith('/teams'))return Response.json([...teams,{...teams[0],team_id:3,name:'Japan'}]);
  const params=new URL(url,'http://localhost').searchParams;const offset=Number(params.get('offset'));const id=Number(params.get('team1_id'));
  return Response.json({...insights,offset,team1_id:id,team1_name:id===3?'Japan':'China',head_to_head:[],team1_history:id===3?[]:offset?[{...match,match_id:51,match_date:'1995-06-06'}]:first,team2_history:[]});
 });stubFetch(fetch);render(<TeamsView/>);await screen.findAllByText(/1991-11-16/);await screen.findAllByText('60');
 fireEvent.click(screen.getByRole('button',{name:'Next history page'}));await screen.findByText(/1995-06-06/);expect(screen.queryByText(/1991-11-16/)).toBeNull();expect(screen.getAllByText('60')).toHaveLength(2);
 expect((screen.getByRole('button',{name:'Next history page'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Previous history page'}));await screen.findAllByText(/1991-11-16/);
 fireEvent.click(screen.getByRole('button',{name:'Next history page'}));await screen.findByText(/1995-06-06/);
 fireEvent.change(screen.getByRole('combobox',{name:'Team 1'}),{target:{value:'3'}});await screen.findByText(/No imported match history is available for Japan/);
 expect(fetch.mock.calls.at(-1)?.[0]).toContain('offset=0');expect(screen.queryByText(/1995-06-06/)).toBeNull();
});
it("ignores a pending old page after changing the selected team",async()=>{
 let finish!: (r:Response)=>void;
 const fetch=vi.fn(async(url:string)=>{
  if(url.endsWith('/teams'))return Response.json([...teams,{...teams[0],team_id:3,name:'Japan'}]);
  const p=new URL(url,'http://localhost').searchParams;
  if(p.get('offset')==='50')return new Promise<Response>(r=>{finish=r});
  const id=Number(p.get('team1_id'));return Response.json({...insights,team1_id:id,head_to_head:[],team1_history:id===1?Array.from({length:50},(_,i)=>({...match,match_id:i+1})):[],team2_history:[]});
 });stubFetch(fetch);render(<TeamsView/>);await screen.findAllByText(/1991-11-16/);fireEvent.click(screen.getByRole('button',{name:'Next history page'}));
 await waitFor(()=>expect(finish).toBeDefined());fireEvent.change(screen.getByRole('combobox',{name:'Team 1'}),{target:{value:'3'}});await screen.findByText(/No imported match history is available for Japan/);
 finish(Response.json({...insights,offset:50}));await waitFor(()=>expect(screen.queryByText(/1991-11-16/)).toBeNull());
});

it.each(['http','json','network'])("clears initial loading after a completed %s failure",async kind=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});
 vi.stubGlobal('fetch',vi.fn(async()=>{
  if(kind==='network')throw new TypeError('Network request failed');
  return kind==='json'?new Response('not-json'):Response.json({detail:'Catalog unavailable'},{status:503});
 }));
 render(<TeamsView/>);
 await waitFor(()=>expect(screen.queryByText('Loading teams...')).toBeNull());
 expect(screen.queryByText('No teams are available.')).toBeNull();
 expect(screen.queryByRole('combobox')).toBeNull();
 expect(screen.getByText(kind==='http'?'Catalog unavailable':kind==='network'?'Network request failed':/JSON|Unexpected token/)).toBeTruthy();
});

it("explains a one-team catalog without requesting comparisons", async () => {
 const fetch = vi.fn(async () => Response.json([teams[0]]));
 vi.stubGlobal("fetch", fetch);
 render(<TeamsView/>);
 expect(screen.queryByText(/Only one team/)).toBeNull();
 await screen.findByText("Only one team is available. Comparison requires at least two teams.");
 expect(screen.queryByText(/No teams are available/)).toBeNull();
 expect(screen.queryByRole("button", {name:"Refresh"})).toBeNull();
 expect(fetch).toHaveBeenCalledTimes(1);
});

it("renders enriched values, preserves zero and hides only Teams star/clutch displays", async () => {
 const metadata={run_id:'a'.repeat(64),model:'test-v1',cutoff:'2026-06-10',source:'https://example.test/results',source_sha256:'b'.repeat(64),status:'experimental',evidence:{last_match:'2026-06-09'}};
 const enriched=teams.map((team,i)=>({...team,offense:i?20:0,defense:70,form:60,star_power:90,clutch:80,fifa_rank:i+1,fifa_points:2000.125+i,ranking_date:'2026-10-20',ratings_metadata:metadata}));
 stubFetch(vi.fn(async(url:string)=>Response.json(url.endsWith('/teams')?enriched:insights)));
 render(<TeamsView/>);await screen.findAllByText('2000.125');
 expect(screen.queryByText('Star Power')).toBeNull();expect(screen.queryByText('Clutch')).toBeNull();
 expect(screen.getAllByText('0').length).toBeGreaterThan(0);
 expect(screen.getByText('Norway +20')).toBeTruthy();
 expect(screen.getAllByText(/results through 2026-06-10/)).toHaveLength(2);
 expect(screen.getAllByText('2026-10-20')).toHaveLength(2);
 expect(screen.getAllByText('60').length).toBeGreaterThan(0);
});

it("refuses rating advantages across different cohorts", async () => {
 const enriched=teams.map((team,i)=>({...team,offense:i?20:0,defense:70,form:60,ratings_metadata:{run_id:(i?'a':'b').repeat(64),model:'test-v1',cutoff:'2026-06-10',source:'source',source_sha256:'c'.repeat(64),status:'experimental',evidence:{}}}));
 stubFetch(vi.fn(async(url:string)=>Response.json(url.endsWith('/teams')?enriched:insights)));
 render(<TeamsView/>);await screen.findAllByText('Not comparable');
 expect(screen.getAllByText('Not comparable')).toHaveLength(3);
 expect(screen.queryByText('Norway +20')).toBeNull();
});
