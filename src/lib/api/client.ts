import "server-only";
import { ApiError, type ProblemDetails } from "./error";

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  cache?: RequestCache;
};
export type ApiResponse = { data: unknown; status: number; mediaType: string; location: string | null };

export async function request(url: string, options: Options = {}): Promise<ApiResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); },
    Math.min(30_000, Math.max(1, options.timeoutMs ?? 5_000)));
  try {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json, application/problem+json");
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    const response = await fetch(url, {
      method: options.method ?? "GET", headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal, cache: options.cache ?? "no-store", redirect: "error",
    });
    const mediaType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!response.ok) {
      let problem: ProblemDetails | undefined;
      if (mediaType === "application/problem+json") {
        try {
          const value: unknown = await response.json();
          if (value && typeof value === "object" && "type" in value && "title" in value &&
            "status" in value && "detail" in value && typeof value.type === "string" &&
            typeof value.title === "string" && value.status === response.status && typeof value.detail === "string") {
            problem = { type: value.type, title: value.title, status: response.status, detail: value.detail };
          }
        } catch (error) { if (controller.signal.aborted) throw error; }
      }
      throw new ApiError("http", response.status, problem);
    }
    let data: unknown = undefined;
    if (response.status !== 204) {
      if (mediaType !== "application/json") throw new ApiError("contract");
      try { data = await response.json(); }
      catch (error) { if (controller.signal.aborted) throw error; throw new ApiError("contract"); }
    }
    return { data, status: response.status, mediaType, location: response.headers.get("location") };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw new ApiError("cancelled");
    if (timedOut) throw new ApiError("timeout");
    throw new ApiError("network");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}
