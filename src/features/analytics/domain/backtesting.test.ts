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
it("requires the full cohort for recovery and rejects a response from a different source selection", () => {
 const recovered = buildBacktestRequest({...draft,dataset:fullDatasetId,limit:"1",recovery:true});
 expect(recovered.recovery_package_id).toBe("international-results-recovery-v1");
 expect(() => buildBacktestRequest({...draft,recovery:true})).toThrow(/full evidence/);
 const value = fullFixture(recovered);
 expect(() => decodeBacktest({...value,recovery_package_id:null},recovered)).toThrow(/Invalid evaluation response/);
 expect(decodeBacktest({...value,recovery_package_id:recovered.recovery_package_id},recovered).recovery_package_id).toBe(recovered.recovery_package_id);
 expect(() => decodeBacktest({...value,recovery_package_id:recovered.recovery_package_id},{...recovered,recovery_package_id:undefined})).toThrow();
});

it("selects the blocked 80-minute interface explicitly and rejects unsupported editions", () => {
 const selected=buildBacktestRequest({...draft,dataset:fullDatasetId,edition:"1991",durationResearch:true});
 expect(selected.research_model_version).toBe("odf-exposure-80-evidence-blocked-v1");
 expect(()=>buildBacktestRequest({...draft,durationResearch:true})).toThrow();
 expect(()=>buildBacktestRequest({...draft,dataset:fullDatasetId,edition:"2023",durationResearch:true})).toThrow();
 expect(()=>decodeBacktest(fullFixture(selected),selected)).toThrow();
 const data=fullFixture(selected);
 const c=data.cases[0];
 c.evidence_record={...c.evidence_record,regulation_score:[1,1],research:{model_version:selected.research_model_version,regulation_minutes:80,classification:"research_only",validation_status:"evidence_blocked",eligible:false,rating_duration_compatible:false,rating_complete:c.rating_reconstruction==="complete",probabilities:null,parameter_version:null,training_through:null,calibration_through:null,cutoff:c.cutoff,observed_regulation_outcome:"draw",exclusion_reasons:c.exclusion_reasons}};
 data.protocol_summaries!.forEach(g=>{g.prediction_model_version=g.regulation_minutes===80?selected.research_model_version:"road-to-the-final-heuristic-v2";if(g.regulation_minutes===80)g.research_protocol={model_version:selected.research_model_version,regulation_minutes:80,classification:"research_only",validation_status:"evidence_blocked",production_eligible:false,parameters:null,probabilities:null,accuracy:null,log_loss:null,brier_score:null};});
 expect(decodeBacktest(data,selected).accuracy).toBeNull();
 for(const change of [{eligible:true},{probabilities:[.3,.4,.3]},{observed_regulation_outcome:"home_win"},{rating_duration_compatible:true},{training_through:"2007-12-31"}]) {
  const bad=structuredClone(data);bad.cases[0].evidence_record!.research={...(c.evidence_record.research as Record<string,unknown>),...change};expect(()=>decodeBacktest(bad,selected)).toThrow();
 }
});

it("keeps research replay explicit, recovered, and free of hypothetical inputs",()=>{
 const base={...draft,dataset:fullDatasetId,predictionModel:"odf-cross-goal-rate-research-v1",recovery:true,mode:"retrospective_replay"};
 const req=buildBacktestRequest(base);
 expect(req.prediction_model_version).toBe(base.predictionModel);expect(req.assumptions).toEqual([]);expect(req.assumption_package_id).toBeNull();
 for(const change of [{recovery:false},{dataset:pilotDatasetId},{predictionModel:"unknown"},{mode:"retrospective_assumptions",packageId:"test"},{packageId:"invented"}])expect(()=>buildBacktestRequest({...base,...change})).toThrow();
 expect(()=>buildBacktestRequest({...draft,mode:"retrospective_replay"})).toThrow();
 const strict=buildBacktestRequest({...base,mode:"strict_historical",edition:"2023"});
 const data={...fullFixture(strict),prediction_model_version:base.predictionModel,research_validation:{classification:"research_only",production_eligible:false,independently_validated:false,package_id:"three-input-validation-v1",manifest_sha256:"a".repeat(64),protocol_hash:"b".repeat(64),data_hash:"c".repeat(64),comparisons:{},period_comparisons:{}}};
 expect(decodeBacktest(data,strict).eligible_matches).toBe(0);
 for(const change of [{production_eligible:true},{independently_validated:true},{classification:"validated"},{manifest_sha256:"invalid"},{period_comparisons:{validation:{}}},{comparisons:{fake:{sample_size:1,models:{}}}}])expect(()=>decodeBacktest({...data,research_validation:{...data.research_validation,...change}},strict)).toThrow();
 expect(()=>decodeBacktest({...data,prediction_model_version:"road-to-the-final-heuristic-v2"},strict)).toThrow();
});
