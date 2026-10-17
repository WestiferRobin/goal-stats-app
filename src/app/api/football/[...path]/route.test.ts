// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET, POST, PATCH } from "./route";
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
vi.mock("@/lib/api/client", () => ({ request: vi.fn() }));
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
function configure() { vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("VERCEL", ""); vi.stubEnv("FOOTBALL_API_BASE_URL", "http://127.0.0.1:5300"); }
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
it("forwards only approved routes and retains query parameters", async () => {
  configure();
  vi.mocked(request).mockResolvedValue({ data: [], status: 200, mediaType: "application/json", location: null });
  const response = await GET(new Request("http://localhost/api/football/catalog/matches/insights?team1_id=1&team2_id=2"), context("catalog/matches/insights"));
  expect(response.status).toBe(200);
  expect(request).toHaveBeenCalledWith("http://127.0.0.1:5300/api/v1/catalog/matches/insights?team1_id=1&team2_id=2", expect.objectContaining({ method: "GET" }));
  expect((await GET(new Request("http://localhost/api/football/anything"), context("anything"))).status).toBe(404);
  expect((await GET(new Request("http://localhost/api/football/predictions/preview"), context("predictions/preview"))).status).toBe(405);
});
it("preserves scenario creation and rewrites Location to the same origin", async () => {
  configure();
  const id = 123;
  vi.mocked(request).mockResolvedValue({ data: {id}, status: 201, mediaType: "application/json", location: `http://127.0.0.1:5300/api/v1/scenarios/${id}` });
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
 expect(request).toHaveBeenCalledExactlyOnceWith(`http://127.0.0.1:5300/api/v1/${path}`,expect.objectContaining({method,body:bodyless?undefined:{match_minute:65}}));
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
it.each(['https://evil.test/api/v1/scenarios/1','http://127.0.0.1:5300/api/v1/scenarios/1?secret=x','/api/v1/snapshots/1','/api/v1/scenarios/0'])("discards unsafe Location %s",async location=>{
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

const dummyToken = "dummy-test-service-token-not-real-123456789";
function remote(origin = "https://render-test.example.invalid") {
  configure();
  vi.stubEnv("FOOTBALL_API_BASE_URL", origin);
  vi.stubEnv("SERVICE_API_TOKEN", dummyToken);
}
function mutation(method: "POST" | "PATCH" = "POST", path = "scenarios", body: string | undefined = "{}") {
  return new Request(`https://frontend.example.invalid/api/football/${path}`, {
    method, headers: { Authorization: "Bearer untrusted-browser-token", ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body,
  });
}
it.each(operations.filter(([method]) => method !== "GET"))("authenticates approved remote %s %s even in local Next.js", async (method, path) => {
  remote();
  const bodyless = path === "scenarios/1/predictions";
  vi.mocked(request).mockResolvedValue({data:{},status:201,mediaType:"application/json",location:"/api/v1/predictions/2"});
  const req = bodyless ? new Request(`https://frontend.example.invalid/api/football/${path}`, {method,headers:{Authorization:"Bearer untrusted"}}) : mutation(method as "POST" | "PATCH", path);
  const response = await (method === "PATCH" ? PATCH : POST)(req,context(path));
  expect(request).toHaveBeenCalledExactlyOnceWith(`https://render-test.example.invalid/api/v1/${path}`,expect.objectContaining({method,headers:{Authorization:`Bearer ${dummyToken}`},body:bodyless?undefined:{}}));
  expect(response.status).toBe(201);
  expect(response.headers.get("location")).toBe("/api/football/predictions/2");
  expect(await response.text()).not.toContain(dummyToken);
});
it.each([undefined,"","short","x".repeat(31)," "+"x".repeat(32),"x".repeat(32)+" ","x".repeat(32)+"\n","x".repeat(32)+"\r","x".repeat(32)+"\t","x".repeat(32)+"é","x".repeat(32)+"\x7f"])("rejects malformed/missing remote credential case %# before forwarding", async token => {
  remote(); vi.stubEnv("SERVICE_API_TOKEN", token);
  const response = await POST(mutation(),context("scenarios"));
  expect(response.status).toBe(503);expect(request).not.toHaveBeenCalled();
  expect(await response.json()).toMatchObject({detail:"Football service is not configured."});
});
it("does not require or send a credential on public GETs",async()=>{
  remote();vi.stubEnv("SERVICE_API_TOKEN","");
  vi.mocked(request).mockResolvedValue({data:[],status:200,mediaType:"application/json",location:null});
  const response=await GET(new Request("https://frontend.example.invalid/api/football/catalog/teams",{headers:{Authorization:"Bearer browser"}}),context("catalog/teams"));
  expect(response.status).toBe(200);expect(request).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({headers:{}}));
});
it.each(["production","vercel"])("enforces cloud origin policy with %s",async mode=>{
  for(const origin of ["http://remote.example.invalid","https://localhost","https://localhost.","https://127.0.0.1","https://127.1.2.3","https://2130706433","https://[::1]","https://[::ffff:127.0.0.1]","https://host.docker.internal","https://postgres","https://redis","https://service.local","https://user:password@remote.example.invalid","https://remote.example.invalid?x=1","https://remote.example.invalid#x","https://remote.example.invalid/api/v1","ftp://remote.example.invalid","invalid"]){
    remote(origin);vi.stubEnv(mode==="production"?"NODE_ENV":"VERCEL",mode==="production"?"production":"1");
    const response=await GET(new Request("https://frontend.example.invalid/api/football/catalog/teams"),context("catalog/teams"));
    expect(response.status,origin).toBe(503);expect(request).not.toHaveBeenCalled();
  }
});
it.each(["http://127.0.0.1:5100","http://localhost:5100","http://[::1]:5100"])("retains explicit local Flask without credentials: %s",async origin=>{
  configure();vi.stubEnv("FOOTBALL_API_BASE_URL",origin);vi.stubEnv("SERVICE_API_TOKEN","");
  vi.mocked(request).mockResolvedValue({data:{},status:201,mediaType:"application/json",location:null});
  expect((await POST(mutation(),context("scenarios"))).status).toBe(201);
  expect(request).toHaveBeenCalledExactlyOnceWith(`${origin}/api/v1/scenarios`,expect.objectContaining({headers:{}}));
});
it("accepts HTTPS trailing slash and preserves queries in cloud mode",async()=>{
  remote("https://render-test.example.invalid/");vi.stubEnv("VERCEL","1");
  vi.mocked(request).mockResolvedValue({data:[],status:200,mediaType:"application/json",location:null});
  await GET(new Request("https://frontend.example.invalid/api/football/catalog/matches?limit=2&offset=3"),context("catalog/matches"));
  expect(request).toHaveBeenCalledExactlyOnceWith("https://render-test.example.invalid/api/v1/catalog/matches?limit=2&offset=3",expect.objectContaining({method:"GET"}));
});
it.each([401,403,429,500,503])("preserves sanitized remote mutation failure %s without retries",async status=>{
  remote();vi.mocked(request).mockRejectedValue(new ApiError("http",status,{type:"about:blank",title:dummyToken,status,detail:"private upstream hostname "+dummyToken}));
  const response=await POST(mutation(),context("scenarios"));
  expect(response.status).toBe(status);expect(request).toHaveBeenCalledTimes(1);
  expect(response.headers.get("www-authenticate")).toBeNull();expect(await response.text()).not.toMatch(/dummy-test|private upstream|example.invalid/);
});
it("uses the real transport for authenticated bodyless generation and rejects redirects without retry",async()=>{
  remote();const actual=await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  vi.mocked(request).mockImplementation(actual.request);
  const fetchMock=vi.fn<typeof fetch>().mockResolvedValue(new Response('{"prediction_id":2}',{status:201,headers:{"Content-Type":"application/json",Location:"/api/v1/predictions/2"}}));
  vi.stubGlobal("fetch",fetchMock);
  try {
    const req=()=>new Request("https://frontend.example.invalid/api/football/scenarios/1/predictions",{method:"POST"});
    const response=await POST(req(),context("scenarios/1/predictions"));
    expect(response.status).toBe(201);expect(response.headers.get("location")).toBe("/api/football/predictions/2");
    const options=fetchMock.mock.calls[0][1]!;
    expect(options.body).toBeUndefined();expect(new Headers(options.headers).has("Content-Type")).toBe(false);
    expect(new Headers(options.headers).get("Authorization")).toBe(`Bearer ${dummyToken}`);
    expect(options.redirect).toBe("error");expect(options.cache).toBe("no-store");
    fetchMock.mockClear().mockRejectedValue(new TypeError("redirect rejected"));
    expect((await POST(req(),context("scenarios/1/predictions"))).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  } finally { vi.unstubAllGlobals(); }
});
