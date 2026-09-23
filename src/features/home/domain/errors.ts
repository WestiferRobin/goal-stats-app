import { ApiError } from "@/lib/api/error";

export function homeError(error: unknown, mutation = false): string {
  if (!(error instanceof ApiError)) throw error;
  if (mutation && ["timeout", "network", "contract", "cancelled"].includes(error.kind))
    return "The save could not be confirmed. Reload and check the records before submitting again.";
  if (error.kind === "http" && error.status === 404) return "That item is no longer available. Select another item.";
  if (error.kind === "http" && [400, 422].includes(error.status ?? 0))
    return "Check your input. Use a nonblank name of at most 200 characters and a listed action type.";
  if (error.kind === "contract") return "The Home service returned an unexpected response. Please retry by reloading this page.";
  return "Home service is unavailable. Please retry by reloading this page.";
}
