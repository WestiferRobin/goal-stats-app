// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createItemRecord, decodeItem, listItems } from "./items.server";
const item = { id: "11111111-1111-4111-8111-111111111111", name: "Demo", status: "active", createdAt: "2026-09-23T10:00:00+00:00", updatedAt: "2026-09-23T10:00:00Z" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function respond(value: unknown, status = 200, media = "application/json") {
  vi.stubEnv("HOME_API_BASE_URL", "http://template:8000");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(value), { status, headers: { "Content-Type": media, Location: `/items/${item.id}` } }));
  vi.stubGlobal("fetch", fetchMock); return fetchMock;
}
it("reads bare Item arrays with no-store", async () => {
  const fetchMock = respond([item]); expect(await listItems()).toEqual([item]);
  expect(fetchMock).toHaveBeenCalledWith("http://template:8000/items", expect.objectContaining({ method: "GET", cache: "no-store" }));
});
it("creates using only the Flask name field", async () => {
  const fetchMock = respond(item, 201); expect(await createItemRecord("Demo")).toEqual(item);
  expect(fetchMock).toHaveBeenCalledWith("http://template:8000/items", expect.objectContaining({ method: "POST", body: '{"name":"Demo"}' }));
});
it("accepts archived and harmless additional fields", () => expect(decodeItem({ ...item, status: "archived", extra: true }).status).toBe("archived"));
it.each([null, [], { ...item, id: "0" }, { ...item, id: "00000000-0000-0000-0000-000000000000" }, { ...item, name: " " }, { ...item, name: "x".repeat(201) }, { ...item, status: "pending" }, { ...item, createdAt: "2026-09-23" }, { ...item, updatedAt: "nonsenseZ" }, { ...item, updatedAt: undefined }])("rejects invalid Item %j", value => expect(() => decodeItem(value)).toThrow("contract"));
it("rejects envelope and incorrect success status", async () => {
  respond({ items: [item] }); await expect(listItems()).rejects.toMatchObject({ kind: "contract" });
  respond(item, 200); await expect(createItemRecord("Demo")).rejects.toMatchObject({ kind: "contract" });
});
it("preserves Problem Details failures", async () => {
  respond({ type: "about:blank", title: "Bad Request", status: 400, detail: "Invalid" }, 400, "application/problem+json");
  await expect(createItemRecord(" ")).rejects.toMatchObject({ kind: "http", status: 400 });
});
