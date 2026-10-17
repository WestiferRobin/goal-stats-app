import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import HomeView from "./home-view";
import HomePage from "@/app/page";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("composes the Women's World Cup Home at the root without legacy props", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Goal StatsWomen's World Cup");
  expect(screen.queryByRole("link", { name: "Open the football demo" })).toBeNull();
});
it("retains hero content and analysis direction", () => {
  render(<HomeView />);
  expect(screen.getByText("Women's World Cup Predictions & Analysis")).toBeTruthy();
  expect(screen.getByText("Data. Predictions. Insights. Built for the road to 2027.")).toBeTruthy();
  expect(screen.getByText("2027 Direction")).toBeTruthy();
});
it.each([["Match Analysis", "/matches"], ["AI Predictions", "/predictions"], ["Team Exploration", "/teams"], ["Analytics", "/analytics"]])("keeps the %s feature card linked to %s", (title, href) => {
  render(<HomeView />);
  const card = screen.getByRole("heading", { level: 2, name: title }).closest("a")!;
  expect(card.getAttribute("href")).toBe(href);
  expect(within(card).getByText("Explore →")).toBeTruthy();
});
it("retains accessible shared navigation and current Home", () => {
  render(<HomeView />);
  const nav = within(screen.getByRole("navigation", { name: "Product views" }));
  for (const [name, href] of [["Goal Stats", "/"], ["Matches", "/matches"], ["Predictions", "/predictions"], ["Teams", "/teams"], ["Analytics", "/analytics"]]) {
    expect(nav.getByRole("link", { name }).getAttribute("href")).toBe(href);
  }
  expect(nav.getByRole("link", { name: "Goal Stats" }).getAttribute("aria-current")).toBe("page");
});
it("retains the hero and scenario calls to action", () => {
  render(<HomeView />);
  for (const [name, href] of [["Explore Matches", "/matches"], ["View Predictions", "/predictions"], ["Build Match Scenario →", "/matches"], ["Explore Analytics", "/analytics"]]) {
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
  }
  expect(screen.getByRole("heading", { name: "Build Your Own Match Scenario" })).toBeTruthy();
  for (const step of ["1. Choose Teams", "2. Enter Match Data", "3. Analyze"]) expect(screen.getByText(step)).toBeTruthy();
});
it("works without backend configuration, fetching, or legacy forms", () => {
  vi.stubEnv("SERVICE_API_BASE_URL", ""); vi.stubEnv("FOOTBALL_API_BASE_URL", "");
  const fetch = vi.fn(() => { throw new Error("Home must not fetch"); }); vi.stubGlobal("fetch", fetch);
  const { container } = render(<HomePage />);
  expect(screen.getByRole("main")).toBeTruthy();
  expect(container.querySelector("form")).toBeNull(); expect(screen.queryByRole("textbox")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves informational links without claiming their pages exist", () => {
  render(<HomeView />);
  const footer = within(screen.getByRole("contentinfo"));
  for (const [name, href] of [["About", "/about"], ["Blog", "/blog"], ["Project", "/project"]]) expect(footer.getByRole("link", { name }).getAttribute("href")).toBe(href);
  expect(screen.getByRole("link", { name: "Learn More" }).getAttribute("href")).toBe("/about");
});
