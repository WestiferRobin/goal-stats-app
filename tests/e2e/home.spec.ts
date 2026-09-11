import { expect, test } from "@playwright/test";

test("serves the branded page without browser runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Team Squared");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("page.tsx");
  await expect(page.getByRole("link", { name: "Documentation" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("serves the homepage logo from the built application's public assets", async ({ page }) => {
  await page.goto("/");
  const logo = page.getByRole("img", { name: "Next.js logo" });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});
