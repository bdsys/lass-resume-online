/**
 * Playwright globalSetup — starts the GitHub API mock server before any tests run.
 * The mock port must match MOCK_PORT in playwright.config.ts (9998).
 */
import { createMockServer } from "./mock-server.js";

const MOCK_PORT = 9998;

export default async function globalSetup() {
  const server = await createMockServer(MOCK_PORT);
  // Store on process so globalTeardown can close it
  (globalThis as Record<string, unknown>).__MOCK_SERVER__ = server;
  console.log(`[e2e] GitHub mock server listening on http://localhost:${MOCK_PORT}`);
}
