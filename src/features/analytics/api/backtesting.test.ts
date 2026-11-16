import { afterEach, expect, it, vi } from "vitest";
import { evaluateBacktest } from "./backtesting";
import { fixture, request } from "../domain/backtesting.fixtures";
afterEach(()=>vi.unstubAllGlobals());
it("posts the supported contract through the proxy with cancellation",async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json(fixture()));vi.stubGlobal("fetch",fetch);const signal=new AbortController().signal;
 expect(await evaluateBacktest(request,signal)).toEqual(fixture());expect(fetch).toHaveBeenCalledWith("/api/football/evaluations/backtests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request),signal});
});
it.each([400,422,503,504])("surfaces recoverable HTTP %s",async status=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({detail:"Check evaluation inputs"},{status})));await expect(evaluateBacktest(request,new AbortController().signal)).rejects.toThrow(status===504?/timed out/:/Check evaluation/);});
it("rejects malformed JSON and invalid response contracts",async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response("bad")).mockResolvedValueOnce(Response.json({}));vi.stubGlobal("fetch",fetch);
 await expect(evaluateBacktest(request,new AbortController().signal)).rejects.toThrow(/Invalid evaluation/);await expect(evaluateBacktest(request,new AbortController().signal)).rejects.toThrow(/Invalid evaluation/);
});
it("handles network failure and preserves abort",async()=>{const error=new Error("aborted");vi.stubGlobal("fetch",vi.fn().mockRejectedValue(error));await expect(evaluateBacktest(request,new AbortController().signal)).rejects.toThrow(/unavailable/);const c=new AbortController();c.abort();await expect(evaluateBacktest(request,c.signal)).rejects.toBe(error);});
