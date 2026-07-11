import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: {
    command: "node scripts/playwright-test-server.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});
