import {afterEach,expect,it,vi} from "vitest";
import {getTeamSummary} from "./team-summary";
import {parseTeamSummary} from "@/lib/football";
export const summary={team_id:1,name:"China",matches_played:3,wins:1,draws:1,losses:1,goals_for:5,goals_against:3,goal_difference:2,tournament_appearances:2,filters:{competition_id:null,date_from:null,date_to:null},score_basis:"including_extra_time_no_shootout",result_definition:"recorded_final_score",coverage_status:"available_records_only"};
afterEach(()=>{vi.unstubAllGlobals();});
it("validates totals, coverage and actual calendar dates",()=>{
 expect(parseTeamSummary(summary)).toEqual(summary);
 for(const changes of [{wins:2},{goals_for:-1},{goal_difference:4},{tournament_appearances:4},{score_basis:null},{coverage_status:'no_matching_records'},{wins:'1'},{filters:{...summary.filters,date_from:'2023-02-30'}},{filters:{...summary.filters,date_from:'2023-02-02',date_to:'2023-02-01'}}])expect(()=>parseTeamSummary({...summary,...changes})).toThrow();
});
it("accepts truthful empty totals only with empty coverage and null score basis",()=>{
 const empty={...summary,matches_played:0,wins:0,draws:0,losses:0,goals_for:0,goals_against:0,goal_difference:0,tournament_appearances:0,score_basis:null,coverage_status:'no_matching_records'};
 expect(parseTeamSummary(empty)).toEqual(empty);expect(()=>parseTeamSummary({...empty,goals_for:1,goal_difference:1})).toThrow();
});
it("uses backend inclusive filters and checks the echoed scope",async()=>{
 const filters={competition_id:1,date_from:'1991-01-01',date_to:'1991-12-31'};
 const fetch=vi.fn().mockResolvedValue(Response.json({...summary,filters}));vi.stubGlobal('fetch',fetch);
 expect((await getTeamSummary(1,filters)).filters).toEqual(filters);
 expect(fetch).toHaveBeenCalledWith('/api/football/catalog/teams/1/summary?competition_id=1&date_from=1991-01-01&date_to=1991-12-31',expect.any(Object));
 fetch.mockResolvedValue(Response.json(summary));await expect(getTeamSummary(1,filters)).rejects.toThrow(/filters/);
 fetch.mockResolvedValue(Response.json({...summary,team_id:2}));await expect(getTeamSummary(1)).rejects.toThrow(/team/);
});
it("keeps errors distinct from empty records and rejects invalid filters before fetching",async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({detail:'Team not found'},{status:404}));vi.stubGlobal('fetch',fetch);
 await expect(getTeamSummary(1)).rejects.toThrow('Team not found');fetch.mockClear();
 await expect(getTeamSummary(0)).rejects.toThrow();await expect(getTeamSummary(1,{date_from:'2023-02-30'})).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();
});
