// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { homeApiBaseUrl } from "./server";
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, "", "file:///tmp/api", "https://user:secret@host", "http://host?x=1", "http://host#x", "http://host?", "http://host#", "bad"])("rejects invalid runtime config: %s", value => {
  vi.stubEnv("HOME_API_BASE_URL", value); expect(homeApiBaseUrl).toThrow("API configuration failure");
});
it.each(["http://127.0.0.1:5100", "https://backend.example/base"])("accepts server base %s", value => {
  vi.stubEnv("HOME_API_BASE_URL", ` ${value}/ `); expect(homeApiBaseUrl()).toBe(value);
});
