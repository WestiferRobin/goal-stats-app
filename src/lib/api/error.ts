export type ApiErrorKind = "http" | "network" | "timeout" | "cancelled" | "contract" | "configuration";
export type ProblemDetails = { type: string; title: string; status: number; detail: string };

// Server diagnostic data must never be serialized directly into form state.
export class ApiError extends Error {
  constructor(public readonly kind: ApiErrorKind, public readonly status?: number,
    public readonly problem?: ProblemDetails) {
    super(`API ${kind} failure`);
    this.name = "ApiError";
  }
}
