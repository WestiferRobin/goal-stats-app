export const datasetId = "womens-world-cup-recorded-v1";
export const classes = ["home_win", "draw", "away_win"] as const;
export type Outcome = typeof classes[number];
export type Mode = "strict_historical" | "retrospective_assumptions";
export type Assumption = { match_key: string; team_id: number; star_power: number; clutch: number };
export type BacktestRequest = { dataset_id: typeof datasetId; mode: Mode; offset: number; limit: number; assumption_package_id: string | null; assumptions: Assumption[] };
export type Case = {
  match_id: number; match_key: string; match_date: string; cutoff: string; home_team_id: number; away_team_id: number;
  status: "eligible" | "excluded"; exclusion_reasons: string[]; warnings: string[]; ranking_provenance: Record<string, unknown>[];
  rating_reconstruction: "not_attempted" | "complete" | "insufficient" | "unavailable";
  probabilities: [number, number, number] | null; outcome: Outcome | null;
  input_manifest: Record<string, unknown> | null; label_provenance: Record<string, unknown> | null;
};
export type BacktestResult = {
  mode: Mode; status: "available" | "unavailable"; interpretation: string; protocol_version: string; prediction_model_version: string;
  rating_model_version: string; dataset_id: string; dataset_hash: string; package_hash: string; source_hash: string; manifest_hash: string;
  evidence_kind: "historical" | "synthetic"; prediction_horizon: string; cutoff_policy: string; class_order: typeof classes;
  dataset_match_count: number; offset: number; limit: number; total_candidate_matches: number; eligible_matches: number; excluded_matches: number;
  exclusion_reasons: Record<string, number>; accuracy: number | null; log_loss: number | null; brier_score: number | null;
  confusion_matrix: number[][] | null; assumptions: Assumption[]; assumption_package_id: string | null; cases: Case[]; limitations: string[];
};
export type DraftAssumption = { match_key: string; team_id: number; star_power: string; clutch: string };
export type Draft = { dataset: string; mode: string; offset: string; limit: string; packageId: string; assumptions: DraftAssumption[] };
function numeric(value: string, label: string, min: number, max: number, integer = false) {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`${label} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`);
  return n;
}
export function buildBacktestRequest(draft: Draft): BacktestRequest {
  if (draft.dataset !== datasetId) throw new Error("Unsupported evaluation dataset.");
  if (!["strict_historical", "retrospective_assumptions"].includes(draft.mode)) throw new Error("Unsupported evaluation mode.");
  const request: BacktestRequest = { dataset_id: datasetId, mode: draft.mode as Mode, offset: numeric(draft.offset, "Match offset", 0, 347, true), limit: numeric(draft.limit, "Evaluation limit", 1, 16, true), assumption_package_id: null, assumptions: [] };
  if (request.mode === "retrospective_assumptions") {
    if (!draft.packageId.trim() || draft.packageId.length > 80) throw new Error("Enter an assumption package name of 1–80 characters.");
    if (!draft.assumptions.length || draft.assumptions.length > 32) throw new Error("Load the selected cohort and supply explicit assumptions for both teams.");
    request.assumption_package_id = draft.packageId;
    request.assumptions = draft.assumptions.map(a => {
      if (!hash(a.match_key) || !id(a.team_id)) throw new Error("Invalid assumption identity. Reload the cohort.");
      return { match_key: a.match_key, team_id: a.team_id, star_power: numeric(a.star_power, "Star Power", 0, 100), clutch: numeric(a.clutch, "Clutch", 0, 100) };
    });
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
  if (d.dataset_id !== request.dataset_id || d.mode !== request.mode || d.offset !== request.offset || d.limit !== request.limit ||
    d.protocol_version !== "pregame-regulation-v1" || d.prediction_model_version !== "road-to-the-final-heuristic-v2" ||
    d.rating_model_version !== "international-recorded-score-poisson-v1" ||
    d.prediction_horizon !== "pregame_90_minutes_no_extra_time_or_shootouts" || d.cutoff_policy !== "strictly_before_match_day_previous_calendar_day_inclusive" ||
    !["historical", "synthetic"].includes(String(d.evidence_kind)) || !text(d.interpretation) || !strings(d.limitations) ||
    JSON.stringify(d.class_order) !== JSON.stringify(classes) ||
    ![d.dataset_hash, d.package_hash, d.source_hash, d.manifest_hash].every(hash) || !int(d.dataset_match_count) ||
    !int(d.total_candidate_matches, 0, request.limit) || !int(d.eligible_matches, 0, request.limit) || !int(d.excluded_matches, 0, request.limit) ||
    !Array.isArray(d.cases) || d.cases.length !== d.total_candidate_matches || d.eligible_matches + d.excluded_matches !== d.cases.length ||
    d.total_candidate_matches !== Math.min(request.limit, Math.max(0, d.dataset_match_count - request.offset)) ||
    d.assumption_package_id !== request.assumption_package_id || !Array.isArray(d.assumptions) || d.assumptions.length !== request.assumptions.length) return fail();
  for (let i = 0; i < request.assumptions.length; i++) {
    const a = object(d.assumptions[i]), expected = request.assumptions[i];
    if (a.match_key !== expected.match_key || a.team_id !== expected.team_id || a.star_power !== expected.star_power || a.clutch !== expected.clutch) return fail();
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
    if (c.status === "eligible") {
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
  return d as unknown as BacktestResult;
}
export const reasonLabel = (reason: string) => ({
  regulation_outcome_evidence_missing: "Approved regulation outcome evidence is missing",
  historical_star_power_clutch_evidence_missing: "Observed historical Star Power and Clutch evidence is missing",
  historical_source_availability_unverified: "Historical source publication availability is unverified",
}[reason] ?? reason.replaceAll("_", " "));
