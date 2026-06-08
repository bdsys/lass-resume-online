/**
 * E2E tests for the homepage (/).
 *
 * The app is started by Playwright's webServer pointing GITHUB_API_BASE at the
 * fixture mock server, so GitHub data is deterministic and no real API is called.
 */
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("returns 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("renders Andrew Lass as heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Andrew Lass/i })).toBeVisible();
  });

  test("renders the GitHub avatar image", async ({ page }) => {
    await page.goto("/");
    const avatar = page.getByAltText(/Andrew Lass avatar/i);
    await expect(avatar).toBeVisible();
    // Avatar src must point to GitHub CDN (or the Next.js image optimizer URL)
    const src = await avatar.getAttribute("src");
    expect(src).toBeTruthy();
  });

  test("renders the hero summary text", async ({ page }) => {
    await page.goto("/");
    // Homepage now shows the first sentence of the curated resume summary.
    // Scope to <p> to avoid matching "Splunk (12+ years)" / "Nagios (12+ years)" <li>s.
    await expect(
      page.locator("p").filter({ hasText: /12\+ years/i })
    ).toBeVisible();
  });

  test("renders the location", async ({ page }) => {
    await page.goto("/");
    // Scope to the 📍 hero line — /Everett, WA/i alone also matches the footer's
    // "Made in Everett, Wash." ("Everett, Wa…"), which is a strict-mode violation.
    await expect(page.getByText("📍 Everett, WA")).toBeVisible();
  });

  test("renders mock repo count (proves live GitHub data path)", async ({ page }) => {
    await page.goto("/");
    // The mock fixture reports 12 public repos; the static fallback reports 13.
    // Asserting 12 proves the build prerendered with the mock server (not the
    // fallback) — i.e. the live data path is actually exercised end to end.
    const reposStat = page.getByText("Repos", { exact: true }).locator("..");
    await expect(reposStat).toContainText("12");
  });

  test("renders the terminal intro window", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/bdsys@portfolio/i)).toBeVisible();
  });

  test("nav links are present and route correctly", async ({ page }) => {
    await page.goto("/");

    // Portfolio
    await page.getByRole("link", { name: /portfolio/i }).first().click();
    await expect(page).toHaveURL("/portfolio");
    expect((await page.goto("/portfolio"))?.status()).toBe(200);

    // Resume
    await page.goto("/");
    await page.getByRole("link", { name: /resume/i }).first().click();
    await expect(page).toHaveURL("/resume");

    // Security
    await page.goto("/");
    await page.getByRole("link", { name: /security/i }).first().click();
    await expect(page).toHaveURL("/security");
  });

  test("footer GitHub link is present", async ({ page }) => {
    await page.goto("/");
    const githubLink = page.getByRole("link", { name: /github profile/i });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute("href", "https://github.com/bdsys");
  });

  test("footer email link is present", async ({ page }) => {
    await page.goto("/");
    const emailLink = page.getByRole("link", { name: /send email/i });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute("href", "mailto:andrew.lass2174@gmail.com");
  });

  test("skills section renders with known categories", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Cloud Security", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Infrastructure", exact: true })).toBeVisible();
  });
});
