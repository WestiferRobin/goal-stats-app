import { expect, test } from "@playwright/test";

const homeHeading = "Goal Stats Women's World Cup";
test("Home retains its hero and feature cards without backend or legacy requests", async ({ page }) => {
  const calls: string[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route(/\/(?:items|actions)(?:[/?]|$)|\/api\//, async route => { calls.push(route.request().url()); await route.abort(); });
  await page.goto("/?item=invalid");
  await expect(page).toHaveTitle("GoalStats");
  await expect(page.getByRole("heading", { level: 1, name: homeHeading })).toBeVisible();
  for (const title of ["Match Analysis", "AI Predictions", "Team Exploration", "Analytics"]) await expect(page.getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Matches", exact: true })).toHaveAttribute("href", "/matches");
  await expect(page.getByRole("link", { name: "View Predictions", exact: true })).toHaveAttribute("href", "/predictions");
  await expect(page.locator("form")).toHaveCount(0);
  expect(calls).toEqual([]); expect(errors).toEqual([]);
});
test("navigation reaches each product view and returns to Home", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/api/football/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    expect(request.method()).toBe("GET");
    expect(["/api/football/catalog/teams", "/api/football/catalog/competitions", "/api/football/catalog/matches", "/api/football/scenarios"]).toContain(path);
    calls.push(path); await route.fulfill({ json: [] });
  });
  for (const [name, path, heading] of [["Matches", "/matches", "Build Your Match Scenario"], ["Predictions", "/predictions", "No Prediction Loaded"], ["Teams", "/teams", "Compare Teams"], ["Analytics", "/analytics", "No Match Loaded"]]) {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Product views" }).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Goal Stats", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: homeHeading })).toBeVisible();
  }
  expect(calls).toContain("/api/football/catalog/teams");
});
test("hero calls to action navigate to the existing workflows", async ({ page }) => {
  await page.route("**/api/football/**", route => route.fulfill({ json: [] }));
  for (const [name, path] of [["Explore Matches", "/matches"], ["View Predictions", "/predictions"], ["Build Match Scenario →", "/matches"], ["Explore Analytics", "/analytics"]]) {
    await page.goto("/"); await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
test("serves the built GoalStats icon", async ({ page }) => {
  await page.goto("/"); const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  expect(icon).toBeTruthy(); const response = await page.request.get(icon!);
  expect(response.status()).toBe(200); expect(response.headers()["content-type"]).toContain("image/svg+xml"); expect(await response.text()).toContain("<svg");
});
for (const width of [375, 1280]) {
  test(`Home at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 }); await page.goto("/");
    await expect(page.getByRole("heading", { name: homeHeading })).toBeInViewport();
    await expect(page.getByRole("link", { name: "Explore Matches", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
