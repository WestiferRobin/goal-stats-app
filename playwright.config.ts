import { defineConfig, devices } from "@playwright/test";

const mode = process.env.APP_E2E_MODE;
if (mode !== undefined && !["demo", "football-live", "normalized"].includes(mode)) {
  throw new Error(`Unsupported APP_E2E_MODE: ${mode}. Leave unset for Home/Demo, or use demo, football-live or normalized. The legacy live Home runner is retired.`);
}

if (mode === "normalized" && (!/^[a-f0-9]{32}$/.test(process.env.NORMALIZED_SESSION ?? "") || process.env.APP_TEST_BASE_URL !== "http://127.0.0.1:3000")) {
  throw new Error("Normalized tests require the owned scripts/test-normalized.py runner.");
}

export default defineConfig({
  outputDir: mode === "normalized" ? "/artifacts/test-results" : "test-results",
  testDir: "./tests/e2e",
  testMatch: mode === "normalized" ? "normalized.spec.ts" : process.env.APP_E2E_MODE === "demo" ? "demo.spec.ts" : process.env.APP_E2E_MODE === "football-live" ? "live-football.spec.ts" : ["home.spec.ts", "demo.spec.ts"],
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: mode === "normalized" ? [["list"], ["html", {outputFolder:"/artifacts/playwright-report",open:"never"}], ["json", {outputFile:"/artifacts/results.json"}]] : "list",
  use: {
    baseURL: process.env.APP_TEST_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) } }],
});
