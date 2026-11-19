import { editionCounts } from "./backtesting";
// Synthetic fixtures for automated tests only. Never imported by production components.
import { classes, datasetId, type BacktestRequest, type BacktestResult, type Case } from "./backtesting";
export const request: BacktestRequest = { dataset_id: datasetId, mode: "strict_historical", offset: 0, limit: 1, assumptions: [], assumption_package_id: null };
export function fixture(available = false, req = request): BacktestResult {
  const c: Case = { match_id: 1, match_key: "a".repeat(64), match_date: "2023-08-01", cutoff: "2023-07-31", home_team_id: 1, away_team_id: 2, status: available ? "eligible" : "excluded",
    exclusion_reasons: available ? [] : ["regulation_outcome_evidence_missing"], warnings: [], ranking_provenance: [], rating_reconstruction: available ? "complete" : "not_attempted",
    probabilities: available ? [.2,.5,.3] : null, outcome: available ? "draw" : null,
    input_manifest: available ? { evidence: "synthetic test inputs" } : null, label_provenance: available ? { evidence: "synthetic regulation draw" } : null };
  return { ...req, status: available ? "available" : "unavailable", interpretation: req.mode === "strict_historical" ? "Synthetic historical evaluation fixture" : "Hypothetical retrospective assumptions; not genuine historical forecasts",
    protocol_version: "pregame-regulation-v1", prediction_model_version: "road-to-the-final-heuristic-v2", rating_model_version: "international-recorded-score-poisson-v1",
    dataset_hash: "b".repeat(64), package_hash: "c".repeat(64), source_hash: "d".repeat(64), manifest_hash: "e".repeat(64), evidence_kind: "synthetic",
    prediction_horizon: "pregame_90_minutes_no_extra_time_or_shootouts", cutoff_policy: "strictly_before_match_day_previous_calendar_day_inclusive", class_order: classes,
    dataset_match_count: 1, cohort_match_count: 1, total_candidate_matches: 1, eligible_matches: available ? 1 : 0, excluded_matches: available ? 0 : 1,
    exclusion_reasons: available ? {} : { regulation_outcome_evidence_missing: 1 }, accuracy: available ? 1 : null, log_loss: available ? -Math.log(.5) : null, brier_score: available ? .38 : null,
    confusion_matrix: available ? [[0,0,0],[0,1,0],[0,0,0]] : null, cases: [c], limitations: ["Synthetic test data only; no historical forecasting claim."] };
}

// Explicitly synthetic protocol-contract fixture; never historical evaluation evidence.
export function fullFixture(req: BacktestRequest): BacktestResult {
 const year=req.edition ?? 1991, minutes=year===1991?80:90;
 const base=fixture(false,req);
 const row={...base.cases[0],match_date:`${year}-11-16`,cutoff:`${year}-11-15`,edition:year,regulation_minutes:minutes,evaluation_protocol:`pregame-regulation-${minutes}-v1`,evidence_record:{synthetic:true}};
 const summary={total:1,verified_labels:0,rating_complete:0,eligible:0,excluded:1,accuracy:null,log_loss:null,brier_score:null,confusion_matrix:null};
 const empty={...summary,total:0,excluded:0};
 return {...base,dataset_match_count:348,cohort_match_count:req.edition?editionCounts[req.edition]:348,edition:req.edition??null,protocol_version:"edition-regulation-v1",prediction_horizon:req.edition===1991?"pregame_80_minutes_model_unvalidated":req.edition?"pregame_90_minutes_no_extra_time_or_shootouts":"edition_specific_80_and_90_minutes",metrics_horizon_minutes:90,cases:[row],edition_summaries:(req.edition?[req.edition]:Object.keys(editionCounts).map(Number)).map(y=>({...y===year?summary:empty,edition:y,catalog_total:editionCounts[y]})),protocol_summaries:[{...minutes===80?summary:empty,regulation_minutes:80},{...minutes===90?summary:empty,regulation_minutes:90}]} as BacktestResult;
}
