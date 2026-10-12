import { expect, test } from "@playwright/test";

test("Home renders without a backend, legacy forms, or API requests", async ({ page }) => {
  const errors: string[] = [];
  const calls: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route(/\/(?:items|actions)(?:[/?]|$)|\/api\//, async route => {
    calls.push(route.request().url());
    await route.abort();
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("GoalStats");
  await expect(page.getByRole("heading", { level: 1, name: "GoalStats" })).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open the football demo" })).toHaveAttribute("href", "/demo");
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

test("navigation reaches existing views and the demo", async ({ page }) => {
  for (const [name, path] of [["Matches", "/matches"], ["Predictions", "/predictions"], ["Teams", "/teams"], ["Analytics", "/analytics"]]) {
    await page.goto("/");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "GoalStats" })).toBeVisible();
  }
  await page.getByRole("link", { name: "Open the football demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("button", { name: "Update Prediction", exact: true })).toBeVisible();
});

test("serves the built GoalStats icon", async ({ page }) => {
  await page.goto("/");
  const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  expect(icon).toBeTruthy();
  const response = await page.request.get(icon!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  expect(await response.text()).toContain("<svg");
});

for (const width of [375, 1280]) {
  test(`Home at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "GoalStats" })).toBeInViewport();
    await expect(page.getByRole("link", { name: "Open the football demo" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
