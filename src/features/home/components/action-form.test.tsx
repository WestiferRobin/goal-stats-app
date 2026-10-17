import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import ActionForm from "./action-form";
import { createAction } from "../domain/actions";
import type { FormState } from "../domain/types";
vi.mock("../domain/actions", () => ({ createAction: vi.fn() }));
const id = "11111111-1111-4111-8111-111111111111";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("binds selected Item, labels fields, and retains rejected values", async () => {
  vi.mocked(createAction).mockResolvedValue({ name: "Record", type: "delete", error: "Check your input." });
  render(<ActionForm itemId={id} />);
  fireEvent.change(screen.getByLabelText("Action name"), { target: { value: "Record" } }); fireEvent.change(screen.getByLabelText("Action type"), { target: { value: "delete" } });
  await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Add action record" })));
  expect(vi.mocked(createAction).mock.calls[0][0]).toBe(id);
  expect((screen.getByLabelText("Action name") as HTMLInputElement).value).toBe("Record");
  expect((screen.getByLabelText("Action type") as HTMLSelectElement).value).toBe("delete");
  expect(screen.getByRole("alert").textContent).toBe("Check your input."); expect(screen.getByText(/does not delete/)).toBeTruthy();
});
it("announces pending state and disables repeated submit", async () => {
  let complete!: (state: FormState) => void;
  vi.mocked(createAction).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  render(<ActionForm itemId={id} />); await act(async () => fireEvent.submit(screen.getByRole("form")));
  expect((screen.getByRole("button", { name: "Adding record…" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Saving action");
  await act(async () => complete({ name: "", type: "create", error: "Try again" }));
});
