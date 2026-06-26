/**
 * Unit tests for the Nav component.
 *
 * Nav renders the PlugInButton (a client component with canvas/refs); jsdom's
 * canvas.getContext("2d") returns null, which the component handles gracefully.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "./nav";

// ── WormholeProvider mock (PlugInButton now calls useWormhole()) ──────────────

vi.mock("@/components/transition/WormholeTransition", () => ({
  useWormhole: () => ({ play: vi.fn(), busy: false, disabled: false, setDisabled: vi.fn() }),
}));

// ── matchMedia stub (needed by PlugInButton) ─────────────────────────────────

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("Nav", () => {
  it("renders the site logo/name link", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /andrew lass/i })).toBeInTheDocument();
  });

  it("renders the main nav links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /security/i })).toBeInTheDocument();
  });

  it("portfolio link points to /portfolio", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /portfolio/i })).toHaveAttribute("href", "/portfolio");
  });

  it("renders the Plug in… CTA linking to /journey", () => {
    render(<Nav />);
    const plugIn = screen.getByRole("link", { name: /plug in/i });
    expect(plugIn).toBeInTheDocument();
    expect(plugIn).toHaveAttribute("href", "/journey");
  });
});
