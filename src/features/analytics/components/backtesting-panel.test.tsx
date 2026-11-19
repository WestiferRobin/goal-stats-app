import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BacktestingPanel from "./backtesting-panel";
import { fixture, fullFixture, request } from "../domain/backtesting.fixtures";
import { fullDatasetId, pilotDatasetId, type BacktestRequest } from "../domain/backtesting";
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});
function setup(reply: (request: BacktestRequest) => Promise<Response> = async req=>Response.json(fixture(false,req))) {
 const fetch=vi.fn((url:string,init?:RequestInit)=>url.includes("catalog")?Promise.resolve(Response.json([])):reply(JSON.parse(init!.body as string)));vi.stubGlobal("fetch",fetch);render(<BacktestingPanel/>);return fetch;
}
const click=()=>fireEvent.click(screen.getByRole("button",{name:/^(Run|Retry) evaluation$/}));
it("loads independently, selects approved dataset, displays honest exclusions and provenance",async()=>{
 const fetch=setup();expect((screen.getByLabelText("Evaluation dataset") as HTMLSelectElement).value).toBe(request.dataset_id);click();await screen.findByText(/Historical accuracy unavailable/);
 expect(screen.getByText("Candidate matches").nextElementSibling?.textContent).toBe("1");expect(screen.getByText("Eligible matches").nextElementSibling?.textContent).toBe("0");expect(screen.getByText(/Approved regulation outcome evidence is missing: 1/)).toBeTruthy();expect(screen.queryByText("0.0%")).toBeNull();expect(screen.queryByText("100.0%")).toBeNull();expect(screen.getByText("dataset hash").nextElementSibling?.textContent).toBe(fixture().dataset_hash);expect(fetch.mock.calls.filter(([u])=>u.includes("backtests"))).toHaveLength(1);
});
it("renders actual returned metrics, matrix, cases and explicit synthetic category",async()=>{
 setup(async()=>Response.json(fixture(true)));click();await screen.findByText("100.0%");expect(screen.getByText("0.693147")).toBeTruthy();expect(screen.getByText("0.380000")).toBeTruthy();expect(screen.getByRole("table",{name:/Confusion matrix/})).toBeTruthy();expect(screen.getByText("20.0% / 50.0% / 30.0%")).toBeTruthy();expect(screen.getByText("Draw · Correct")).toBeTruthy();expect(screen.getByText("Team #1 vs Team #2")).toBeTruthy();expect(screen.getByText(/Synthetic test evidence/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Evaluation limit"),{target:{value:"2"}});expect(screen.queryByText("100.0%")).toBeNull();
});
it("requires all explicit assumptions, labels mode, preserves zero and invalidates edited results",async()=>{
 const fetch=setup();fireEvent.change(screen.getByLabelText("Evaluation mode"),{target:{value:"retrospective_assumptions"}});click();await screen.findByRole("alert");expect(fetch.mock.calls.filter(([u])=>u.includes("backtests"))).toHaveLength(0);
 fireEvent.change(screen.getByLabelText("Assumption package name"),{target:{value:"experiment-v1"}});fireEvent.click(screen.getByRole("button",{name:"Load cohort for assumptions"}));await screen.findByLabelText("Match 1 Team #1 Star Power");click();await screen.findByRole("alert");click();expect(fetch.mock.calls.filter(([u])=>u.includes("backtests"))).toHaveLength(1);
 for(const team of [1,2]) for(const field of ["Star Power","Clutch"]) fireEvent.change(screen.getByLabelText(`Match 1 Team #${team} ${field}`),{target:{value:field==="Star Power"?"0":"25"}});
 click();await screen.findByText(/Historical accuracy unavailable/);const sent=JSON.parse(fetch.mock.calls.filter(([u])=>u.includes("backtests")).at(-1)![1]!.body as string);expect(sent.mode).toBe("retrospective_assumptions");expect(sent.assumptions).toHaveLength(2);expect(sent.assumptions[0].star_power).toBe(0);expect(screen.getByRole("heading",{name:"Retrospective assumption-based evaluation"})).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Assumption package name"),{target:{value:"changed"}});expect(screen.queryByLabelText("Evaluation results")).toBeNull();fireEvent.change(screen.getByLabelText("Match offset"),{target:{value:"1"}});expect(screen.queryByLabelText("Match 1 Team #1 Star Power")).toBeNull();
});
it("recovers from validation errors and malformed responses by retrying",async()=>{
 let n=0;setup(async()=>++n===1?Response.json({detail:"Check input values"},{status:400}):n===2?Response.json({}):Response.json(fixture()));click();await screen.findByText("Check input values");click();await screen.findByText(/Invalid evaluation response/);click();await screen.findByText(/Historical accuracy unavailable/);expect(n).toBe(3);
});
it("prevents duplicates and ignores stale responses after input changes",async()=>{
 let resolve!:(r:Response)=>void;const fetch=setup(()=>new Promise(r=>{resolve=r;}));click();expect((screen.getByRole("button",{name:"Evaluating…"}) as HTMLButtonElement).disabled).toBe(true);fireEvent.change(screen.getByLabelText("Match offset"),{target:{value:"1"}});await act(async()=>resolve(Response.json(fixture(true))));expect(screen.queryByLabelText("Evaluation results")).toBeNull();expect(fetch.mock.calls.filter(([u])=>u.includes("backtests"))).toHaveLength(1);
});
it("times out even a stalled request and allows retry without stale success",async()=>{
 vi.useFakeTimers();let resolve!:(r:Response)=>void;let n=0;setup(()=>++n===1?new Promise(r=>{resolve=r;}):Promise.resolve(Response.json(fixture())));click();await act(async()=>vi.advanceTimersByTime(35000));expect(screen.getByRole("alert").textContent).toMatch(/timed out/);await act(async()=>resolve(Response.json(fixture(true))));expect(screen.queryByText("100.0%")).toBeNull();await act(async()=>click());expect(screen.getByText(/Historical accuracy unavailable/)).toBeTruthy();
});
it("shows an empty cohort without fabricated rows",async()=>{
 setup(async()=>Response.json({...fixture(),dataset_match_count:0,cohort_match_count:0,total_candidate_matches:0,eligible_matches:0,excluded_matches:0,cases:[],exclusion_reasons:{}}));click();await screen.findByText(/No candidate matches on this page/);expect(screen.queryByRole("table")).toBeNull();
});
it("invalid configuration never submits",async()=>{
 const fetch=setup();fireEvent.change(screen.getByLabelText("Evaluation limit"),{target:{value:"17"}});click();await waitFor(()=>expect(screen.getByRole("alert").textContent).toMatch(/between 1 and 16/));expect(fetch.mock.calls.filter(([u])=>u.includes("backtests"))).toHaveLength(0);cleanup();
});

it("aborts an active evaluation on unmount",async()=>{
 let resolve!:(r:Response)=>void;const fetch=setup(()=>new Promise(r=>{resolve=r;}));click();const signal=fetch.mock.calls.find(([url])=>url.includes("backtests"))![1]!.signal!;cleanup();expect(signal.aborted).toBe(true);await act(async()=>resolve(Response.json(fixture(true))));expect(screen.queryByText("100.0%")).toBeNull();
});

it("selects the two-match pilot, sends no default assumptions and displays exclusions",async()=>{
 const fetch=setup(async req=>{
  const base=fixture(false,req);
  return Response.json({...base,dataset_match_count:348,cohort_match_count:2,total_candidate_matches:2,excluded_matches:2,
   exclusion_reasons:{explicit_star_power_clutch_assumptions_missing:2},cases:[0,1].map(i=>({...base.cases[0],match_id:285+i,match_key:String(i+1).repeat(64),exclusion_reasons:["explicit_star_power_clutch_assumptions_missing"]}))});
 });
 fireEvent.change(screen.getByLabelText("Evaluation dataset"),{target:{value:pilotDatasetId}});
 expect((screen.getByLabelText("Evaluation limit") as HTMLInputElement).value).toBe("2");
 expect(screen.getByText(/Two matches are insufficient/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Evaluation mode"),{target:{value:"retrospective_assumptions"}});
 fireEvent.change(screen.getByLabelText("Assumption package name"),{target:{value:"test-only-missing"}});
 click();await screen.findByText(/Historical accuracy unavailable/);
 const sent=JSON.parse(fetch.mock.calls.filter(([u])=>u.includes("backtests")).at(-1)![1]!.body as string);
 expect(sent.assumptions).toEqual([]);expect(sent.dataset_id).toBe(pilotDatasetId);
 expect(screen.getByText("Dataset matches").nextElementSibling?.textContent).toBe("348");
 expect(screen.getByText("Cohort matches").nextElementSibling?.textContent).toBe("2");
 expect(screen.queryByText("100.0%")).toBeNull();
});

it("selects every edition, distinguishes the 80-minute block, and imports only explicit packages",async()=>{
 const fetch=setup(async req=>Response.json(fullFixture(req)));
 fireEvent.change(screen.getByLabelText("Evaluation dataset"),{target:{value:fullDatasetId}});
 expect((screen.getByLabelText("Evaluation limit") as HTMLInputElement).value).toBe("348");
 expect((screen.getByLabelText("World Cup edition") as HTMLSelectElement).options.length).toBe(10);
 fireEvent.change(screen.getByLabelText("World Cup edition"),{target:{value:"1991"}});
 expect((screen.getByLabelText("Evaluation limit") as HTMLInputElement).value).toBe("26");
 fireEvent.change(screen.getByLabelText("Evaluation limit"),{target:{value:"1"}});click();
 await screen.findByRole("table",{name:/Edition evidence coverage/});expect(screen.queryByText("0.0%")).toBeNull();
 expect(screen.getByText("1991 · 80 min — blocked")).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Evaluation mode"),{target:{value:"retrospective_assumptions"}});
 fireEvent.change(screen.getByLabelText("Versioned assumption package JSON"),{target:{value:JSON.stringify({assumption_package_id:"test-only-empty-v1",assumptions:[]})}});
 fireEvent.click(screen.getByRole("button",{name:"Apply explicit assumption package"}));click();await screen.findByText(/Historical accuracy unavailable/);
 const req=JSON.parse(fetch.mock.calls.filter(([u])=>u.includes("backtests")).at(-1)![1]!.body as string);expect(req.edition).toBe(1991);expect(req.assumptions).toEqual([]);expect(req.assumption_package_id).toBe("test-only-empty-v1");
});
it("selects recovered results explicitly and clears them when returning to the pilot", async () => {
 const fetch=setup(async req=>Response.json({...fullFixture(req),recovery_package_id:req.recovery_package_id??null}));
 fireEvent.change(screen.getByLabelText("Evaluation dataset"),{target:{value:fullDatasetId}});
 fireEvent.change(screen.getByLabelText("Evaluation limit"),{target:{value:"1"}});
 fireEvent.change(screen.getByRole("combobox",{name:/Historical results/}),{target:{value:"recovered"}});
 click();await screen.findByText("Historical results: reviewed recovery additions v1.");
 const calls=fetch.mock.calls.filter(([u])=>u.includes("backtests"));
 expect(JSON.parse(calls[0][1]!.body as string).recovery_package_id).toBe("international-results-recovery-v1");
 fireEvent.change(screen.getByLabelText("Evaluation dataset"),{target:{value:pilotDatasetId}});
 expect(screen.queryByRole("combobox",{name:/Historical results/})).toBeNull();
 expect(screen.queryByLabelText("Evaluation results")).toBeNull();
 fireEvent.change(screen.getByLabelText("Evaluation dataset"),{target:{value:fullDatasetId}});
 expect((screen.getByRole("combobox",{name:/Historical results/}) as HTMLSelectElement).value).toBe("original");
});

it("labels missing packages by returned mode without inventing provenance", async () => {
 const { assumptionPackageLabel } = await import("./backtesting-panel");
 expect(assumptionPackageLabel({mode:"strict_historical",assumption_package_id:null})).toBe("None — strict historical evaluation");
 expect(assumptionPackageLabel({mode:"retrospective_replay",assumption_package_id:null})).toBe("None — retrospective replay uses pinned inputs");
 expect(assumptionPackageLabel({mode:"retrospective_assumptions",assumption_package_id:null})).toBe("Not provided");
 expect(assumptionPackageLabel({mode:"retrospective_assumptions",assumption_package_id:"explicit-v2"})).toBe("explicit-v2");
 setup();click();await screen.findByText(/Historical accuracy unavailable/);
 expect(screen.getByText("mode").nextElementSibling?.textContent).toBe("strict_historical");
 expect(screen.getByText("Assumption package: None — strict historical evaluation")).toBeTruthy();
 expect(screen.getByText("Recovery package: Not provided")).toBeTruthy();
});
it("keeps tables semantic inside named keyboard-accessible scroll regions", async () => {
 setup(async()=>Response.json(fixture(true)));click();await screen.findByText("100.0%");
 for (const table of screen.getAllByRole("table")) {
  const region=table.parentElement!;
  expect(region.getAttribute("role")).toBe("region");expect(region.getAttribute("aria-label")).toBeTruthy();expect(region.tabIndex).toBe(0);
 }
 expect(screen.getByText("20.0% / 50.0% / 30.0%").className).toContain("evaluation-number");
});

it('shows temporary server-asset unavailability without blaming user inputs',async()=>{
 setup(async()=>Response.json({reason:'evaluation_asset_unavailable',detail:'Backtesting is temporarily unavailable because an approved historical asset could not be loaded. Please try again later.'},{status:503}));click();
 const alert=await screen.findByRole('alert');expect(alert.textContent).toContain('approved historical asset');expect(alert.textContent).not.toContain('selected IDs');
});
