// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/error";
import { createItem, createAction } from "./actions";
import { createItemRecord } from "../api/items.server";
import { createActionRecord } from "../api/actions.server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
vi.mock("../api/items.server", () => ({ createItemRecord: vi.fn() }));
vi.mock("../api/actions.server", () => ({ createActionRecord: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }) }));
const id = "11111111-1111-4111-8111-111111111111";
const item = { id, name: "Demo", status: "active" as const, createdAt: "2026-09-23T10:00:00Z", updatedAt: "2026-09-23T10:00:00Z" };
const initial = { name: "", type: "create" };
function form(name = " Demo ", type = "create") { const data = new FormData(); data.set("name", name); data.set("type", type); return data; }
beforeEach(() => vi.clearAllMocks());
it("creates Item, revalidates, and selects decoded ID outside catch", async () => {
  vi.mocked(createItemRecord).mockResolvedValue(item);
  await expect(createItem(initial, form())).rejects.toThrow("NEXT_REDIRECT");
  expect(createItemRecord).toHaveBeenCalledWith("Demo"); expect(revalidatePath).toHaveBeenCalledWith("/");
  expect(redirect).toHaveBeenCalledWith(`/?item=${id}`);
});
it("binds and retains selected Item when creating Action", async () => {
  vi.mocked(createActionRecord).mockResolvedValue({ ...item, itemId: id, type: "update" });
  await expect(createAction(id, initial, form(" Record ", "update"))).rejects.toThrow("NEXT_REDIRECT");
  expect(createActionRecord).toHaveBeenCalledWith(id, "Record", "update"); expect(revalidatePath).toHaveBeenCalledWith("/");
  expect(redirect).toHaveBeenCalledWith(`/?item=${id}`);
});
it("preserves rejected whitespace", async () => {
  expect(await createItem(initial, form("   "))).toMatchObject({ name: "   ", error: "Enter an item name." });
  expect(createItemRecord).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
it.each([[id, "Name", "invalid"], ["bad", "Name", "create"], [id, " ", "create"]])("rejects invalid Action boundary", async (parent, name, type) => {
  const result = await createAction(parent, initial, form(name, type)); expect(result).toMatchObject({ name, type, error: expect.any(String) });
  expect(createActionRecord).not.toHaveBeenCalled(); expect(redirect).not.toHaveBeenCalled();
});
it.each(["timeout", "network", "contract", "cancelled"] as const)("makes %s mutation outcome uncertainty explicit", async kind => {
  vi.mocked(createItemRecord).mockRejectedValue(new ApiError(kind));
  const result = await createItem(initial, form());
  expect(result.name).toBe(" Demo "); expect(result.error).toContain("Reload and check");
  expect(JSON.parse(JSON.stringify(result))).toEqual(result); expect(revalidatePath).not.toHaveBeenCalled(); expect(redirect).not.toHaveBeenCalled();
});
it("maps backend validation safely without serializing raw detail", async () => {
  vi.mocked(createActionRecord).mockRejectedValue(new ApiError("http", 400, { type: "about:blank", title: "Bad", status: 400, detail: "secret http://internal" }));
  const result = await createAction(id, initial, form()); expect(result.error).toContain("Check your input");
  expect(JSON.stringify(result)).not.toMatch(/secret|internal/); expect(revalidatePath).not.toHaveBeenCalled();
});
it("does not hide unexpected programming errors", async () => {
  vi.mocked(createItemRecord).mockRejectedValue(new Error("bug")); await expect(createItem(initial, form())).rejects.toThrow("bug");
});
