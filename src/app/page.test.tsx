import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("Home", () => {
  it("provides an accessible starting instruction and learning links", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("page.tsx");
    expect(screen.getByRole("link", { name: "Learning" }).getAttribute("href"))
      .toContain("https://nextjs.org/learn");
  });

  it("opens external action links without sharing the opener", () => {
    render(<Home />);
    for (const name of ["Deploy Now", "Documentation"]) {
      const link = screen.getByRole("link", { name: new RegExp(name) });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")?.split(" ")).toContain("noopener");
      expect(link.getAttribute("rel")?.split(" ")).toContain("noreferrer");
    }
  });
});
