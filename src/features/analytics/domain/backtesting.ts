export const productionModel = "road-to-the-final-heuristic-v2";
export const researchModels = ["odf-reweighted-poisson-research-v1", "odf-cross-goal-rate-research-v1", "odf-temperature-research-v1"] as const;
export type PredictionModel = typeof productionModel | typeof researchModels[number];
export const durationResearchModel = "odf-exposure-80-evidence-blocked-v1";
export const datasetId = "womens-world-cup-recorded-v1";
export const pilotDatasetId = "womens-world-cup-2023-opening-pilot-v1";
export const recoveryPackageId = "international-results-recovery-v1";
export const fullDatasetId = "womens-world-cup-full-v1";
export const editionCounts: Record<number, number> = {1991:26,1995:26,1999:32,2003:32,2007:32,2011:32,2015:52,2019:52,2023:64};
export type DatasetId = typeof datasetId | typeof pilotDatasetId | typeof fullDatasetId;
export const classes = ["home_win", "draw", "away_win"] as const;
export type Outcome = typeof classes[number];
export type Mode = "strict_historical" | "retrospective_assumptions" | "retrospective_replay";
export type Assumption = { match_key: string; team_id: number; star_power: number; clutch: number };
export type BacktestRequest = { prediction_model_version?: PredictionModel; research_model_version?: typeof durationResearchModel; recovery_package_id?: typeof recoveryPackageId; dataset_id: DatasetId; edition?: number | null; mode: Mode; offset: number; limit: number; assumption_package_id: string | null; assumptions: Assumption[] };
export type Case = {
  match_id: number; match_key: string; match_date: string; cutoff: string; home_team_id: number; away_team_id: number;
  status: "eligible" | "excluded"; exclusion_reasons: string[]; warnings: string[]; ranking_provenance: Record<string, unknown>[];
  rating_reconstruction: "not_attempted" | "complete" | "insufficient" | "unavailable";
  probabilities: [number, number, number] | null; outcome: Outcome | null;
  edition?: number; regulation_minutes?: number; evaluation_protocol?: string; evidence_record?: Record<string, unknown> | null; rating_evidence?: Record<string, unknown> | null;
  input_manifest: Record<string, unknown> | null; label_provenance: Record<string, unknown> | null;
};
export type EditionSummary = {edition: number; catalog_total: number; total: number; verified_labels: number; rating_complete: number; eligible: number; excluded: number; accuracy: number | null; log_loss: number | null; brier_score: number | null; confusion_matrix: number[][] | null};
export type ResearchComparison = {sample_size:number;cohort_hash?:string;models:Record<string,{sample_size:number;accuracy:number;log_loss:number;brier_score:number}>};
export type ResearchValidation = {classification:string; comparisons:Record<string,ResearchComparison>; period_comparisons:Record<string,Record<string,ResearchComparison>>; [key:string]:unknown};
export type BacktestResult = {
  research_validation?: ResearchValidation | null;
  protocol_summaries?: (Omit<EditionSummary, "edition" | "catalog_total"> & {regulation_minutes: number; prediction_model_version?: string; research_protocol?: Record<string, unknown>})[];
  recovery_package_id?: typeof recoveryPackageId | null;
  edition?: number | null; edition_summaries?: EditionSummary[]; metrics_horizon_minutes?: number;
  mode: Mode; status: "available" | "unavailable"; interpretation: string; protocol_version: string; prediction_model_version: string;
  rating_model_version: string; dataset_id: string; dataset_hash: string; package_hash: string; source_hash: string; manifest_hash: string;
  evidence_kind: "historical" | "synthetic"; prediction_horizon: string; cutoff_policy: string; class_order: typeof classes;
  dataset_match_count: number; cohort_match_count: number; offset: number; limit: number; total_candidate_matches: number; eligible_matches: number; excluded_matches: number;
  exclusion_reasons: Record<string, number>; accuracy: number | null; log_loss: number | null; brier_score: number | null;
  confusion_matrix: number[][] | null; assumptions: Assumption[]; assumption_package_id: string | null; cases: Case[]; limitations: string[];
};
export type DraftAssumption = { match_key: string; team_id: number; star_power: string; clutch: string };
export type Draft = { predictionModel?: string; durationResearch?: boolean; recovery?: boolean; edition?: string; dataset: string; mode: string; offset: string; limit: string; packageId: string; assumptions: DraftAssumption[] };
function numeric(value: string, label: string, min: number, max: number, integer = false) {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`${label} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`);
  return n;
}
export function buildBacktestRequest(draft: Draft): BacktestRequest {
  if (draft.dataset !== datasetId && draft.dataset !== pilotDatasetId && draft.dataset !== fullDatasetId) throw new Error("Unsupported evaluation dataset.");
  if (!["strict_historical", "retrospective_assumptions", "retrospective_replay"].includes(draft.mode)) throw new Error("Unsupported evaluation mode.");
  const request: BacktestRequest = { dataset_id: draft.dataset, mode: draft.mode as Mode, offset: numeric(draft.offset, "Match offset", 0, 347, true), limit: numeric(draft.limit, "Evaluation limit", 1, draft.dataset === fullDatasetId ? 348 : 16, true), assumption_package_id: null, assumptions: [] };
  const model = draft.predictionModel ?? productionModel;
  if (![productionModel, ...researchModels].includes(model)) throw new Error("Unsupported evaluation model.");
  if (model !== productionModel) {
    if (draft.dataset !== fullDatasetId || !draft.recovery || draft.mode === "retrospective_assumptions" || draft.assumptions.length || draft.packageId) throw new Error("Research replay requires recovered full evidence and no assumed inputs.");
    request.prediction_model_version = model as PredictionModel;
  } else if (draft.mode === "retrospective_replay") throw new Error("Select a three-input research model for temporal replay.");
  if (draft.recovery) {
    if (draft.dataset !== fullDatasetId) throw new Error("Historical recovery requires the full evidence dataset.");
    request.recovery_package_id = recoveryPackageId;
  }
  if (draft.dataset === fullDatasetId) {
    request.edition = draft.edition ? numeric(draft.edition, "Edition", 1991, 2023, true) : null;
    if (request.edition !== null && !editionCounts[request.edition]) throw new Error("Unsupported World Cup edition.");
  }
  if (draft.durationResearch) {
    if (request.dataset_id !== fullDatasetId || (request.edition != null && request.edition !== 1991)) throw new Error("80-minute research requires 1991 or all editions.");
    request.research_model_version = durationResearchModel;
  }
  if (request.mode === "retrospective_assumptions") {
    if (!draft.packageId.trim() || draft.packageId.length > 80) throw new Error("Enter an assumption package name of 1–80 characters.");
    if ((!draft.assumptions.length && draft.dataset !== pilotDatasetId && draft.dataset !== fullDatasetId) || draft.assumptions.length > (draft.dataset === fullDatasetId ? 696 : 32)) throw new Error("Load the selected cohort and supply explicit assumptions for both teams.");
    request.assumption_package_id = draft.packageId;
    request.assumptions = draft.assumptions.map(a => {
      if (!hash(a.match_key) || !id(a.team_id)) throw new Error("Invalid assumption identity. Reload the cohort.");
      if ((draft.dataset === pilotDatasetId || draft.dataset === fullDatasetId) && (!a.star_power.trim() || !a.clutch.trim())) {
        if (a.star_power.trim()) numeric(a.star_power, "Star Power", 0, 100);
        if (a.clutch.trim()) numeric(a.clutch, "Clutch", 0, 100);
        return null;
      }
      return { match_key: a.match_key, team_id: a.team_id, star_power: numeric(a.star_power, "Star Power", 0, 100), clutch: numeric(a.clutch, "Clutch", 0, 100) };
    }).filter((a): a is Assumption => a !== null);
    if (new Set(request.assumptions.map(a => `${a.match_key}:${a.team_id}`)).size !== request.assumptions.length) throw new Error("Duplicate assumptions.");
  }
  return request;
}
const fail = (): never => { throw new Error("Invalid evaluation response. No metrics were displayed. Please retry."); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const num = (v: unknown, min = 0, max = Infinity): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const int = (v: unknown, min = 0, max = 348): v is number => num(v, min, max) && Number.isInteger(v);
const id = (v: unknown): v is number => int(v, 1, 2147483647);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const day = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function predictedClass(p: readonly number[]): Outcome { return classes[p.indexOf(Math.max(...p))]; }
export function decodeBacktest(value: unknown, request: BacktestRequest): BacktestResult {
  const d = object(value);
  if ((d.recovery_package_id ?? null) !== (request.recovery_package_id ?? null) || d.dataset_id !== request.dataset_id || d.mode !== request.mode || d.offset !== request.offset || d.limit !== request.limit ||
    d.protocol_version !== (request.dataset_id === fullDatasetId ? "edition-regulation-v1" : "pregame-regulation-v1") || d.prediction_model_version !== (request.prediction_model_version ?? productionModel) ||
    d.rating_model_version !== "international-recorded-score-poisson-v1" ||
    d.prediction_horizon !== (request.dataset_id === fullDatasetId ? request.edition === 1991 ? "pregame_80_minutes_model_unvalidated" : request.edition == null ? "edition_specific_80_and_90_minutes" : "pregame_90_minutes_no_extra_time_or_shootouts" : "pregame_90_minutes_no_extra_time_or_shootouts") || d.cutoff_policy !== "strictly_before_match_day_previous_calendar_day_inclusive" ||
    !["historical", "synthetic"].includes(String(d.evidence_kind)) || !text(d.interpretation) || !strings(d.limitations) ||
    JSON.stringify(d.class_order) !== JSON.stringify(classes) ||
    ![d.dataset_hash, d.package_hash, d.source_hash, d.manifest_hash].every(hash) || !int(d.dataset_match_count) ||
    !int(d.cohort_match_count) || d.cohort_match_count > d.dataset_match_count ||
    (request.dataset_id === pilotDatasetId && (d.cohort_match_count !== 2 || d.dataset_match_count !== 348)) ||
    !int(d.total_candidate_matches, 0, request.limit) || !int(d.eligible_matches, 0, request.limit) || !int(d.excluded_matches, 0, request.limit) ||
    !Array.isArray(d.cases) || d.cases.length !== d.total_candidate_matches || d.eligible_matches + d.excluded_matches !== d.cases.length ||
    d.total_candidate_matches !== Math.min(request.limit, Math.max(0, d.cohort_match_count - request.offset)) ||
    d.assumption_package_id !== request.assumption_package_id || !Array.isArray(d.assumptions) || d.assumptions.length !== request.assumptions.length) return fail();
  for (let i = 0; i < request.assumptions.length; i++) {
    const a = object(d.assumptions[i]), expected = request.assumptions[i];
    if (a.match_key !== expected.match_key || a.team_id !== expected.team_id || a.star_power !== expected.star_power || a.clutch !== expected.clutch) return fail();
  }
  if (request.dataset_id === fullDatasetId && (d.dataset_match_count !== 348 || d.cohort_match_count !== (request.edition ? editionCounts[request.edition] : 348) || d.edition !== (request.edition ?? null) || d.metrics_horizon_minutes !== 90)) return fail();
  const research = (request.prediction_model_version ?? productionModel) !== productionModel;
  if (research) {
    const validation = object(d.research_validation);
    if (validation.classification !== "research_only" || validation.production_eligible !== false || validation.independently_validated !== false || validation.package_id !== "three-input-validation-v1" || !hash(validation.manifest_sha256) || !hash(validation.protocol_hash) || !hash(validation.data_hash)) return fail();
    const comparisons = object(validation.comparisons), periods = object(validation.period_comparisons);
    const cohortKeys = ["three_input", "baseline_common", "calibrated_common"];
    const completeGroups = (v: unknown) => {
      const groups=object(v);
      return Object.keys(groups).length===3 && cohortKeys.every(k=>{
        if (!(k in groups)) return false;
        const group=object(groups[k]), models=object(group.models);
        const expected = k === "three_input" ? researchModels.slice(0,2) : [...researchModels.slice(0,k === "calibrated_common" ? 3 : 2), "prior-wwc-class-frequency-research-v1", "prior-wwc-poisson-research-v1"];
        return group.sample_size === 0 ? Object.keys(models).length === 0 : Object.keys(models).length === expected.length && expected.every(m=>m in models);
      });
    };
    if (request.mode === "retrospective_replay") {
      if (!completeGroups(comparisons)) return fail();
      const expectedPeriods = request.edition == null ? ["development", "calibration", "validation", "retrospective_holdout"] : [];
      if (Object.keys(periods).length !== expectedPeriods.length || expectedPeriods.some(k=>!(k in periods) || !completeGroups(periods[k]))) return fail();
    } else if (Object.keys(periods).length) return fail();
    for (const value of [...Object.values(object(validation.comparisons)), ...Object.values(object(validation.period_comparisons)).flatMap(v=>Object.values(object(v)))]) {
      const group=object(value), models=object(group.models);
      if (!int(group.sample_size,0,348)) return fail();
      if (group.sample_size === 0) {if (Object.keys(models).length) return fail();continue;}
      if (!hash(group.cohort_hash) || !Array.isArray(group.match_ids) || group.match_ids.length !== group.sample_size || !group.match_ids.every(id) || new Set(group.match_ids).size !== group.sample_size) return fail();
      for (const value of Object.values(models)) {
        const score=object(value);
        if (score.sample_size !== group.sample_size || !num(score.accuracy,0,1) || !num(score.log_loss) || !num(score.brier_score,0,2)) return fail();
        const matrix=score.confusion_matrix;
        if (!Array.isArray(matrix) || matrix.length!==3 || matrix.some(r=>!Array.isArray(r)||r.length!==3||!r.every(v=>int(v,0,348))) || matrix.flat().reduce((a:number,b:number)=>a+b,0)!==group.sample_size || Math.abs(matrix.reduce((a:number,r:number[],i:number)=>a+r[i],0)/group.sample_size-score.accuracy)>1e-9) return fail();
      }
    }
    if (request.mode === "strict_historical" && (d.eligible_matches !== 0 || Object.keys(object(validation.comparisons)).length)) return fail();
  }
  const reasons: Record<string, number> = {}, matrix = [[0,0,0],[0,0,0],[0,0,0]], seen = new Set<string>(), ids = new Set<number>();
  let eligible = 0, loss = 0, brier = 0;
  for (const item of d.cases) {
    const c = object(item);
    if (!id(c.match_id) || !hash(c.match_key) || seen.has(c.match_key) || ids.has(c.match_id) || !id(c.home_team_id) || !id(c.away_team_id) || c.home_team_id === c.away_team_id ||
      !day(c.match_date) || !day(c.cutoff) || Date.parse(c.match_date) - Date.parse(c.cutoff) !== 86400000 || !strings(c.exclusion_reasons) || !strings(c.warnings) ||
      !Array.isArray(c.ranking_provenance) || c.ranking_provenance.length > 2 || !["not_attempted", "complete", "insufficient", "unavailable"].includes(String(c.rating_reconstruction))) return fail();
    c.ranking_provenance.forEach(object);
    seen.add(c.match_key); ids.add(c.match_id);
    if (c.input_manifest !== null) object(c.input_manifest);
    if (c.label_provenance !== null) object(c.label_provenance);
    if (request.dataset_id === fullDatasetId && (c.edition !== Number(String(c.match_date).slice(0,4)) || !editionCounts[Number(c.edition)] || (request.edition != null && c.edition !== request.edition) || c.regulation_minutes !== (c.edition === 1991 ? 80 : 90) || c.evaluation_protocol !== `pregame-regulation-${c.regulation_minutes}-v1` || !c.evidence_record)) return fail();
    if (request.research_model_version && c.regulation_minutes === 80) {
      const research = object(object(c.evidence_record).research);
      if (research.model_version !== durationResearchModel || research.regulation_minutes !== 80 || research.classification !== "research_only" || research.validation_status !== "evidence_blocked" || research.eligible !== false || research.rating_duration_compatible !== false || research.rating_complete !== (c.rating_reconstruction === "complete") || research.probabilities !== null || research.parameter_version !== null || research.training_through !== null || research.calibration_through !== null || research.cutoff !== c.cutoff || !classes.includes(research.observed_regulation_outcome as Outcome) || !strings(research.exclusion_reasons) || !research.exclusion_reasons.length || research.exclusion_reasons.some(r => !(c.exclusion_reasons as string[]).includes(r))) return fail();
      const score = object(c.evidence_record).regulation_score;
      if (!Array.isArray(score) || score.length !== 2 || !score.every(v => int(v, 0, 100)) || research.observed_regulation_outcome !== (score[0] > score[1] ? "home_win" : score[0] === score[1] ? "draw" : "away_win")) return fail();
    }
    if (c.status === "eligible") {
      if (research) {
        const manifest = object(c.input_manifest);
        if (request.mode !== "retrospective_replay" || manifest.classification !== "research_only" || manifest.production_eligible !== false || manifest.publication_timing !== "match_dates_only_retrospective" || manifest.prediction_model_version !== request.prediction_model_version || manifest.cutoff !== c.cutoff || !hash(manifest.source_population_hash) || !hash(manifest.rating_population_hash)) return fail();
        if (request.prediction_model_version === researchModels[2]) {
          const calibration = object(manifest.calibration);
          if (Number(c.edition) <= 2007 || !day(calibration.through) || calibration.through >= String(c.match_date) || calibration.temperature !== .75) return fail();
        }
      }
      if (request.dataset_id === fullDatasetId && c.regulation_minutes !== 90) return fail();
      if (c.exclusion_reasons.length || !Array.isArray(c.probabilities) || c.probabilities.length !== 3 || !c.probabilities.every(p => num(p, 0, 1)) ||
        Math.abs(c.probabilities.reduce((a: number, b: number) => a + b, 0) - 1) > 1e-9 || !classes.includes(c.outcome as Outcome) ||
        c.input_manifest === null || c.label_provenance === null || c.rating_reconstruction !== "complete") return fail();
      const actual = classes.indexOf(c.outcome as Outcome), p = c.probabilities as number[];
      matrix[actual][classes.indexOf(predictedClass(p))]++; eligible++;
      loss -= Math.log(Math.max(p[actual], 1e-15)); brier += p.reduce((sum, v, i) => sum + (v - Number(i === actual)) ** 2, 0);
    } else if (c.status === "excluded") {
      if (!c.exclusion_reasons.length || c.probabilities !== null || c.outcome !== null) return fail();
      for (const reason of new Set(c.exclusion_reasons)) reasons[reason] = (reasons[reason] ?? 0) + 1;
    } else return fail();
  }
  const counts = object(d.exclusion_reasons);
  if (eligible !== d.eligible_matches || Object.keys(counts).length !== Object.keys(reasons).length || Object.entries(counts).some(([k,v]) => !int(v, 1, request.limit) || reasons[k] !== v)) return fail();
  if (!eligible) {
    if (d.status !== "unavailable" || [d.accuracy,d.log_loss,d.brier_score,d.confusion_matrix].some(v => v !== null)) return fail();
  } else if (d.status !== "available" || !num(d.accuracy, 0, 1) || !num(d.log_loss) || !num(d.brier_score, 0, 2) ||
    JSON.stringify(d.confusion_matrix) !== JSON.stringify(matrix) || Math.abs(d.accuracy - matrix.reduce((s,r,i) => s+r[i],0)/eligible) > 1e-9 ||
    Math.abs(d.log_loss - loss/eligible) > 1e-9 || Math.abs(d.brier_score - brier/eligible) > 1e-9) return fail();
  if (request.dataset_id === fullDatasetId) {
    if (!Array.isArray(d.edition_summaries) || d.edition_summaries.length !== (request.edition ? 1 : 9) || !Array.isArray(d.protocol_summaries) || d.protocol_summaries.length !== 2) return fail();
    const years = request.edition ? [request.edition] : Object.keys(editionCounts).map(Number);
    for (const [index, item] of d.edition_summaries.entries()) {
      const summary = object(item);
      if (summary.edition !== years[index] || summary.catalog_total !== editionCounts[years[index]]) return fail();
      validateSummary(summary, (d.cases as Case[]).filter(c => c.edition === years[index]));
    }
    for (const [index, item] of d.protocol_summaries.entries()) {
      const summary = object(item), minutes = index === 0 ? 80 : 90;
      if (summary.regulation_minutes !== minutes) return fail();
      if (request.research_model_version) {
        if (summary.prediction_model_version !== (minutes === 80 ? durationResearchModel : (request.prediction_model_version ?? productionModel))) return fail();
        if (minutes === 80) {
          const protocol = object(summary.research_protocol);
          if (protocol.model_version !== durationResearchModel || protocol.regulation_minutes !== 80 || protocol.validation_status !== "evidence_blocked" || protocol.classification !== "research_only" || protocol.production_eligible !== false || [protocol.parameters, protocol.probabilities, protocol.accuracy, protocol.log_loss, protocol.brier_score].some(v => v !== null)) return fail();
        }
      }
      validateSummary(summary, (d.cases as Case[]).filter(c => c.regulation_minutes === minutes));
    }
  }
  return d as unknown as BacktestResult;
}
export const reasonLabel = (reason: string) => ({
  regulation_outcome_evidence_missing: "Approved regulation outcome evidence is missing",
  historical_star_power_clutch_evidence_missing: "Observed historical Star Power and Clutch evidence is missing",
  historical_source_availability_unverified: "Historical source publication availability is unverified",
}[reason] ?? reason.replaceAll("_", " "));

function validateSummary(summary: Record<string, unknown>, cases: Case[]) {
  const eligible = cases.filter(c => c.status === "eligible");
  if (summary.total !== cases.length || summary.eligible !== eligible.length || summary.excluded !== cases.length - eligible.length || summary.verified_labels !== cases.filter(c => c.label_provenance !== null).length || summary.rating_complete !== cases.filter(c => c.rating_reconstruction === "complete").length) return fail();
  if (!eligible.length) {
    if ([summary.accuracy,summary.log_loss,summary.brier_score,summary.confusion_matrix].some(v => v !== null)) return fail();
    return;
  }
  const matrix = [[0,0,0],[0,0,0],[0,0,0]]; let loss=0,brier=0;
  for (const c of eligible) {const actual=classes.indexOf(c.outcome!), p=c.probabilities!;matrix[actual][classes.indexOf(predictedClass(p))]++;loss-=Math.log(Math.max(p[actual],1e-15));brier+=p.reduce((s,v,i)=>s+(v-Number(i===actual))**2,0);}
  if (JSON.stringify(summary.confusion_matrix)!==JSON.stringify(matrix) || !num(summary.accuracy,0,1) || !num(summary.log_loss) || !num(summary.brier_score,0,2) || Math.abs(summary.accuracy-matrix.reduce((s,r,i)=>s+r[i],0)/eligible.length)>1e-9 || Math.abs(summary.log_loss-loss/eligible.length)>1e-9 || Math.abs(summary.brier_score-brier/eligible.length)>1e-9) return fail();
}
