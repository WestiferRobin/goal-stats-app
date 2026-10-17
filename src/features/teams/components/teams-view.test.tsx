import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import TeamsView from "./teams-view";
const teams=[{team_id:1,name:"China",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false},{team_id:2,name:"Norway",category:"women_senior_national",offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false}];
const competition={competition_id:1,name:"FIFA Women's World Cup",edition_label:"1991",category:"women_senior_national"};
const match={match_id:1,competition_id:1,competition_name:competition.name,edition_label:"1991",match_date:"1991-11-16",home_team_id:1,home_team_name:"China",away_team_id:2,away_team_name:"Norway",home_score:4,away_score:0,score_basis:"including_extra_time_no_shootout",neutral:false,city:"Guangzhou",country:"China"};

const insights={source:"approved_historical_results",team1_id:1,team2_id:2,team1_name:"China",team2_name:"Norway",head_to_head:[match],team1_history:[match],team2_history:[match],limit:50,offset:0,order:"match_date_asc_match_id_asc"};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("uses normalized identities, dated scores and nullable cards",async()=>{
 const fetch=vi.fn(async(url:string)=>Response.json(url.endsWith('/teams')?teams:insights));vi.stubGlobal('fetch',fetch);render(<TeamsView/>);
 expect(screen.getByText('Loading teams...')).toBeTruthy();await screen.findAllByText(/1991-11-16/);
 expect((screen.getByRole('combobox',{name:'Team 1'}) as HTMLSelectElement).value).toBe('1');expect(fetch.mock.calls[1][0]).toContain('team1_id=1&team2_id=2');expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(5);expect(screen.getAllByText((_,element)=>element?.tagName === 'SPAN' && element.textContent?.replace(/\s/g,'') === '4–0')).toHaveLength(3);
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(3));
});
it("handles empty teams and unavailable catalog without fallback",async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json([])));const view=render(<TeamsView/>);await screen.findByText('No teams are available.');view.unmount();vi.spyOn(console,'error').mockImplementation(()=>{});vi.stubGlobal('fetch',vi.fn(async()=>Response.json({detail:'Unavailable'},{status:503})));render(<TeamsView/>);await screen.findByText('Unavailable');expect(screen.queryByRole('combobox')).toBeNull();
});
it("handles empty and failed history with refresh",async()=>{
 let fail=false;vi.stubGlobal('fetch',vi.fn(async(url:string)=>Response.json(url.endsWith('/teams')?teams:fail?{detail:'History unavailable'}:{...insights,head_to_head:[],team1_history:[],team2_history:[]},{status:!url.endsWith('/teams')&&fail?503:200})));render(<TeamsView/>);await screen.findByText(/No imported head-to-head/);fail=true;fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await screen.findByText('History unavailable');
});
it("ignores a stale response after selection changes even if fetch ignores abort",async()=>{
 let resolve!: (r:Response)=>void;const fetch=vi.fn(async(url:string)=>{
 if(url.endsWith('/teams'))return Response.json([...teams,{...teams[0],team_id:3,name:'Japan'}]);
 if(url.includes('team1_id=1'))return new Promise<Response>(r=>{resolve=r;});
 return Response.json({...insights,team1_id:3,team1_name:'Japan',head_to_head:[],team1_history:[],team2_history:[]});
 });vi.stubGlobal('fetch',fetch);render(<TeamsView/>);await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));fireEvent.change(screen.getByRole('combobox',{name:'Team 1'}),{target:{value:'3'}});await screen.findByText(/No imported head-to-head/);resolve(Response.json(insights));await waitFor(()=>expect(screen.queryByText(/1991-11-16/)).toBeNull());
});
