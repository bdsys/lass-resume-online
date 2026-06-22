/**
 * Unit tests for the PlugInButton client component.
 *
 * Covers:
 *   - Renders a link with the correct href, label, and aria-label
 *   - Both "pill" and "toolbar" variants render without error
 *   - Canvas element is present and aria-hidden
 *   - Reduced-motion path doesn't throw
 *   - Hover/focus state transitions don't throw
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlugInButton } from "./plug-in-button";

// ── matchMedia stub ───────────────────────────────────────────────────────────

function stubMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  stubMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlugInButton", () => {
  describe("defaults", () => {
    it("renders a link to /journey with the default label", () => {
      render(<PlugInButton />);
      const link = screen.getByRole("link", { name: /plug in/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/journey");
    });

    it("displays the label text", () => {
      render(<PlugInButton label="Plug in…" />);
      expect(screen.getByText("Plug in…")).toBeInTheDocument();
    });
  });

  describe("props", () => {
    it("uses the provided href", () => {
      render(<PlugInButton href="/" label="◂ Unplug…" />);
      const link = screen.getByRole("link", { name: /unplug/i });
      expect(link).toHaveAttribute("href", "/");
    });

    it("uses the provided label as aria-label", () => {
      render(<PlugInButton label="◂ Unplug — back to andrewlass.com" />);
      expect(
        screen.getByLabelText("◂ Unplug — back to andrewlass.com")
      ).toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("renders the pill variant without error", () => {
      const { container } = render(<PlugInButton variant="pill" />);
      expect(container.querySelector("a")).toBeInTheDocument();
    });

    it("renders the toolbar variant without error", () => {
      const { container } = render(<PlugInButton variant="toolbar" />);
      expect(container.querySelector("a")).toBeInTheDocument();
    });
  });

  describe("canvas", () => {
    it("contains a canvas element that is aria-hidden", () => {
      const { container } = render(<PlugInButton />);
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("reduced motion", () => {
    it("renders without error when prefers-reduced-motion is active", () => {
      stubMatchMedia(true);
      const { container } = render(<PlugInButton />);
      expect(container.querySelector("a")).toBeInTheDocument();
    });
  });

  describe("hover/focus", () => {
    it("does not throw on mouseEnter/mouseLeave", () => {
      render(<PlugInButton />);
      const link = screen.getByRole("link");
      expect(() => {
        fireEvent.mouseEnter(link);
        fireEvent.mouseLeave(link);
      }).not.toThrow();
    });

    it("does not throw on focus/blur", () => {
      render(<PlugInButton />);
      const link = screen.getByRole("link");
      expect(() => {
        fireEvent.focus(link);
        fireEvent.blur(link);
      }).not.toThrow();
    });
  });
});
