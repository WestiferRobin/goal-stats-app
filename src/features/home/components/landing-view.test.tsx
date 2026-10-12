import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("renders Home without API configuration, fetching, or legacy forms", () => {
  vi.stubEnv("SERVICE_API_BASE_URL", "");
  vi.stubEnv("FOOTBALL_API_BASE_URL", "");
  const fetch = vi.fn(() => { throw new Error("Home must not fetch"); });
  vi.stubGlobal("fetch", fetch);
  const { container } = render(<HomePage />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("GoalStats");
  expect(screen.getByRole("link", { name: "Open the football demo" }).getAttribute("href")).toBe("/demo");
  expect(container.querySelector("form")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("preserves shared navigation and marks Home current", () => {
  render(<HomePage />);
  for (const [name, href] of [["Home", "/"], ["Matches", "/matches"], ["Predictions", "/predictions"], ["Teams", "/teams"], ["Analytics", "/analytics"]]) {
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
  }
  expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
});
