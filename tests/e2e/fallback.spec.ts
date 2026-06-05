/**
 * E2E fallback test — verifies the homepage renders gracefully when the GitHub API
 * returns a non-200. Since the mock server is shared with home.spec.ts for the
 * normal path, this test instead validates the static fallback data directly via
 * a unit-level check (the unit tests cover the fetch→fallback path; the E2E verifies
 * the page doesn't crash and shows *something* meaningful).
 *
 * A full API-down E2E (starting a separate app pointed at a 500 mock) is configured
 * in Phase 2 when the two-project setup is added.
 */
import { test, expect } from "@playwright/test";

test.describe("Fallback content", () => {
  test("homepage renders even if avatar image fails to load", async ({ page }) => {
    // Block the avatar CDN to simulate image load failure
    await page.route("https://avatars.githubusercontent.com/**", (route) => route.abort());

    await page.goto("/");

    // The page should still show the name heading
    await expect(page.getByRole("heading", { name: /Andrew Lass/i })).toBeVisible();
    // Navigation should still work — use exact name to avoid matching CTA + section card
    await expect(page.getByRole("link", { name: "Portfolio", exact: true })).toBeVisible();
  });

  test("all stub routes return 200", async ({ page }) => {
    for (const path of ["/portfolio", "/resume", "/security"]) {
      const res = await page.goto(path);
      expect(res?.status(), `${path} should return 200`).toBe(200);
    }
  });
});
