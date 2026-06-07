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
 * CI command: see .github/workflows/e2e.yml (installs chromium then runs this config).
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
  // Two web servers, launched together by Playwright BEFORE globalSetup:
  //   1. the GitHub API mock — must be up before the app builds, so `next build`
  //      prerenders pages with the fixture data instead of the static fallback.
  //   2. the app — waits for the mock, then builds + starts pointed at it.
  // Running the mock here (not in globalSetup) is the whole fix: globalSetup runs
  // AFTER the webServer build, which is why the build used to bake in the fallback.
  webServer: [
    {
      command: `node tests/fixtures/mock-server.mjs`,
      url: `http://localhost:${MOCK_PORT}/users/bdsys`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { PORT: String(MOCK_PORT) },
    },
    {
      // wait for the mock → build (build-time fetch hits the mock) → start
      command: `node tests/fixtures/wait-for-mock.mjs && GITHUB_API_BASE=http://localhost:${MOCK_PORT} npm run build && GITHUB_API_BASE=http://localhost:${MOCK_PORT} npm run start -- -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        GITHUB_API_BASE: `http://localhost:${MOCK_PORT}`,
        MOCK_URL: `http://localhost:${MOCK_PORT}/users/bdsys`,
      },
    },
  ],
});
