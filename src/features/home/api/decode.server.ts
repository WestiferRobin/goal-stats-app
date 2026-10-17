import "server-only";
import { ApiError } from "@/lib/api/error";
import { isIdentity } from "../domain/types";

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError("contract");
  return value as Record<string, unknown>;
}
export function identity(value: unknown): string {
  if (!isIdentity(value)) throw new ApiError("contract");
  return value.toLowerCase();
}
export function name(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || [...value].length > 200) throw new ApiError("contract");
  return value;
}
export function timestamp(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))) throw new ApiError("contract");
  return value;
}
export function array<T>(value: unknown, decode: (entry: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new ApiError("contract");
  return value.map(decode);
}
