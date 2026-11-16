import { expect, it } from "vitest";
import { buildBacktestRequest, decodeBacktest, predictedClass, datasetId, pilotDatasetId, fullDatasetId, editionCounts, type Draft } from "./backtesting";
import { fixture, fullFixture, request } from "./backtesting.fixtures";
const draft: Draft = { dataset: datasetId, mode: "strict_historical", offset: "0", limit: "1", packageId: "", assumptions: [] };
it("builds the exact approved strict dataset request", () => expect(buildBacktestRequest(draft)).toEqual(request));
it.each([{ mode:"unsupported" },{dataset:"fake"},{limit:"0"},{limit:"17"},{limit:"1.5"},{offset:"348"},{offset:""}])("rejects unsupported configuration %j", change => expect(() => buildBacktestRequest({...draft,...change})).toThrow());
it("requires explicit named assumptions and preserves zero", () => {
 const retro = {...draft, mode:"retrospective_assumptions", packageId:"experiment-v1", assumptions:[{match_key:"a".repeat(64),team_id:1,star_power:"0",clutch:"25"}]};
 expect(buildBacktestRequest(retro).assumptions[0].star_power).toBe(0);
 for(const change of [{packageId:" "},{assumptions:[]},{assumptions:[{...retro.assumptions[0],clutch:""}]},{assumptions:[{...retro.assumptions[0],star_power:"101"}]},{assumptions:[...retro.assumptions,...retro.assumptions]}]) expect(()=>buildBacktestRequest({...retro,...change})).toThrow();
});
it.each([false,true])("decodes %s with honest metrics and test evidence", available => expect(decodeBacktest(fixture(available),request)).toEqual(fixture(available)));
it.each([
 {mode:"retrospective_assumptions"},{dataset_id:"fake"},{offset:1},{protocol_version:"unknown"},{dataset_hash:"invalid"},{evidence_kind:"observed"},
 {class_order:["draw","home_win","away_win"]},{eligible_matches:1},{accuracy:0},{log_loss:0},{confusion_matrix:[[0,0,0],[0,0,0],[0,0,0]]},
 {exclusion_reasons:{}},{assumptions:[{}]},{assumption_package_id:"fake"},{total_candidate_matches:0},
])("rejects malformed unavailable responses %j", change => expect(()=>decodeBacktest({...fixture(),...change},request)).toThrow(/Invalid evaluation response/));
it("checks scored case identity, cutoff, outcomes, probabilities and aggregate consistency",()=>{
 for(const change of [{cutoff:"2023-08-01"},{match_date:"2023-02-30"},{probabilities:[.2,.5,.4]},{probabilities:[NaN,.5,.3]},{outcome:null},{input_manifest:null},{rating_reconstruction:"not_attempted"}]) expect(()=>decodeBacktest({...fixture(true),cases:[{...fixture(true).cases[0],...change}]},request)).toThrow();
 for(const change of [{accuracy:.5},{brier_score:1},{log_loss:0},{confusion_matrix:[[1,0,0],[0,0,0],[0,0,0]]}]) expect(()=>decodeBacktest({...fixture(true),...change},request)).toThrow();
});
it("validates assumption replay and supports empty pages",()=>{
 const req={...request,mode:"retrospective_assumptions" as const,assumption_package_id:"test",assumptions:[{match_key:"a".repeat(64),team_id:1,star_power:0,clutch:25}]};
 expect(decodeBacktest(fixture(false,req),req).assumptions).toEqual(req.assumptions);
 expect(()=>decodeBacktest({...fixture(false,req),assumptions:[{...req.assumptions[0],clutch:50}]},req)).toThrow();
 expect(decodeBacktest({...fixture(),dataset_match_count:0,cohort_match_count:0,total_candidate_matches:0,excluded_matches:0,cases:[],exclusion_reasons:{}},request).accuracy).toBeNull();
});
it("pilot allows missing assumptions to reach exclusion reporting without filling defaults",()=>{
 const pilot={...draft,dataset:pilotDatasetId,mode:"retrospective_assumptions",packageId:"test-only"};
 expect(buildBacktestRequest(pilot).assumptions).toEqual([]);
 expect(buildBacktestRequest({...pilot,assumptions:[{match_key:"a".repeat(64),team_id:1,star_power:"",clutch:"25"}]}).assumptions).toEqual([]);
 expect(()=>buildBacktestRequest({...pilot,assumptions:[{match_key:"a".repeat(64),team_id:1,star_power:"",clutch:"101"}]})).toThrow();
 const req=buildBacktestRequest({...pilot,mode:"strict_historical",offset:"2"});
 const empty={...fixture(false,req),dataset_match_count:348,cohort_match_count:2,total_candidate_matches:0,excluded_matches:0,cases:[],exclusion_reasons:{}};
 expect(decodeBacktest(empty,req).cases).toEqual([]);
 expect(()=>decodeBacktest({...empty,dataset_match_count:2},req)).toThrow();
 expect(()=>decodeBacktest({...empty,cohort_match_count:348},req)).toThrow();
});
it("uses declared tie breaking for displayed predicted classes",()=>{expect(predictedClass([.5,.5,0])).toBe("home_win");expect(predictedClass([.2,.4,.4])).toBe("draw");});

it("supports all nine editions and a bounded full cohort without assumption defaults",()=>{
 for(const edition of ["",...Object.keys(editionCounts)]) {
  const req=buildBacktestRequest({...draft,dataset:fullDatasetId,edition,limit:"348",mode:"retrospective_assumptions",packageId:"test-only-no-values-v1"});
  expect(req.edition).toBe(edition?Number(edition):null);expect(req.limit).toBe(348);expect(req.assumptions).toEqual([]);
 }
 for(const change of [{edition:"1992"},{limit:"349"}])expect(()=>buildBacktestRequest({...draft,dataset:fullDatasetId,...change})).toThrow();
});
it("validates full dataset horizons, edition inventories, and summary metrics",()=>{
 for(const edition of ["", "1991", "2023"]){
  const req=buildBacktestRequest({...draft,dataset:fullDatasetId,edition});const data=fullFixture(req);
  expect(decodeBacktest(data,req).eligible_matches).toBe(0);
  for(const change of [{dataset_match_count:2},{cohort_match_count:2},{metrics_horizon_minutes:80},{edition:1995},{edition_summaries:[]},{protocol_summaries:[]}])expect(()=>decodeBacktest({...data,...change},req)).toThrow();
  for(const change of [{regulation_minutes:120},{edition:1995},{evaluation_protocol:"pregame-regulation-120-v1"},{evidence_record:null}])expect(()=>decodeBacktest({...data,cases:[{...data.cases[0],...change}]},req)).toThrow();
  expect(()=>decodeBacktest({...data,edition_summaries:data.edition_summaries!.map(s=>({...s,accuracy:0}))},req)).toThrow();
 }
});
