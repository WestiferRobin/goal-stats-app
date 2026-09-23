export type ItemStatus = "active" | "archived";
export type ActionType = "create" | "update" | "delete";
export type Item = { id: string; name: string; status: ItemStatus; createdAt: string; updatedAt: string };
export type Action = { id: string; itemId: string; name: string; type: ActionType; createdAt: string; updatedAt: string };
export type FormState = { name: string; type: string; error?: string };

export function isIdentity(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    && value !== "00000000-0000-0000-0000-000000000000";
}
export function isActionType(value: unknown): value is ActionType {
  return value === "create" || value === "update" || value === "delete";
}
