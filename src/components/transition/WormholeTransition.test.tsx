/**
 * Unit tests for WormholeProvider, useWormhole, and WormholeToggle.
 *
 * Covers:
 *   - useWormhole throws without a provider
 *   - WormholeToggle renders and reflects the disabled state
 *   - WormholeToggle persists its state to localStorage
 *   - play() while disabled calls router.push directly (no animation)
 *   - play() while enabled fires router.push (canvas is null in jsdom so
 *     playWormhole falls back immediately via the null-ctx early-exit path)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WormholeProvider, useWormhole, WormholeToggle } from "./WormholeTransition";

// ── next/navigation mock ──────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, prefetch: mockPrefetch }),
}));

// ── matchMedia stub (used by WormholeProvider internally) ────────────────────

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
  mockPush.mockClear();
  mockPrefetch.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── helpers ───────────────────────────────────────────────────────────────────

/** A test component that exposes useWormhole via rendered text. */
function DisabledDisplay() {
  const { disabled } = useWormhole();
  return <span data-testid="disabled">{String(disabled)}</span>;
}

/** A test component that calls play() on click. */
function PlayButton({ href = "/journey", direction }: { href?: string; direction: "plug" | "unplug" }) {
  const { play } = useWormhole();
  return (
    <button onClick={() => play({ href, direction })}>go</button>
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("useWormhole", () => {
  it("throws when used outside <WormholeProvider>", () => {
    // Suppress React's error boundary console noise in this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      function Bad() { useWormhole(); return null; }
      render(<Bad />);
    }).toThrow("useWormhole must be used within <WormholeProvider>");
    spy.mockRestore();
  });
});

describe("WormholeToggle", () => {
  it("renders a checkbox labeled 'Disable animations'", () => {
    render(
      <WormholeProvider>
        <WormholeToggle />
      </WormholeProvider>
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText(/disable animations/i)).toBeInTheDocument();
  });

  it("is unchecked by default", () => {
    render(
      <WormholeProvider>
        <WormholeToggle />
      </WormholeProvider>
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("persists the disabled state to localStorage on change", () => {
    render(
      <WormholeProvider>
        <WormholeToggle />
        <DisabledDisplay />
      </WormholeProvider>
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(localStorage.getItem("wormhole:disabled")).toBe("1");
    expect(screen.getByTestId("disabled")).toHaveTextContent("true");

    fireEvent.click(checkbox);
    expect(localStorage.getItem("wormhole:disabled")).toBe("0");
    expect(screen.getByTestId("disabled")).toHaveTextContent("false");
  });
});

describe("WormholeProvider.play()", () => {
  it("calls router.push directly when disabled (no animation)", () => {
    localStorage.setItem("wormhole:disabled", "1");
    render(
      <WormholeProvider>
        <PlayButton href="/journey" direction="plug" />
      </WormholeProvider>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(mockPush).toHaveBeenCalledWith("/journey");
  });

  it("calls router.push when the canvas context is null (jsdom fallback)", async () => {
    render(
      <WormholeProvider>
        <PlayButton href="/" direction="unplug" />
      </WormholeProvider>
    );
    fireEvent.click(screen.getByRole("button"));
    // jsdom canvas.getContext("2d") returns null → onSwap fires immediately
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });
});
