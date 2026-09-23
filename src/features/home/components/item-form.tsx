"use client";
import { useActionState } from "react";
import { createItem } from "../domain/actions";

export default function ItemForm() {
  const [state, action, pending] = useActionState(createItem, { name: "", type: "create" });
  return <form action={action} aria-label="Create item" aria-busy={pending}>
    <label htmlFor="item-name">Item name</label>
    <input id="item-name" name="name" required defaultValue={state.name} aria-describedby={state.error ? "item-error" : undefined} />
    {state.error && <p id="item-error" role="alert">{state.error}</p>}
    <button disabled={pending}>{pending ? "Creating item…" : "Create item"}</button>
    <p role="status">{pending ? "Saving item. Please wait." : ""}</p>
  </form>;
}
