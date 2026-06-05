/**
 * Playwright E2E configuration.
 *
 * IMPORTANT — local browser limitation:
 * Playwright's prebuilt Chromium binaries do not support Ubuntu 26.04.
 * E2E tests run in GitHub Actions CI (ubuntu-22.04) where `playwright install chromium`
 * works correctly.
 *
 * To run E2E locally:
 *   - macOS / Windows / Ubuntu ≤ 24.04: `npx playwright install chromium` then `npm run test:e2e`
 *   - Ubuntu 26.04 (WSL2): push to dev and let CI run them, or set PLAYWRIGHT_EXECUTABLE_PATH
 *     to a Chromium/Chrome binary you install separately.
 *
 * CI command: see .github/workflows/ci.yml (e2e job installs chromium then runs this config).
 */
import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3001;
const MOCK_PORT = 9998;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,  // keep to 1 — they share the same dev server + mock server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // The mock server is started/stopped by globalSetup/globalTeardown.
  // The Next.js app is pointed at the mock server via GITHUB_API_BASE.
  globalSetup: "./tests/fixtures/setup.ts",
  globalTeardown: "./tests/fixtures/teardown.ts",
  webServer: {
    // Build once then start the Node server; re-use between test runs locally
    command: `GITHUB_API_BASE=http://localhost:${MOCK_PORT} npm run build && GITHUB_API_BASE=http://localhost:${MOCK_PORT} npm run start -- -p ${APP_PORT}`,
    port: APP_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      GITHUB_API_BASE: `http://localhost:${MOCK_PORT}`,
    },
  },
});
