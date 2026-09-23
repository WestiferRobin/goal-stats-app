"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createItemRecord } from "../api/items.server";
import { createActionRecord } from "../api/actions.server";
import { homeError } from "./errors";
import { isIdentity, isActionType, type FormState } from "./types";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
export async function createItem(_previous: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name");
  if (!name.trim()) return { name, type: "create", error: "Enter an item name." };
  let id: string;
  try { id = (await createItemRecord(name.trim())).id; }
  catch (error) { return { name, type: "create", error: homeError(error, true) }; }
  revalidatePath("/");
  redirect(`/?item=${id}`);
}
export async function createAction(itemId: string, _previous: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name");
  const type = text(form, "type");
  if (!isIdentity(itemId)) return { name, type, error: "Select a valid item first." };
  if (!name.trim() || !isActionType(type)) return { name, type, error: "Enter an action name and select a listed type." };
  try { await createActionRecord(itemId.toLowerCase(), name.trim(), type); }
  catch (error) { return { name, type, error: homeError(error, true) }; }
  revalidatePath("/");
  redirect(`/?item=${itemId.toLowerCase()}`);
}
