// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createActionRecord, decodeAction, listActions } from "./actions.server";
const itemId = "11111111-1111-4111-8111-111111111111";
const action = { id: "22222222-2222-4222-8222-222222222222", itemId, name: "First action", type: "create", createdAt: "2026-09-23T10:00:00Z", updatedAt: "2026-09-23T10:00:00+00:00" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function respond(value: unknown, status = 200) {
  vi.stubEnv("HOME_API_BASE_URL", "http://template:8000");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock); return fetchMock;
}
it("reads nested bare arrays", async () => {
  const fetchMock = respond([action]); expect(await listActions(itemId)).toEqual([action]);
  expect(fetchMock).toHaveBeenCalledWith(`http://template:8000/items/${itemId}/actions`, expect.objectContaining({ method: "GET", cache: "no-store" }));
});
it("posts exact nested wire body without itemId", async () => {
  const fetchMock = respond(action, 201); expect(await createActionRecord(itemId, "First action", "create")).toEqual(action);
  expect(fetchMock).toHaveBeenCalledWith(`http://template:8000/items/${itemId}/actions`, expect.objectContaining({ method: "POST", body: '{"name":"First action","type":"create"}' }));
});
it.each(["create", "update", "delete"])("accepts type %s", type => expect(decodeAction({ ...action, type, extra: 1 }, itemId).type).toBe(type));
it.each([null, [], { ...action, itemId: action.id }, { ...action, type: "execute" }, { ...action, id: "bad" }, { ...action, name: " " }, { ...action, createdAt: "2026-09-23T10:00:00" }])("rejects invalid Action %j", value => expect(() => decodeAction(value, itemId)).toThrow("contract"));
it("rejects envelopes and incorrect create status", async () => {
  respond({ actions: [action] }); await expect(listActions(itemId)).rejects.toMatchObject({ kind: "contract" });
  respond(action); await expect(createActionRecord(itemId, "First action", "create")).rejects.toMatchObject({ kind: "contract" });
});
it("keeps missing parent recoverable", async () => {
  respond({}, 404); await expect(listActions(itemId)).rejects.toMatchObject({ kind: "http", status: 404 });
});
