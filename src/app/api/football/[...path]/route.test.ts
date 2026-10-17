// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET, POST, PATCH } from "./route";
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
vi.mock("@/lib/api/client", () => ({ request: vi.fn() }));
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
function configure() { vi.stubEnv("FOOTBALL_API_BASE_URL", "http://backend:5300"); }
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
it("forwards only approved routes and retains query parameters", async () => {
  configure();
  vi.mocked(request).mockResolvedValue({ data: [], status: 200, mediaType: "application/json", location: null });
  const response = await GET(new Request("http://localhost/api/football/catalog/matches/insights?team1_id=1&team2_id=2"), context("catalog/matches/insights"));
  expect(response.status).toBe(200);
  expect(request).toHaveBeenCalledWith("http://backend:5300/api/v1/catalog/matches/insights?team1_id=1&team2_id=2", expect.objectContaining({ method: "GET" }));
  expect((await GET(new Request("http://localhost/api/football/anything"), context("anything"))).status).toBe(404);
  expect((await GET(new Request("http://localhost/api/football/predictions/preview"), context("predictions/preview"))).status).toBe(405);
});
it("preserves scenario creation and rewrites Location to the same origin", async () => {
  configure();
  const id = 123;
  vi.mocked(request).mockResolvedValue({ data: {id}, status: 201, mediaType: "application/json", location: `http://backend:5300/api/v1/scenarios/${id}` });
  const response = await POST(new Request("http://localhost/api/football/scenarios", { method: "POST", headers: {"Content-Type":"application/json"}, body: '{"team1":"Spain","team2":"England"}' }), context("scenarios"));
  expect(response.status).toBe(201);
  expect(response.headers.get("Location")).toBe(`/api/football/scenarios/${id}`);
});
it("rejects malformed or cross-origin writes without calling the backend", async () => {
  configure();
  for (const [body, origin, expected] of [["[]", "http://localhost", 400], ["{}", "https://elsewhere.test", 403]] as const) {
    const response = await POST(new Request("http://localhost/api/football/predictions/preview", {method:"POST",headers:{"Content-Type":"application/json",origin},body}),context("predictions/preview"));
    expect(response.status).toBe(expected);
  }
  expect(request).not.toHaveBeenCalled();
});
it("reports missing configuration and sanitizes upstream errors", async () => {
  vi.stubEnv("FOOTBALL_API_BASE_URL", "");
  expect((await GET(new Request("http://localhost/api/football/catalog/teams"),context("catalog/teams"))).status).toBe(503);
  configure();
  vi.mocked(request).mockRejectedValue(new ApiError("http", 500, {type:"about:blank",title:"secret",status:500,detail:"postgres password"}));
  const response = await GET(new Request("http://localhost/api/football/catalog/teams"),context("catalog/teams"));
  expect(response.status).toBe(500);
  expect(await response.text()).not.toMatch(/secret|postgres|backend:5300/);
});
it.each(["ftp://backend", "http://user:password@backend", "http://backend?private=value", "http://backend#fragment", "not-a-url"])("rejects invalid football configuration without contacting it: %s", async value => {
  vi.stubEnv("FOOTBALL_API_BASE_URL", value);
  const response = await GET(new Request("http://localhost/api/football/catalog/teams"), context("catalog/teams"));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ status: 503, detail: "Football service is not configured." });
  expect(request).not.toHaveBeenCalled();
});
const operations = [
 ["GET","catalog/teams"],["GET","catalog/teams/1"],["GET","catalog/competitions"],
 ["GET","catalog/matches"],["GET","catalog/matches/1"],["GET","catalog/matches/insights"],
 ["GET","scenarios"],["POST","scenarios"],["GET","scenarios/1"],["PATCH","scenarios/1"],
 ["POST","scenarios/1/predictions"],["GET","scenarios/1/predictions"],
 ["GET","predictions/1"],["POST","predictions/preview"],["POST","competitions/simulate"],
];
it.each(operations)("forwards approved %s %s exactly once",async(method,path)=>{
 configure();vi.mocked(request).mockResolvedValue({data:[],status:method==="POST"?201:200,mediaType:"application/json",location:null});
 const bodyless=method==="GET"||path==="scenarios/1/predictions";
 const response=await ({GET,POST,PATCH}[method as "GET"|"POST"|"PATCH"])(new Request(`http://localhost/api/football/${path}`,{method,...(bodyless?{}:{headers:{"Content-Type":"application/json"},body:'{"match_minute":65}'})}),context(path));
 expect(response.status).toBe(method==="POST"?201:200);
 expect(request).toHaveBeenCalledExactlyOnceWith(`http://backend:5300/api/v1/${path}`,expect.objectContaining({method,body:bodyless?undefined:{match_minute:65}}));
 expect(response.headers.get("cache-control")).toBe("no-store");
});
it.each(["teams","snapshots","history","insights","backtests","live/refresh","tournaments/simulate","scenarios/0","scenarios/-1","scenarios/01","scenarios/1.2","scenarios/2147483648","scenarios/abc","predictions/1/predictions","catalog/teams/1/predictions","constructor"])("rejects unapproved path %s",async path=>{
 configure();expect((await GET(new Request(`http://localhost/api/football/${path}`),context(path))).status).toBe(404);expect(request).not.toHaveBeenCalled();
});
it.each(["{}","null"," "])("rejects generation body %s",async body=>{
 configure();expect((await POST(new Request('http://localhost/api/football/scenarios/1/predictions',{method:'POST',body}),context('scenarios/1/predictions'))).status).toBe(400);expect(request).not.toHaveBeenCalled();
});
it.each([400,404,409,500,503])( "preserves safe HTTP error %s",async status=>{
 configure();vi.mocked(request).mockRejectedValue(new ApiError('http',status,{type:'about:blank',title:'secret',detail:'private password',status}));
 const response=await GET(new Request('http://localhost/api/football/scenarios/1'),context('scenarios/1'));
 expect(response.status).toBe(status);expect(response.headers.get('content-type')).toContain('application/problem+json');expect(await response.text()).not.toMatch(/secret|password|backend:5300/);
});
it.each(['https://evil.test/api/v1/scenarios/1','http://backend:5300/api/v1/scenarios/1?secret=x','/api/v1/snapshots/1','/api/v1/scenarios/0'])("discards unsafe Location %s",async location=>{
 configure();vi.mocked(request).mockResolvedValue({data:{},status:201,mediaType:'application/json',location});
 const response=await POST(new Request('http://localhost/api/football/scenarios',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),context('scenarios'));expect(response.headers.get('location')).toBeNull();
});
it("preserves PATCH origin and JSON validation",async()=>{
 configure();for(const [body,origin,type,status] of [['{}','https://evil.test','application/json',403],['[]','http://localhost','application/json',400],['{}','http://localhost','text/plain',415],['x'.repeat(32769),'http://localhost','application/json',413]] as const){
 const response=await PATCH(new Request('http://localhost/api/football/scenarios/1',{method:'PATCH',headers:{origin,'Content-Type':type},body}),context('scenarios/1'));expect(response.status).toBe(status);
 }expect(request).not.toHaveBeenCalled();
});
it("accepts the maximum integer ID and forwarded same-origin writes",async()=>{
 configure();vi.mocked(request).mockResolvedValue({data:{},status:200,mediaType:'application/json',location:null});
 const response=await PATCH(new Request('http://internal/api/football/scenarios/2147483647',{method:'PATCH',headers:{'Content-Type':'application/json',origin:'https://public.test','x-forwarded-host':'public.test','x-forwarded-proto':'https'},body:'{}'}),context('scenarios/2147483647'));expect(response.status).toBe(200);expect(request).toHaveBeenCalledTimes(1);
});
it("maps timeout safely without retrying generation",async()=>{
 configure();vi.mocked(request).mockRejectedValue(new ApiError('timeout'));
 const response=await POST(new Request('http://localhost/api/football/scenarios/1/predictions',{method:'POST'}),context('scenarios/1/predictions'));expect(response.status).toBe(504);expect(request).toHaveBeenCalledTimes(1);
});
it("rewrites saved prediction Location and rejects generation queries",async()=>{
 configure();vi.mocked(request).mockResolvedValue({data:{prediction_id:2},status:201,mediaType:'application/json',location:'/api/v1/predictions/2'});
 const response=await POST(new Request('http://localhost/api/football/scenarios/1/predictions',{method:'POST'}),context('scenarios/1/predictions'));expect(response.headers.get('location')).toBe('/api/football/predictions/2');
 vi.mocked(request).mockClear();expect((await POST(new Request('http://localhost/api/football/scenarios/1/predictions?extra=1',{method:'POST'}),context('scenarios/1/predictions'))).status).toBe(400);expect(request).not.toHaveBeenCalled();
});
