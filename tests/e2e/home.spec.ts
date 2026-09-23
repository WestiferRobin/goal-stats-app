import { expect, test } from "@playwright/test";

test("standalone shell recovers without configured backend and exposes no internals", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/"); expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("GoalStats");
  await expect(page.getByRole("heading", { level: 1, name: "GoalStats" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Home service is unavailable");
  await page.getByRole("button", { name: "Retry Home" }).click();
  await expect(page.getByRole("main")).toBeVisible();
  expect(await page.content()).not.toMatch(/HOME_API_BASE_URL|host\.docker\.internal|API configuration failure/);
  expect(errors).toEqual([]);
});
test("serves the built GoalStats icon", async ({ page }) => {
  await page.goto("/"); const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  expect(icon).toBeTruthy(); const response = await page.request.get(icon!);
  expect(response.status()).toBe(200); expect(response.headers()["content-type"]).toContain("image/svg+xml"); expect(await response.text()).toContain("<svg");
});
for (const width of [375, 1280]) {
  test(`standalone at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 }); await page.goto("/");
    await expect(page.getByRole("heading", { name: "GoalStats" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Retry Home" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
