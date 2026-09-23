import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ homeApiBaseUrl: () => "http://template:8000" }));
vi.mock("@/lib/api/client", () => ({ request: vi.fn() }));
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { listItems, createItemRecord, decodeItem } from "./items.server";
import { listActions, createActionRecord, decodeAction } from "./actions.server";
const id = "12345678-1234-1234-1234-123456789abc";
const item = { id, name: "Item", status: "active", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00+00:00" };
const action = { ...item, itemId: id, type: "create" };
const respond = (data: unknown, status = 200) => vi.mocked(request).mockResolvedValue({ data, status, mediaType: "application/json", location: "/ignored" });
beforeEach(() => vi.resetAllMocks());
it("lists bare arrays through exact nested paths without caching", async () => {
  respond([item]); expect(await listItems()).toEqual([item]);
  expect(request).toHaveBeenLastCalledWith("http://template:8000/items", { cache: "no-store" });
  respond([action]); expect(await listActions(id)).toEqual([expect.objectContaining({ itemId: id, type: "create" })]);
  expect(request).toHaveBeenLastCalledWith(`http://template:8000/items/${id}/actions`, { cache: "no-store" });
});
it("creates exact request JSON and decodes 201 resources", async () => {
  respond(item, 201); expect(await createItemRecord("Item")).toEqual(item);
  expect(request).toHaveBeenLastCalledWith("http://template:8000/items", { method: "POST", body: { name: "Item" } });
  respond(action, 201); await createActionRecord(id, "Action", "delete");
  expect(request).toHaveBeenLastCalledWith(`http://template:8000/items/${id}/actions`, { method: "POST", body: { name: "Action", type: "delete" } });
});
it.each([{ id: "00000000-0000-0000-0000-000000000000" }, { id: "oops" }, { status: "other" }, { createdAt: "2026-01-01" }, { updatedAt: "garbageZ" }, { name: null }])("rejects invalid required Item fields %j", patch => {
 expect(() => decodeItem({ ...item, ...patch })).toThrow(ApiError);
});
it("rejects wrong parent, type, envelopes and unexpected status", async () => {
 expect(() => decodeAction({ ...action, itemId: "22345678-1234-1234-1234-123456789abc" }, id)).toThrow(ApiError);
 expect(() => decodeAction({ ...action, type: "other" }, id)).toThrow(ApiError);
 respond({ items: [item] }); await expect(listItems()).rejects.toThrow(ApiError);
 respond(item, 200); await expect(createItemRecord("Item")).rejects.toThrow(ApiError);
 respond([action], 201); await expect(listActions(id)).rejects.toThrow(ApiError);
});
it("accepts extras but propagates Problem Details failures", async () => {
 expect(decodeItem({ ...item, harmless: true })).toEqual(item);
 vi.mocked(request).mockRejectedValue(new ApiError("http", 400, { type: "about:blank", title: "Bad Request", status: 400, detail: "private" }));
 await expect(createActionRecord(id, "Action", "create")).rejects.toMatchObject({ status: 400, problem: expect.objectContaining({ status: 400 }) });
});
