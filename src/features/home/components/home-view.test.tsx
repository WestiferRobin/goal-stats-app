import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomeView from "./home-view";

afterEach(cleanup);

describe("HomeView", () => {
  it("introduces GoalStats and its football purpose in the main content", () => {
    render(<HomeView />);
    const heading = screen.getByRole("heading", { level: 1, name: "GoalStats" });
    expect(screen.getByRole("main").contains(heading)).toBe(true);
    expect(screen.getByText("A football analytics and prediction project.")).toBeTruthy();
  });

  it("clearly identifies the current development foundation and its limits", () => {
    render(<HomeView />);
    const status = screen.getByRole("region", { name: "Development foundation" });
    expect(status.contains(screen.getByRole("heading", {
      level: 2,
      name: "Development foundation",
    }))).toBe(true);
    expect(status.textContent).toContain("Product features and backend integration are not available yet.");
    expect(screen.queryByRole("link", { name: /deploy now|documentation|learning/i })).toBeNull();
  });
});
