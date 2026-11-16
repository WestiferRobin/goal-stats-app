import { expect, test } from "@playwright/test";

for (const width of [375, 1280]) {
  test(`historical demo preserves presentation without API requests at ${width}px`, async ({ page }) => {
    const calls: string[] = [], errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/football/**", async route => { calls.push(route.request().url()); await route.abort(); });
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/demo");
    expect(response?.headers()["content-security-policy"]).toContain("connect-src 'none'");
    await expect(page.getByRole("heading", { level: 1, name: "Road to the Final" })).toBeVisible();
    await expect(page.locator("#demo-status")).toContainText("Historical/static reference");
    await expect(page.locator("#demo-status")).toContainText("not live predictions");
    for (const name of ["Update Prediction", "Save Snapshot"]) await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    await expect(page.locator("#retry-connection")).toBeDisabled();
    await expect(page.locator("#team1")).toBeDisabled();
    expect(await page.locator("section").count()).toBeGreaterThan(5);
    await page.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await expect(page).toHaveURL(/\/demo$/);
    const nav = page.getByRole("navigation", { name: "Current Women's World Cup views" });
    for (const [name, href] of [["Teams", "/teams"], ["Matches", "/matches"], ["Predictions", "/predictions"], ["Analytics", "/analytics"]]) await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    await nav.getByRole("link", { name: "Goal Stats", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Goal Stats Women's World Cup" })).toBeVisible();
    expect(calls).toEqual([]); expect(errors).toEqual([]);
  });
}
test("reference label and product navigation are available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto(`${test.info().project.use.baseURL}/demo`);
    expect(response?.headers()["content-security-policy"]).toContain("form-action 'none'");
    await expect(page.locator("#demo-status")).toContainText("Historical/static reference");
    await expect(page.locator("#retry-connection")).toBeDisabled();
    await expect(page.getByRole("link", { name: "Matches", exact: true })).toHaveAttribute("href", "/matches");
  } finally { await context.close(); }
});
