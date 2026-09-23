import "server-only";
import { ApiError } from "../api/error";

export function homeApiBaseUrl(): string {
  try {
    const raw = process.env.HOME_API_BASE_URL?.trim();
    if (!raw) throw new Error();
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || raw.includes("?") || raw.includes("#")) throw new Error();
    return url.toString().replace(/\/$/, "");
  } catch { throw new ApiError("configuration"); }
}
