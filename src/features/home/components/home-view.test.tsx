import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import HomeView from "./home-view";
import { listItems } from "../api/items.server";
import { listActions } from "../api/actions.server";
import { ApiError } from "@/lib/api/error";
vi.mock("../api/items.server", () => ({ listItems: vi.fn() }));
vi.mock("../api/actions.server", () => ({ listActions: vi.fn() }));
vi.mock("../domain/actions", () => ({ createItem: vi.fn(), createAction: vi.fn() }));
const item = { id: "11111111-1111-4111-8111-111111111111", name: "Demo", status: "active" as const, createdAt: "2026-09-23T10:00:00Z", updatedAt: "2026-09-23T10:00:00Z" };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(listItems).mockResolvedValue([]); vi.mocked(listActions).mockResolvedValue([]); });
it("renders shell, empty state and labelled Item form", async () => {
  render(await HomeView({})); expect(screen.getByRole("main")).toBeTruthy(); expect(screen.getByRole("heading", { name: "GoalStats" })).toBeTruthy();
  expect(screen.getByText(/No items yet/)).toBeTruthy(); expect(screen.getByLabelText("Item name")).toBeTruthy(); expect(listActions).not.toHaveBeenCalled();
});
it("renders persisted Items, selected Actions and nested form", async () => {
  vi.mocked(listItems).mockResolvedValue([item]); vi.mocked(listActions).mockResolvedValue([{ ...item, itemId: item.id, type: "create", name: "First action" }]);
  render(await HomeView({ selectedId: item.id }));
  expect(screen.getByRole("link", { name: "Demo" }).getAttribute("aria-current")).toBe("true");
  expect(screen.getByRole("heading", { name: "Actions for Demo" })).toBeTruthy(); expect(screen.getByText("First action — create")).toBeTruthy();
  expect(screen.getByRole("form", { name: "Add action record" })).toBeTruthy(); expect(listActions).toHaveBeenCalledWith(item.id);
});
it("renders empty Actions", async () => { vi.mocked(listItems).mockResolvedValue([item]); render(await HomeView({ selectedId: item.id })); expect(screen.getByText("No action records yet.")).toBeTruthy(); });
it("recovers invalid and missing selection", async () => {
  render(await HomeView({ invalidSelection: true })); expect(screen.getByRole("alert").textContent).toContain("Invalid item"); cleanup();
  render(await HomeView({ selectedId: item.id })); expect(screen.getByRole("alert").textContent).toContain("no longer available");
});
it.each([new ApiError("network"), new ApiError("configuration"), new ApiError("contract")])("keeps expected failures in Home", async error => {
  vi.mocked(listItems).mockRejectedValue(error); render(await HomeView({})); expect(screen.getByRole("button", { name: "Retry Home" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "GoalStats" })).toBeTruthy(); expect(screen.queryByRole("form", { name: "Create item" })).toBeNull();
});
it("retains Items after nested missing-resource failure", async () => {
  vi.mocked(listItems).mockResolvedValue([item]); vi.mocked(listActions).mockRejectedValue(new ApiError("http", 404));
  render(await HomeView({ selectedId: item.id })); expect(screen.getByRole("alert").textContent).toContain("no longer available"); expect(screen.getByRole("link", { name: "Demo" })).toBeTruthy();
});
it("propagates bugs to the unexpected error boundary", async () => { vi.mocked(listItems).mockRejectedValue(new Error("bug")); await expect(HomeView({})).rejects.toThrow("bug"); });
