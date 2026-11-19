// @vitest-environment node
import { expect, it } from "vitest";
import { ApiError, getApiErrorMessage, getHttpErrorMessage } from "./error";

it.each([
  ["network", "Unable to connect to the server. Please try again."],
  ["timeout", "The server took too long to respond. Please try again."],
  ["cancelled", "The request was cancelled."],
  ["contract", "The server returned an unexpected response. Please try again."],
  ["configuration", "The service is temporarily unavailable. Please try again later."],
] as const)("preserves the safe %s classification with structured metadata", (kind, message) => {
  const error = new ApiError(kind, undefined, {
    type: "about:blank", title: "private title", status: 500,
    detail: "private diagnostic", reason: "private reason",
    field_errors: { input: "private field diagnostic" },
  });
  expect(error.kind).toBe(kind);
  expect(getApiErrorMessage(error)).toBe(message);
  expect(error.message).not.toContain("private");
});

it("accepts legacy Problem Details and HTTP errors without metadata or status", () => {
  const legacy = new ApiError("http", 404, {
    type: "about:blank", title: "Not Found", status: 404, detail: "private diagnostic",
  });
  expect(getApiErrorMessage(legacy)).toBe("The requested information could not be found.");
  expect(getApiErrorMessage(new ApiError("http"))).toBe("The server is temporarily unavailable. Please try again later.");
  expect(getHttpErrorMessage(599)).toBe("The request could not be completed. Please try again.");
});

it("does not expose arbitrary exception messages or trust error-shaped objects", () => {
  for (const error of [new Error("private diagnostic"), { kind: "http", status: 400, message: "private diagnostic" }, null]) {
    expect(getApiErrorMessage(error)).toBe("Unable to connect to the server. Please try again.");
  }
});
