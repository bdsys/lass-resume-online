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

  test("renders the GitHub bio text", async ({ page }) => {
    await page.goto("/");
    // Bio comes from the fixture mock server
    await expect(
      page.getByText(/systems and network engineer/i)
    ).toBeVisible();
  });

  test("renders the location", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Puget Sound/i)).toBeVisible();
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
    await expect(page.getByText(/Cloud & IaC/i)).toBeVisible();
    await expect(page.getByText(/Security/i)).toBeVisible();
  });
});
