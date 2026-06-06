/**
 * E2E tests for /security — WAF demo dashboard.
 *
 * All network dependencies are intercepted via page.route() so:
 *   - The real /api/waf-demo route (which needs DEMO_KEY) never executes.
 *   - The real waf-demo.andrewlass.com (Cloudflare WAF) is never called.
 *
 * This makes the spec deterministic and runnable with no secrets.
 *
 * Architecture reminder: the component runs a TWO-PHASE fetch:
 *   1. POST /api/waf-demo  → returns {direct, wafFetch:{url,demoKey}}
 *   2. Browser GET wafFetch.url → goes through WAF (blocked = TypeError, pass = 200)
 */
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared WAF fetch URL patterns
// ---------------------------------------------------------------------------

const WAF_GLOB = "https://waf-demo.andrewlass.com/**";
const API_GLOB = "**/api/waf-demo";

// ---------------------------------------------------------------------------
// Fixtures — deterministic phase-1 responses per attack type
// ---------------------------------------------------------------------------

const FIXTURES = {
  benign: {
    attack: "benign",
    label: "Benign request",
    direct: { status: 200, body: '{"id":1,"name":"Alice"}' },
    wafFetch: { url: "https://waf-demo.andrewlass.com/api/users?id=1", demoKey: "e2e-key" },
    cached: false,
  },
  xss: {
    attack: "xss",
    label: "Reflected XSS",
    direct: { status: 200, body: "<script>alert(1)</script>" },
    wafFetch: {
      url: "https://waf-demo.andrewlass.com/api/echo?msg=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      demoKey: "e2e-key",
    },
    cached: false,
  },
  sqli: {
    attack: "sqli",
    label: "SQL Injection",
    direct: { status: 200, body: "all rows" },
    wafFetch: {
      url: "https://waf-demo.andrewlass.com/api/users?id=1'+OR+'1'%3D'1",
      demoKey: "e2e-key",
    },
    cached: false,
  },
  traversal: {
    attack: "traversal",
    label: "Path Traversal",
    direct: { status: 200, body: "flag{demo}" },
    wafFetch: {
      url: "https://waf-demo.andrewlass.com/api/file?name=..%2Fsecret-flag.txt",
      demoKey: "e2e-key",
    },
    cached: false,
  },
} as const;

// ---------------------------------------------------------------------------
// Helper — wire up intercepts for a single test run
// ---------------------------------------------------------------------------

type AttackKey = keyof typeof FIXTURES;

async function setupRoutes(
  page: Page,
  attack: AttackKey,
  wafOutcome: "pass" | "block",
) {
  // Intercept the proxy API call (phase 1)
  await page.route(API_GLOB, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FIXTURES[attack]),
    })
  );

  // Intercept the browser-side WAF fetch (phase 2)
  if (wafOutcome === "pass") {
    await page.route(WAF_GLOB, (route) =>
      route.fulfill({ status: 200, body: "OK" })
    );
  } else {
    // Aborting the WAF fetch simulates the CORS/WAF block (TypeError in the component)
    await page.route(WAF_GLOB, (route) => route.abort("blockedbyclient"));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("/security page", () => {
  test("returns 200 and shows WAF Demo heading", async ({ page }) => {
    const response = await page.goto("/security");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /WAF Demo/i })
    ).toBeVisible();
  });

  test("renders all four attack buttons", async ({ page }) => {
    await page.goto("/security");
    await expect(page.getByRole("button", { name: /XSS Attack/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /SQL Injection/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Path Traversal/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Benign Request/i })).toBeVisible();
  });

  test("benign request — both panels show 200 OK", async ({ page }) => {
    await setupRoutes(page, "benign", "pass");
    await page.goto("/security");

    await page.getByRole("button", { name: /Benign Request/i }).click();

    // Both panels should resolve to 200 OK
    await expect(page.getByText("STATUS 200 OK").first()).toBeVisible({ timeout: 10_000 });
    const statuses = page.getByText("STATUS 200 OK");
    await expect(statuses).toHaveCount(2);
  });

  test("benign request — unprotected panel shows response body", async ({ page }) => {
    await setupRoutes(page, "benign", "pass");
    await page.goto("/security");

    await page.getByRole("button", { name: /Benign Request/i }).click();

    // The direct panel should show the body from the fixture
    await expect(
      page.getByText('{"id":1,"name":"Alice"}')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("XSS attack — unprotected panel shows exploit, protected panel shows 403", async ({ page }) => {
    await setupRoutes(page, "xss", "block");
    await page.goto("/security");

    await page.getByRole("button", { name: /XSS Attack/i }).click();

    // Unprotected: 200 with payload
    await expect(
      page.getByText("STATUS 200 OK").first()
    ).toBeVisible({ timeout: 10_000 });

    // Protected: WAF blocked → 403
    await expect(page.getByText(/STATUS 403/i)).toBeVisible({ timeout: 10_000 });
  });

  test("XSS payload renders as escaped text in unprotected panel", async ({ page }) => {
    await setupRoutes(page, "xss", "block");
    await page.goto("/security");

    await page.getByRole("button", { name: /XSS Attack/i }).click();

    // The payload text should appear in a <pre> element, not executed as a script
    await expect(
      page.locator("pre").filter({ hasText: /<script>alert\(1\)<\/script>/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("SQL injection attack — unprotected shows 200, protected shows 403", async ({ page }) => {
    await setupRoutes(page, "sqli", "block");
    await page.goto("/security");

    await page.getByRole("button", { name: /SQL Injection/i }).click();

    await expect(
      page.getByText("STATUS 200 OK").first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/STATUS 403/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Path traversal attack — unprotected shows 200, protected shows 403", async ({ page }) => {
    await setupRoutes(page, "traversal", "block");
    await page.goto("/security");

    await page.getByRole("button", { name: /Path Traversal/i }).click();

    await expect(
      page.getByText("STATUS 200 OK").first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/STATUS 403/i)).toBeVisible({ timeout: 10_000 });
  });

  test("panels are not populated before any button is clicked", async ({ page }) => {
    await page.goto("/security");
    // No status banner should be present before interaction
    await expect(page.getByText(/STATUS \d+/i)).not.toBeVisible();
  });
});
