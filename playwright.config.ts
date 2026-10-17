import { defineConfig, devices } from "@playwright/test";

const mode = process.env.APP_E2E_MODE;
if (mode !== undefined && !["demo", "football-live"].includes(mode)) {
  throw new Error(`Unsupported APP_E2E_MODE: ${mode}. Leave unset for Home/Demo, or use demo or football-live. The legacy live Home runner is retired.`);
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: process.env.APP_E2E_MODE === "demo" ? "demo.spec.ts" : process.env.APP_E2E_MODE === "football-live" ? "live-football.spec.ts" : ["home.spec.ts", "demo.spec.ts"],
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.APP_TEST_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) } }],
});
