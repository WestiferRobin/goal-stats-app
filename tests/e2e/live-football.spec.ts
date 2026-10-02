import { expect, test } from "@playwright/test";

test("working frontend updates a prediction through the live backend proxy", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator("#team1 option")).toHaveCount(32);
  await page.locator("#team1").selectOption({ label: "Spain" });
  await page.locator("#team2").selectOption({ label: "England" });
  await page.getByRole("button", { name: "Update Prediction", exact: true }).click();
  await expect(page.locator("#demo-status")).toContainText("Manual model prediction");
  await expect(page.locator(".probability-summary strong")).toHaveCount(3);
  await expect(page.locator(".scoreline-list .scoreline-row").first()).toBeVisible();
});
