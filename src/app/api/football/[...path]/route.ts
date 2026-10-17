import { isIP } from "node:net";
import { request as backendRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";

export const dynamic = "force-dynamic";
const routes: Record<string, string[]> = {
  "catalog/teams": ["GET"], "catalog/competitions": ["GET"],
  "catalog/matches": ["GET"], "catalog/matches/insights": ["GET"],
  scenarios: ["GET", "POST"], "predictions/preview": ["POST"],
  "competitions/simulate": ["POST"],
};
function allowedMethods(path: string) {
  if (Object.hasOwn(routes, path)) return routes[path];
  const match = /^(catalog\/teams|catalog\/matches|scenarios|predictions)\/([1-9]\d*)(\/predictions)?$/.exec(path);
  if (!match || Number(match[2]) > 2147483647) return undefined;
  if (match[3]) return match[1] === "scenarios" ? ["GET", "POST"] : undefined;
  return match[1] === "scenarios" ? ["GET", "PATCH"] : ["GET"];
}
// Only explicit loopback development targets may omit service authentication.
// All other destinations must be public HTTPS hostnames configured by the server.
function isLocalBackend(base: URL) {
  const host = base.hostname.toLowerCase().replace(/\.$/, "");
  return host === "localhost" || host === "[::1]" || /^127\.\d+\.\d+\.\d+$/.test(host);
}
function validateDestination(base: URL) {
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error();
  const cloud = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (!cloud && isLocalBackend(base)) return;
  const host = base.hostname.toLowerCase().replace(/\.$/, "");
  if (base.protocol !== "https:" || isLocalBackend(base) || isIP(host.replace(/^\[|\]$/g, "")) ||
      !host.includes(".") || /(?:^|\.)(?:localhost|local|internal)$/.test(host)) throw new Error();
}
const titles: Record<number, string> = {400:"Bad Request",401:"Unauthorized",429:"Too Many Requests",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",409:"Conflict",413:"Content Too Large",415:"Unsupported Media Type",500:"Internal Server Error",502:"Bad Gateway",503:"Service Unavailable",504:"Gateway Timeout"};
function problem(status: number, detail: string) {
  return Response.json({ type:"about:blank", title:titles[status] ?? "Request failed", status, detail }, { status, headers: { "Content-Type":"application/problem+json", "Cache-Control": "no-store" } });
}
async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const segments = (await context.params).path;
  if (segments.some(segment => !segment || segment.includes("/"))) return problem(404, "Unknown football endpoint.");
  const path = segments.join("/");
  const methods = allowedMethods(path);
  if (!methods) return problem(404, "Unknown football endpoint.");
  if (!methods.includes(request.method)) return problem(405, "Method not allowed.");
  let base: URL;
  try {
    base = new URL(process.env.FOOTBALL_API_BASE_URL ?? "");
    validateDestination(base);
  } catch { return problem(503, "Football service is not configured."); }
  const protectedOperation = request.method === "POST" || request.method === "PATCH";
  const upstreamHeaders: Record<string, string> = {};
  if (protectedOperation && !isLocalBackend(base)) {
    const token = process.env.SERVICE_API_TOKEN;
    if (!token || token.length < 32 || /[^\x21-\x7e]/.test(token)) {
      return problem(503, "Football service is not configured.");
    }
    upstreamHeaders.Authorization = `Bearer ${token}`;
  }
  let body: unknown;
  if (request.method === "POST" || request.method === "PATCH") {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const publicOrigin = forwardedHost && /^(http|https)$/.test(forwardedProto ?? "")
      ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
    if (request.headers.get("origin") && request.headers.get("origin") !== publicOrigin) {
      return problem(403, "Cross-origin requests are not allowed.");
    }
    const raw = await request.text();
    if (raw.length > 32_768) return problem(413, "Request is too large.");
    if (/^scenarios\/[1-9]\d*\/predictions$/.test(path)) {
      if (raw.length || new URL(request.url).search) return problem(400, "Send no body or query parameters when generating a saved prediction.");
    } else {
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return problem(415, "Send a JSON object.");
      try {
        body = JSON.parse(raw);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
      } catch { return problem(400, "Send a valid JSON object."); }
    }
  }
  const url = `${base.toString().replace(/\/$/, "")}/api/v1/${path}${new URL(request.url).search}`;
  try {
    const response = await backendRequest(url, { method: request.method as "GET" | "POST" | "PATCH", body, headers: upstreamHeaders, signal: request.signal, timeoutMs: 30_000 });
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (response.location) {
      try {
        const location = new URL(response.location, base);
        const match = /^\/api\/v1\/(scenarios|predictions)\/([1-9]\d*)$/.exec(location.pathname);
        if (location.origin === base.origin && !location.search && !location.hash && match && Number(match[2]) <= 2147483647) headers.Location = `/api/football/${match[1]}/${match[2]}`;
      } catch { /* Discard malformed locations. */ }
    }
    return Response.json(response.data, { status: response.status, headers });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.kind === "http") {
      const status = error.status ?? 502;
      if (status === 401) return problem(401, "Football service could not authorize this request.");
      if (status === 403) return problem(403, "Football service does not permit this request.");
      if (status === 429) return problem(429, "Too many requests. Wait before trying again; check saved history before repeating a save.");
      if (status === 400) return problem(400, "Check the selected IDs and input values.");
      if (status === 404) return problem(404, "The requested football record was not found.");
      if (status === 409) return problem(409, "The record changed or conflicts with this request. Reload it before retrying.");
      if (status === 405 || status === 415) return problem(status, "The request method or media type is not supported.");
      if (status >= 500 && status <= 599) return problem(status, "Football service could not complete the request. If saving, reload history before retrying.");
    }
    if (error.kind === "timeout") return problem(504, "Football service timed out. Reload saved history before retrying a save.");
    return problem(502, "Football service is unavailable. Please try again. If saving, reload history before retrying.");
  }
}
export const GET = forward;
export const POST = forward;

export const PATCH = forward;
