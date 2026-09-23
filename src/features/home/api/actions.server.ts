import "server-only";
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { homeApiBaseUrl } from "@/lib/env/server";
import { isActionType, type Action, type ActionType } from "../domain/types";
import { record, identity, name, timestamp, array } from "./decode.server";

export function decodeAction(value: unknown, itemId: string): Action {
  const action = record(value);
  if (!isActionType(action.type) || identity(action.itemId) !== identity(itemId)) throw new ApiError("contract");
  return { id: identity(action.id), itemId: identity(action.itemId), name: name(action.name), type: action.type,
    createdAt: timestamp(action.createdAt), updatedAt: timestamp(action.updatedAt) };
}
export async function listActions(itemId: string): Promise<Action[]> {
  const result = await request(`${homeApiBaseUrl()}/items/${identity(itemId)}/actions`, { cache: "no-store" });
  if (result.status !== 200) throw new ApiError("contract");
  return array(result.data, value => decodeAction(value, itemId));
}
export async function createActionRecord(itemId: string, name: string, type: ActionType): Promise<Action> {
  const result = await request(`${homeApiBaseUrl()}/items/${identity(itemId)}/actions`, { method: "POST", body: { name, type } });
  if (result.status !== 201) throw new ApiError("contract");
  return decodeAction(result.data, itemId);
}
