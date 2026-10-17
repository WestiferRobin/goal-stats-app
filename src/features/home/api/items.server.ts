import "server-only";
import { request } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { homeApiBaseUrl } from "@/lib/env/server";
import type { Item } from "../domain/types";
import { record, identity, name, timestamp, array } from "./decode.server";

export function decodeItem(value: unknown): Item {
  const item = record(value);
  if (item.status !== "active" && item.status !== "archived") throw new ApiError("contract");
  return { id: identity(item.id), name: name(item.name), status: item.status,
    createdAt: timestamp(item.createdAt), updatedAt: timestamp(item.updatedAt) };
}
export async function listItems(): Promise<Item[]> {
  const result = await request(`${homeApiBaseUrl()}/items`, { cache: "no-store" });
  if (result.status !== 200) throw new ApiError("contract");
  return array(result.data, decodeItem);
}
export async function createItemRecord(name: string): Promise<Item> {
  const result = await request(`${homeApiBaseUrl()}/items`, { method: "POST", body: { name } });
  if (result.status !== 201) throw new ApiError("contract");
  return decodeItem(result.data);
}
