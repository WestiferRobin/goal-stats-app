export type ApiErrorKind =
  | "http"
  | "network"
  | "timeout"
  | "cancelled"
  | "contract"
  | "configuration";

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
};

// Server diagnostic data must never be serialized directly into form state.
export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    public readonly problem?: ProblemDetails
  ) {
    super(`API ${kind} failure`);
    this.name = "ApiError";
  }
}

/**
 * Converts an HTTP status code into a safe message
 * that can be displayed to the user.
 */
export function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request could not be completed. Please check your information.";

    case 401:
      return "You need to sign in to continue.";

    case 403:
      return "You do not have permission to perform this action.";

    case 404:
      return "The requested information could not be found.";

    case 405:
      return "This action is not supported.";

    case 408:
    case 504:
      return "The server took too long to respond. Please try again.";

    case 409:
      return "This request conflicts with existing data.";

    case 429:
      return "Too many requests were sent. Please wait a moment and try again.";

    case 500:
    case 502:
    case 503:
      return "The server is temporarily unavailable. Please try again later.";

    default:
      return "The request could not be completed. Please try again.";
  }
}

/**
 * Converts internal API errors into safe messages
 * that can be displayed to the user.
 */
export function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to connect to the server. Please try again.";
  }

  switch (error.kind) {
    case "timeout":
      return "The server took too long to respond. Please try again.";

    case "network":
      return "Unable to connect to the server. Please try again.";

    case "cancelled":
      return "The request was cancelled.";

    case "configuration":
      return "The service is temporarily unavailable. Please try again later.";

    case "contract":
      return "The server returned an unexpected response. Please try again.";

    case "http":
      return getHttpErrorMessage(error.status ?? 500);

    default:
      return "Something went wrong. Please try again.";
  }
}