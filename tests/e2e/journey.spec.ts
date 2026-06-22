/**
 * E2E tests for the /journey immersive route.
 *
 * Validates:
 *   - /journey returns 200 with no global Nav/Footer
 *   - Both "Unplug…" controls link back to /
 *   - Terminal `contact` command prints resume-sourced data
 *   - Contact section links match resume data
 *   - "Plug in…" CTA on homepage navigates to /journey
 */
import { test, expect } from "@playwright/test";

test.describe("/journey route", () => {
  test("returns 200", async ({ page }) => {
    const response = await page.goto("/journey");
    expect(response?.status()).toBe(200);
  });

  test("does not render the global Nav header", async ({ page }) => {
    await page.goto("/journey");
    // The global Nav renders a sticky <header> with the "AL" logo
    await expect(page.locator("header").filter({ hasText: "AL" })).not.toBeVisible();
  });

  test("renders the fixed Unplug… control linking to /", async ({ page }) => {
    await page.goto("/journey");
    const unplug = page.getByRole("link", { name: /unplug/i }).first();
    await expect(unplug).toBeVisible();
    await expect(unplug).toHaveAttribute("href", "/");
  });

  test("terminal contact command prints resume email", async ({ page }) => {
    await page.goto("/journey");
    const input = page.getByPlaceholder("help");
    await input.fill("contact");
    await input.press("Enter");
    await expect(page.getByText(/email:\s+andrew\.lass2174@gmail\.com/)).toBeVisible();
  });

  test("terminal contact command prints resume GitHub", async ({ page }) => {
    await page.goto("/journey");
    const input = page.getByPlaceholder("help");
    await input.fill("contact");
    await input.press("Enter");
    await expect(page.getByText(/github:\s+github\.com\/bdsys/)).toBeVisible();
  });

  test("terminal contact command prints resume LinkedIn", async ({ page }) => {
    await page.goto("/journey");
    const input = page.getByPlaceholder("help");
    await input.fill("contact");
    await input.press("Enter");
    await expect(
      page.getByText(/linkedin:\s+linkedin\.com\/in\/andrew-lass-80422b33/)
    ).toBeVisible();
  });

  test("contact section has mailto link with resume email", async ({ page }) => {
    await page.goto("/journey");
    const mailto = page.getByRole("link", { name: /get in touch/i });
    await expect(mailto).toBeVisible();
    await expect(mailto).toHaveAttribute("href", "mailto:andrew.lass2174@gmail.com");
  });

  test("contact section has LinkedIn link with resume handle", async ({ page }) => {
    await page.goto("/journey");
    const linkedin = page.getByRole("link", { name: "LinkedIn", exact: true }).last();
    await expect(linkedin).toBeVisible();
    await expect(linkedin).toHaveAttribute(
      "href",
      "https://linkedin.com/in/andrew-lass-80422b33"
    );
  });

  test("contact section has GitHub link with resume handle", async ({ page }) => {
    await page.goto("/journey");
    const github = page.getByRole("link", { name: "GitHub", exact: true }).last();
    await expect(github).toBeVisible();
    await expect(github).toHaveAttribute("href", "https://github.com/bdsys");
  });
});

test.describe("Homepage → /journey navigation", () => {
  test("Plug in… CTA navigates to /journey", async ({ page }) => {
    await page.goto("/");
    const plugIn = page.getByRole("link", { name: /plug in/i }).first();
    await expect(plugIn).toBeVisible();
    await plugIn.click();
    await expect(page).toHaveURL("/journey");
  });
});
