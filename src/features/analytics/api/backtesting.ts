import { decodeBacktest, type BacktestRequest } from "../domain/backtesting";

export async function evaluateBacktest(request: BacktestRequest, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch("/api/football/evaluations/backtests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Evaluation service is unavailable. Please retry.");
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error("Invalid evaluation response. Please retry."); }
  if (!response.ok) {
    const detail = data && typeof data === "object" && "detail" in data && typeof data.detail === "string" ? data.detail : "Evaluation could not be completed. Please retry.";
    throw new Error(response.status === 504 ? "Evaluation timed out. Use a smaller limit and retry." : detail);
  }
  return decodeBacktest(data, request);
}
