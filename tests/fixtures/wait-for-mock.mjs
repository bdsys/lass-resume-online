/**
 * Blocks until the E2E GitHub mock server is accepting requests, then exits 0.
 *
 * Used in the app `webServer` command so `next build` never starts before the mock
 * is up — guaranteeing the build-time GitHub fetch hits the fixtures. Playwright
 * "simultaneously" launches webServer array entries, so we can't assume the mock
 * entry is ready first; this poll makes the ordering deterministic.
 *
 * Env: MOCK_URL (default http://localhost:9998/users/bdsys), TIMEOUT_MS (default 30000).
 */
const URL = process.env.MOCK_URL ?? "http://localhost:9998/users/bdsys";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 30_000);
const INTERVAL_MS = 250;

const deadline = Date.now() + TIMEOUT_MS;

async function ready() {
  try {
    const res = await fetch(URL);
    return res.status === 200;
  } catch {
    return false;
  }
}

while (Date.now() < deadline) {
  if (await ready()) {
    console.log(`[e2e] mock server ready at ${URL}`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}

console.error(`[e2e] mock server did not become ready at ${URL} within ${TIMEOUT_MS}ms`);
process.exit(1);
