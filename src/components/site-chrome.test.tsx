/**
 * Unit tests for the SiteChrome client component.
 *
 * Covers:
 *   - Renders Nav + Footer on normal routes (e.g. "/")
 *   - Hides Nav + Footer on the immersive /journey route
 *   - Always renders children inside <main>
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock next/navigation to control usePathname ──────────────────────────────

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// ── Mock Nav and Footer so we can detect their presence ─────────────────────

vi.mock("@/components/nav", () => ({
  Nav: () => <header data-testid="nav">Nav</header>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

// Import after mocks are set up
import { SiteChrome } from "./site-chrome";

beforeEach(() => {
  mockPathname = "/";
});

describe("SiteChrome", () => {
  describe("on normal routes", () => {
    it("renders Nav", () => {
      render(<SiteChrome><p>content</p></SiteChrome>);
      expect(screen.getByTestId("nav")).toBeInTheDocument();
    });

    it("renders Footer", () => {
      render(<SiteChrome><p>content</p></SiteChrome>);
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("renders children inside main", () => {
      render(<SiteChrome><p>content</p></SiteChrome>);
      expect(screen.getByRole("main")).toHaveTextContent("content");
    });
  });

  describe("on /journey (immersive route)", () => {
    beforeEach(() => {
      mockPathname = "/journey";
    });

    it("does NOT render Nav", () => {
      render(<SiteChrome><p>journey</p></SiteChrome>);
      expect(screen.queryByTestId("nav")).not.toBeInTheDocument();
    });

    it("does NOT render Footer", () => {
      render(<SiteChrome><p>journey</p></SiteChrome>);
      expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
    });

    it("still renders children inside main", () => {
      render(<SiteChrome><p>journey</p></SiteChrome>);
      expect(screen.getByRole("main")).toHaveTextContent("journey");
    });
  });

  describe("on /journey sub-paths", () => {
    beforeEach(() => {
      mockPathname = "/journey/sub";
    });

    it("also hides Nav + Footer", () => {
      render(<SiteChrome><p>sub</p></SiteChrome>);
      expect(screen.queryByTestId("nav")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
    });
  });
});
