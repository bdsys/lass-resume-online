/**
 * Standalone GitHub API mock server for Playwright E2E tests.
 *
 * Run directly with `node tests/fixtures/mock-server.mjs` (plain .mjs so it works
 * as a Playwright `webServer` shell command — no TS loader needed). Serving the
 * mock as a webServer (instead of globalSetup) is deliberate: webServers start
 * BEFORE globalSetup, so the mock is already up when `next build` prerenders the
 * pages and the build-time GitHub fetch hits the fixtures rather than falling back.
 *
 * Env:
 *   PORT            — listen port (default 9998; must match playwright.config.ts)
 *   MOCK_FAIL_MODE  — "1" returns 500 for every route (tests the fallback path)
 */
import http from "node:http";
import path from "node:path";
import fs from "node:fs";

const PORT = Number(process.env.PORT ?? 9998);
const FAIL_MODE = process.env.MOCK_FAIL_MODE === "1";

// Use process.cwd() (project root) so fixture paths resolve no matter how invoked.
const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures");

const FIXTURES = {
  "/users/bdsys": path.join(FIXTURES_DIR, "github-user.json"),
  "/users/bdsys/repos": path.join(FIXTURES_DIR, "github-repos.json"),
};

const server = http.createServer((req, res) => {
  if (FAIL_MODE) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Service Unavailable (mock fail mode)" }));
    return;
  }

  const url = req.url?.split("?")[0] ?? "";
  const fixturePath = FIXTURES[url];

  if (fixturePath) {
    const body = fs.readFileSync(fixturePath, "utf8");
    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": "59",
    });
    res.end(body);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: `No fixture for ${url}` }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[e2e] GitHub mock server listening on http://localhost:${PORT}`);
});

// Shut down cleanly when Playwright tears the webServer process down.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
