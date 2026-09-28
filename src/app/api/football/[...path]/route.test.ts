// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
vi.mock("@/lib/api/client", () => ({ request: vi.fn() }));
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
function configure() { vi.stubEnv("FOOTBALL_API_BASE_URL", "http://backend:5300"); }
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
it("forwards only approved routes and retains query parameters", async () => {
  configure();
  vi.mocked(request).mockResolvedValue({ data: [], status: 200, mediaType: "application/json", location: null });
  const response = await GET(new Request("http://localhost/api/football/insights?team1=Spain&team2=England"), context("insights"));
  expect(response.status).toBe(200);
  expect(request).toHaveBeenCalledWith("http://backend:5300/api/v1/insights?team1=Spain&team2=England", expect.objectContaining({ method: "GET" }));
  expect((await GET(new Request("http://localhost/api/football/anything"), context("anything"))).status).toBe(404);
  expect((await GET(new Request("http://localhost/api/football/predictions"), context("predictions"))).status).toBe(405);
});
it("preserves snapshot creation and rewrites Location to the same origin", async () => {
  configure();
  const id = "11111111-1111-4111-8111-111111111111";
  vi.mocked(request).mockResolvedValue({ data: {id}, status: 201, mediaType: "application/json", location: `http://backend:5300/api/v1/snapshots/${id}` });
  const response = await POST(new Request("http://localhost/api/football/snapshots", { method: "POST", headers: {"Content-Type":"application/json"}, body: '{"team1":"Spain","team2":"England"}' }), context("snapshots"));
  expect(response.status).toBe(201);
  expect(response.headers.get("Location")).toBe(`/api/football/snapshots/${id}`);
});
it("rejects malformed or cross-origin writes without calling the backend", async () => {
  configure();
  for (const [body, origin, expected] of [["[]", "http://localhost", 400], ["{}", "https://elsewhere.test", 403]] as const) {
    const response = await POST(new Request("http://localhost/api/football/predictions", {method:"POST",headers:{"Content-Type":"application/json",origin},body}),context("predictions"));
    expect(response.status).toBe(expected);
  }
  expect(request).not.toHaveBeenCalled();
});
it("reports missing configuration and sanitizes upstream errors", async () => {
  vi.stubEnv("FOOTBALL_API_BASE_URL", "");
  expect((await GET(new Request("http://localhost/api/football/teams"),context("teams"))).status).toBe(503);
  configure();
  vi.mocked(request).mockRejectedValue(new ApiError("http", 500, {type:"about:blank",title:"secret",status:500,detail:"postgres password"}));
  const response = await GET(new Request("http://localhost/api/football/teams"),context("teams"));
  expect(response.status).toBe(502);
  expect(await response.text()).not.toMatch(/secret|postgres|backend:5300/);
});
