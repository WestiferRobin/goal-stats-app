import Link from "next/link";
import { listItems } from "../api/items.server";
import { listActions } from "../api/actions.server";
import { homeError } from "../domain/errors";
import type { Item, Action } from "../domain/types";
import ItemForm from "./item-form";
import ActionForm from "./action-form";

export default async function HomeView({ selectedId, invalidSelection = false }: { selectedId?: string; invalidSelection?: boolean }) {
  let items: Item[] = [];
  let actions: Action[] = [];
  let itemError: string | undefined;
  let actionError: string | undefined;
  try { items = await listItems(); } catch (error) { itemError = homeError(error); }
  const selected = items.find(item => item.id === selectedId);
  if (selected) {
    try { actions = await listActions(selected.id); } catch (error) { actionError = homeError(error); }
  }
  return <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-12">
    <h1 className="text-4xl font-semibold">GoalStats</h1>
    <p className="mt-4">A football analytics and prediction project.</p>
    <p className="mt-2">Development demo: persisted Item and Action records. Football features and authentication are not available.</p>
    <section aria-labelledby="items-heading" className="mt-10">
      <h2 id="items-heading" className="text-2xl font-semibold">Items</h2>
      {itemError ? <div><p role="alert">{itemError}</p><form action="/" method="get"><button>Retry Home</button></form></div> : <>
        {items.length === 0 ? <p>No items yet. Create the first item below.</p> : <ul>
          {items.map(item => <li key={item.id} className="my-3 break-words">
            <Link href={`/?item=${item.id}`} aria-current={selected?.id === item.id ? "true" : undefined}>{item.name}</Link> <span>({item.status})</span>
          </li>)}
        </ul>}
        <ItemForm />
      </>}
    </section>
    {invalidSelection && <p role="alert">Invalid item selection. Choose an item from the list.</p>}
    {!invalidSelection && selectedId && !selected && !itemError && <p role="alert">That item is no longer available. Select another item.</p>}
    {!selectedId && !invalidSelection && !itemError && <p>Select an item to see its action records.</p>}
    {selected && <section aria-labelledby="actions-heading" className="mt-10">
      <h2 id="actions-heading" className="break-words text-2xl font-semibold">Actions for {selected.name}</h2>
      {actionError ? <div><p role="alert">{actionError}</p><form action="/" method="get"><input type="hidden" name="item" value={selected.id} /><button>Retry actions</button></form></div> : <>
        {actions.length === 0 ? <p>No action records yet.</p> : <ul>
          {actions.map(action => <li key={action.id} className="my-3 break-words">{action.name} — {action.type}</li>)}
        </ul>}
        <ActionForm key={selected.id} itemId={selected.id} />
      </>}
    </section>}
  </main>;
}
