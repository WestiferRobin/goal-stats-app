import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BacktestingPanel from "./backtesting-panel";
import { fixture, request } from "../domain/backtesting.fixtures";
import type { BacktestRequest } from "../domain/backtesting";
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
 setup(async()=>Response.json({...fixture(),dataset_match_count:0,total_candidate_matches:0,eligible_matches:0,excluded_matches:0,cases:[],exclusion_reasons:{}}));click();await screen.findByText(/No candidate matches on this page/);expect(screen.queryByRole("table")).toBeNull();
});
it("invalid configuration never submits",async()=>{
 const fetch=setup();fireEvent.change(screen.getByLabelText("Evaluation limit"),{target:{value:"17"}});click();await waitFor(()=>expect(screen.getByRole("alert").textContent).toMatch(/between 1 and 16/));expect(fetch.mock.calls.filter(([u])=>u.includes("backtests"))).toHaveLength(0);cleanup();
});

it("aborts an active evaluation on unmount",async()=>{
 let resolve!:(r:Response)=>void;const fetch=setup(()=>new Promise(r=>{resolve=r;}));click();const signal=fetch.mock.calls.find(([url])=>url.includes("backtests"))![1]!.signal!;cleanup();expect(signal.aborted).toBe(true);await act(async()=>resolve(Response.json(fixture(true))));expect(screen.queryByText("100.0%")).toBeNull();
});
