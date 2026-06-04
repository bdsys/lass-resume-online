/**
 * Tiny HTTP server that mocks the GitHub REST API for Playwright E2E tests.
 * Serves deterministic fixtures so CI never touches the real GitHub API.
 *
 * Set MOCK_FAIL_MODE=1 to return 500 for all routes — tests the fallback path.
 */
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURES: Record<string, string> = {
  "/users/bdsys": path.join(__dirname, "github-user.json"),
  "/users/bdsys/repos": path.join(__dirname, "github-repos.json"),
};

export function createMockServer(port: number, failMode = false) {
  const server = http.createServer((req, res) => {
    if (failMode) {
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

  return new Promise<http.Server>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}
