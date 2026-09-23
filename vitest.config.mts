import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)), "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs,cts,cjs}"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
  },
});
