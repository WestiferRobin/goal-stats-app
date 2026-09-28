import { request as backendRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";

export const dynamic = "force-dynamic";
const routes: Record<string, string[]> = {
  teams: ["GET"], predictions: ["POST"], snapshots: ["GET", "POST"],
  history: ["GET"], insights: ["GET"], backtests: ["GET"],
  "tournaments/simulate": ["POST"], "live/refresh": ["POST"],
};
function problem(status: number, detail: string) {
  return Response.json({ status, detail }, { status, headers: { "Cache-Control": "no-store" } });
}
async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  const methods = routes[path] ?? (/^snapshots\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path) ? ["GET"] : undefined);
  if (!methods) return problem(404, "Unknown football endpoint.");
  if (!methods.includes(request.method)) return problem(405, "Method not allowed.");
  let base: URL;
  try {
    base = new URL(process.env.FOOTBALL_API_BASE_URL ?? "");
    if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
  } catch { return problem(503, "Football service is not configured."); }
  let body: unknown;
  if (request.method === "POST") {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const publicOrigin = forwardedHost && /^(http|https)$/.test(forwardedProto ?? "")
      ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
    if (request.headers.get("origin") && request.headers.get("origin") !== publicOrigin) {
      return problem(403, "Cross-origin requests are not allowed.");
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) return problem(415, "Send a JSON object.");
    try {
      const raw = await request.text();
      if (raw.length > 32_768) return problem(413, "Request is too large.");
      body = JSON.parse(raw);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    } catch { return problem(400, "Send a valid JSON object."); }
  }
  const url = `${base.toString().replace(/\/$/, "")}/api/v1/${path}${new URL(request.url).search}`;
  try {
    const response = await backendRequest(url, { method: request.method as "GET" | "POST", body, signal: request.signal, timeoutMs: 30_000 });
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (response.location) {
      const match = response.location.match(/\/api\/v1\/snapshots\/([0-9a-f-]{36})$/i);
      if (match) headers.Location = `/api/football/snapshots/${match[1]}`;
    }
    return Response.json(response.data, { status: response.status, headers });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.kind === "http" && error.status === 400) return problem(400, "Check the selected teams, match statistics, and simulation count.");
    if (error.kind === "http" && error.status === 404) return problem(404, "Team or snapshot not found. Teams may need importing.");
    if (error.kind === "http" && error.status === 503 && path === "live/refresh") return problem(503, "No live or cached match data is available.");
    if (error.kind === "timeout") return problem(504, "Football service timed out. Reload saved history before retrying a save.");
    return problem(502, "Football service is unavailable. Please try again. If saving, reload history before retrying.");
  }
}
export const GET = forward;
export const POST = forward;
