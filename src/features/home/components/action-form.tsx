"use client";
import { useActionState } from "react";
import { createAction } from "../domain/actions";

export default function ActionForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(createAction.bind(null, itemId), { name: "", type: "create" });
  return <form action={action} aria-label="Add action record" aria-busy={pending}>
    <label htmlFor="action-name">Action name</label>
    <input id="action-name" name="name" required defaultValue={state.name} aria-describedby={state.error ? "action-error" : undefined} />
    <label htmlFor="action-type">Action type</label>
    <select id="action-type" name="type" key={state.type} defaultValue={state.type} aria-describedby={state.error ? "action-help action-error" : "action-help"}>
      <option value="create">create</option><option value="update">update</option><option value="delete">delete</option>
    </select>
    <p id="action-help">The type labels a record; choosing delete does not delete the item.</p>
    {state.error && <p id="action-error" role="alert">{state.error}</p>}
    <button disabled={pending}>{pending ? "Adding record…" : "Add action record"}</button>
    <p role="status">{pending ? "Saving action record. Please wait." : ""}</p>
  </form>;
}
