import { expect, test } from "@playwright/test";

test("serves the honest GoalStats landing page without browser runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("GoalStats");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "GoalStats" })).toBeVisible();
  await expect(page.getByText("A football analytics and prediction project.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Development foundation" }))
    .toContainText("Product features and backend integration are not available yet.");
  await expect(page.getByRole("link", { name: /deploy now|documentation|learning/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("serves the GoalStats icon from the built application", async ({ page }) => {
  await page.goto("/");
  const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  expect(icon).toBeTruthy();
  const response = await page.request.get(icon!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  expect(await response.text()).toContain("<svg");
});

for (const width of [375, 1280]) {
  test(`keeps the landing content readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "GoalStats" })).toBeInViewport();
    await expect(page.getByRole("heading", { level: 2, name: "Development foundation" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
