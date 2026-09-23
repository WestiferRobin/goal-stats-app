import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import ItemForm from "./item-form";
import { createItem } from "../domain/actions";
import type { FormState } from "../domain/types";
vi.mock("../domain/actions", () => ({ createItem: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("labels the native form and retains rejected input with associated feedback", async () => {
  vi.mocked(createItem).mockResolvedValue({ name: "Rejected name", type: "create", error: "Check your input." });
  render(<ItemForm />); fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "Rejected name" } });
  await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Create item" })));
  expect(screen.getByRole("alert").textContent).toBe("Check your input.");
  expect((screen.getByLabelText("Item name") as HTMLInputElement).value).toBe("Rejected name");
  expect(screen.getByLabelText("Item name").getAttribute("aria-describedby")).toBe("item-error");
});
it("disables repeated submit while pending and announces progress", async () => {
  let complete!: (state: FormState) => void;
  vi.mocked(createItem).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  render(<ItemForm />); await act(async () => fireEvent.submit(screen.getByRole("form")));
  expect((screen.getByRole("button", { name: "Creating item…" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Saving item");
  await act(async () => complete({ name: "", type: "create", error: "Try again" }));
});
