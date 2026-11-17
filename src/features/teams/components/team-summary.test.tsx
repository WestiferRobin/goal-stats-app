import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,screen,waitFor,within} from "@testing-library/react";
import TeamSummaryCard from "./team-summary";
import type {Team} from "@/lib/football";
const team:Team={team_id:1,name:'China',category:'women_senior_national',offense:null,defense:null,form:null,star_power:null,clutch:null,fifa_rank:null,ranking_date:null,prediction_ready:false};
const summary={team_id:1,name:'China',matches_played:60,wins:30,draws:10,losses:20,goals_for:90,goals_against:50,goal_difference:40,tournament_appearances:9,filters:{competition_id:null,date_from:null,date_to:null},score_basis:'including_extra_time_no_shootout',result_definition:'recorded_final_score',coverage_status:'available_records_only'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('shows backend totals and score limitations after loading',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(summary)));render(<TeamSummaryCard team={team}/>);expect(screen.getByText('Loading historical summary...')).toBeTruthy();expect(screen.queryByText('60')).toBeNull();await screen.findByText('60');
 for(const [label,value] of [['Wins','30'],['Draws','10'],['Losses','20'],['Goals scored','90'],['Goals conceded','50'],['Goal difference','40'],['World Cup appearances','9']])expect(within(screen.getByText(label).parentElement!).getByText(value)).toBeTruthy();expect(screen.getByText(/independent of the history page/)).toBeTruthy();
});
it('distinguishes empty from failed summaries',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({...summary,matches_played:0,wins:0,draws:0,losses:0,goals_for:0,goals_against:0,goal_difference:0,tournament_appearances:0,coverage_status:'no_matching_records',score_basis:null})));const view=render(<TeamSummaryCard team={team}/>);await screen.findByText(/No matching imported records/);view.unmount();
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({detail:'Summary unavailable'},{status:503})));render(<TeamSummaryCard team={team}/>);await screen.findByRole('alert');expect(screen.queryByText(/No matching imported records/)).toBeNull();expect(screen.queryByText('60')).toBeNull();
});
it('discards a stale response when a new keyed team is selected',async()=>{
 let finish!: (r:Response)=>void;vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.includes('/1/')?new Promise<Response>(r=>{finish=r}):Response.json({...summary,team_id:2,name:'Norway',goals_for:91,goal_difference:41})));
 const view=render(<TeamSummaryCard key={1} team={team}/>);view.rerender(<TeamSummaryCard key={2} team={{...team,team_id:2,name:'Norway'}}/>);await screen.findByText('91');finish(Response.json(summary));await waitFor(()=>expect(screen.queryByText('90')).toBeNull());
});
