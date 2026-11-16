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
    dataset_match_count: 1, total_candidate_matches: 1, eligible_matches: available ? 1 : 0, excluded_matches: available ? 0 : 1,
    exclusion_reasons: available ? {} : { regulation_outcome_evidence_missing: 1 }, accuracy: available ? 1 : null, log_loss: available ? -Math.log(.5) : null, brier_score: available ? .38 : null,
    confusion_matrix: available ? [[0,0,0],[0,1,0],[0,0,0]] : null, cases: [c], limitations: ["Synthetic test data only; no historical forecasting claim."] };
}
