// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./client";

const fetchMock = vi.fn<typeof fetch>();
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function respond(body: string | null, status = 200, contentType = "application/json") {
  vi.stubGlobal("fetch", fetchMock.mockReset().mockResolvedValue(new Response(body, {
    status, headers: { "Content-Type": contentType, Location: "/items/123" },
  })));
}
describe("HTTP boundary", () => {
  it.each(["GET", "POST", "PUT", "DELETE"] as const)("encodes %s and preserves metadata without retries", async method => {
    respond(method === "DELETE" ? null : '{"ok":true}', method === "DELETE" ? 204 : 200);
    const body = method === "POST" || method === "PUT" ? { name: "Example" } : undefined;
    const result = await request("http://backend/items", { method, body, cache: "no-store" });
    expect(result).toMatchObject({ status: method === "DELETE" ? 204 : 200, location: "/items/123", data: method === "DELETE" ? undefined : { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const options = fetchMock.mock.calls[0][1]!;
    expect(options).toMatchObject({ method, cache: "no-store", redirect: "error", body: body ? JSON.stringify(body) : undefined });
    expect(new Headers(options.headers).get("Content-Type")).toBe(body ? "application/json" : null);
  });
  it("defaults to GET and accepts explicit cache policy", async () => {
    respond("[]"); await request("http://backend/items", { cache: "no-cache" });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-cache" });
  });
  it("decodes Problem Details without using them as the public error message", async () => {
    const problem = { type: "about:blank", title: "Bad Request", status: 400, detail: "private upstream detail" };
    respond(JSON.stringify(problem), 400, "application/problem+json");
    await expect(request("http://backend/items")).rejects.toMatchObject({ kind: "http", status: 400, problem, message: "API http failure" });
  });
  it.each([["<html>private</html>", "text/html"], ["{", "application/problem+json"], ['{"status":500}', "application/problem+json"]])("handles malformed/non-JSON errors", async (body, media) => {
    respond(body, 500, media);
    await expect(request("http://backend/items")).rejects.toMatchObject({ kind: "http", status: 500, problem: undefined });
  });
  it.each([["{", "application/json"], ["hello", "text/plain"]])("rejects malformed successes", async (body, media) => {
    respond(body, 200, media); await expect(request("http://backend/items")).rejects.toMatchObject({ kind: "contract" });
  });
  it("classifies network failure and does not retry POST", async () => {
    vi.stubGlobal("fetch", fetchMock.mockReset().mockRejectedValue(new Error("secret URL")));
    await expect(request("http://backend/items", { method: "POST", body: {} })).rejects.toMatchObject({ kind: "network", message: "API network failure" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  function hangingFetch() {
    vi.stubGlobal("fetch", fetchMock.mockReset().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      const abort = () => reject(new DOMException("Aborted", "AbortError"));
      if (options?.signal?.aborted) abort();
      else options?.signal?.addEventListener("abort", abort, { once: true });
    })));
  }
  it("bounds timeout", async () => {
    hangingFetch(); await expect(request("http://backend/items", { timeoutMs: 5 })).rejects.toMatchObject({ kind: "timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("propagates caller cancellation", async () => {
    hangingFetch(); const controller = new AbortController();
    const result = request("http://backend/items", { signal: controller.signal }); controller.abort();
    await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  });
  it("handles an already cancelled signal", async () => {
    hangingFetch(); await expect(request("http://backend/items", { signal: AbortSignal.abort() })).rejects.toMatchObject({ kind: "cancelled" });
  });
});
