import { expect, test } from "@playwright/test";

const name = process.env.HOME_TEST_NAME;
const api = process.env.HOME_TEST_API_URL;
const phase = process.env.HOME_TEST_PHASE;
if (!name || !api || !["create", "persisted", "unavailable", "recovered"].includes(phase ?? "")) {
  throw new Error("Live tests require the disposable scripts/test-home.sh environment.");
}
const itemName = `${name} ${"LongName".repeat(12)}`;

test(`live Home: ${phase}`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.getByRole("heading", { name: "GoalStats" })).toBeVisible();
  if (phase === "unavailable") {
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Home service is unavailable");
    await page.getByRole("button", { name: "Retry Home" }).click();
    await expect(page.getByRole("heading", { name: "GoalStats" })).toBeVisible();
    expect(await page.content()).not.toMatch(/http:\/\/template|ECONNREFUSED|API network failure|HOME_API_BASE_URL/);
  } else {
    if (phase === "create") {
      await expect(page.getByText("No items yet. Create the first item below.")).toBeVisible();
      await page.getByLabel("Item name", { exact: true }).fill(itemName);
      await page.getByRole("button", { name: "Create item", exact: true }).click();
      await expect(page).toHaveURL(/\?item=[0-9a-f-]{36}$/);
      await page.getByLabel("Action name", { exact: true }).fill("First action");
      await page.getByLabel("Action type", { exact: true }).selectOption("create");
      await page.getByRole("button", { name: "Add action record", exact: true }).click();
      await expect(page.getByText("First action — create", { exact: true })).toBeVisible();
      await page.reload();
    } else {
      await page.getByRole("link", { name: itemName, exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: `Actions for ${itemName}`, exact: true })).toBeVisible();
    await expect(page.getByText("First action — create", { exact: true })).toBeVisible();
    const id = new URL(page.url()).searchParams.get("item");
    const itemsResponse = await page.request.get(`${api}/items`); expect(itemsResponse.status()).toBe(200);
    const items: { id: string; name: string }[] = await itemsResponse.json(); expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ id, name: itemName });
    const actionsResponse = await page.request.get(`${api}/items/${id}/actions`); expect(actionsResponse.status()).toBe(200);
    expect(await actionsResponse.json()).toEqual([expect.objectContaining({ itemId: id, name: "First action", type: "create" })]);
    if (phase === "create") {
      await page.getByLabel("Action name", { exact: true }).fill("   ");
      await page.getByLabel("Action type", { exact: true }).selectOption("delete");
      await page.getByRole("button", { name: "Add action record", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText("Enter an action name");
      await expect(page.getByLabel("Action name", { exact: true })).toHaveValue("   ");
      await expect(page.getByLabel("Action type", { exact: true })).toHaveValue("delete");
      await page.reload();
      await page.getByLabel("Item name", { exact: true }).fill("   ");
      await page.getByRole("button", { name: "Create item", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText("Enter an item name");
      await expect(page.getByLabel("Item name", { exact: true })).toHaveValue("   ");
      const after = await page.request.get(`${api}/items`); expect(await after.json()).toHaveLength(1);
      // Also prove a real Flask validation rejection, not just the frontend guard.
      await page.getByLabel("Item name", { exact: true }).fill("x".repeat(201));
      await page.getByRole("button", { name: "Create item", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText("Check your input");
      await expect(page.getByLabel("Item name", { exact: true })).toHaveValue("x".repeat(201));
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.getByLabel("Action type", { exact: true })).toBeVisible();
        await page.screenshot({ path: `/artifacts/home-${width}.png`, fullPage: true });
        await page.getByLabel("Action name", { exact: true }).focus();
        await page.keyboard.press("Tab"); await expect(page.getByLabel("Action type", { exact: true })).toBeFocused();
      }
      await page.goto("/?item=invalid"); await expect(page.getByRole("main").getByRole("alert")).toContainText("Invalid item selection");
      await page.goto("/?item=99999999-9999-4999-8999-999999999999"); await expect(page.getByRole("main").getByRole("alert")).toContainText("no longer available");
    }
  }
  expect(errors).toEqual([]);
});
