import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import About from "./about/page";
import Project from "./project/page";
afterEach(cleanup);
for (const [name, Component] of [["About",About],["Project",Project]] as const) {
 it(`${name} describes implemented features and research limitations`, () => {
  const {container}=render(<Component/>);const text=container.textContent!;
  for(const feature of ["FIFA rankings","O/D/F","Monte Carlo","retrospective","Backtesting","hypothetical"]) expect(text).toContain(feature);
  expect(text).toContain("not validated prospective forecasts");expect(text).toContain("does not currently produce validated accuracy");
  expect(text).not.toContain("are not available");expect(text).not.toContain("execution are future work");
  expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  expect(text).toContain("Phase 1");
 });
}
