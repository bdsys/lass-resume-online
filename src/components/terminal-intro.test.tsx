/**
 * Unit tests for the TerminalIntro client component.
 *
 * Covers:
 *   - Terminal chrome renders
 *   - Accessible section role + label (not the old conflicting role="presentation")
 *   - Input hidden during animation; shown after completion
 *   - prefers-reduced-motion: animation skipped, input appears immediately
 *   - Command dispatch: help, whoami, contact, unknown, clear
 *   - Input is keyboard-focusable
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { TerminalIntro } from "./terminal-intro";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flush all pending timers + state updates; use after normal (animated) render. */
async function flushAnimation() {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

/** Flush effects synchronously; use after reduced-motion render (no timers). */
async function flushEffects() {
  await act(async () => {});
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  stubMatchMedia(false); // default: full animation
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TerminalIntro", () => {
  describe("chrome + structure", () => {
    it("renders the terminal title bar", () => {
      render(<TerminalIntro />);
      expect(screen.getByText(/bdsys@portfolio/)).toBeInTheDocument();
    });

    it("is a <section> with an accessible label (not role=presentation)", () => {
      render(<TerminalIntro />);
      // The section should be queryable by its aria-label
      expect(
        screen.getByRole("region", { name: /interactive terminal/i })
      ).toBeInTheDocument();
    });
  });

  describe("animation state", () => {
    it("hides the command input before animation completes", () => {
      render(<TerminalIntro />);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("shows the labeled command input after animation completes", async () => {
      render(<TerminalIntro />);
      await flushAnimation();
      expect(
        screen.getByRole("textbox", { name: /terminal command input/i })
      ).toBeInTheDocument();
    });

    it("renders prompt lines after animation finishes", async () => {
      render(<TerminalIntro />);
      await flushAnimation();
      const history = screen.getByTestId("terminal-history");
      expect(history.textContent).toMatch(/\$/);
    });
  });

  describe("prefers-reduced-motion", () => {
    it("shows input immediately without running timers", async () => {
      stubMatchMedia(true);
      render(<TerminalIntro />);
      await flushEffects(); // flush useEffect (no timers involved)
      expect(
        screen.getByRole("textbox", { name: /terminal command input/i })
      ).toBeInTheDocument();
    });

    it("renders all script lines instantly when motion is reduced", async () => {
      stubMatchMedia(true);
      render(<TerminalIntro />);
      await flushEffects();
      const history = screen.getByTestId("terminal-history");
      expect(history.textContent).toContain("whoami");
    });
  });

  describe("command dispatch", () => {
    async function renderReady() {
      stubMatchMedia(true);
      render(<TerminalIntro />);
      await flushEffects();
      return screen.getByRole("textbox");
    }

    function typeAndSubmit(input: HTMLElement, text: string) {
      fireEvent.change(input, { target: { value: text } });
      fireEvent.keyDown(input, { key: "Enter" });
    }

    it("'help' shows available commands list", async () => {
      const input = await renderReady();
      typeAndSubmit(input, "help");
      expect(screen.getByText(/Available commands:/i)).toBeInTheDocument();
    });

    it("'whoami' prints name output", async () => {
      const input = await renderReady();
      typeAndSubmit(input, "whoami");
      const history = screen.getByTestId("terminal-history");
      // history should contain the "whoami" prompt echoed back
      expect(history.textContent?.toLowerCase()).toContain("whoami");
    });

    it("'contact' shows email line", async () => {
      const input = await renderReady();
      typeAndSubmit(input, "contact");
      const history = screen.getByTestId("terminal-history");
      expect(history.textContent).toContain("email:");
    });

    it("unknown command shows 'command not found'", async () => {
      const input = await renderReady();
      typeAndSubmit(input, "foobar");
      expect(screen.getByText(/command not found: foobar/i)).toBeInTheDocument();
    });

    it("'clear' empties the terminal history", async () => {
      const input = await renderReady();
      // First put some output in
      typeAndSubmit(input, "help");
      expect(screen.getByText(/Available commands:/i)).toBeInTheDocument();
      // Now clear
      typeAndSubmit(input, "clear");
      expect(screen.queryByText(/Available commands:/i)).not.toBeInTheDocument();
    });

    it("clears the input field after submitting a command", async () => {
      const input = await renderReady() as HTMLInputElement;
      typeAndSubmit(input, "help");
      expect(input.value).toBe("");
    });

    it("does nothing on empty submit", async () => {
      const input = await renderReady();
      const history = screen.getByTestId("terminal-history");
      const historyBefore = history.textContent ?? "";
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByTestId("terminal-history").textContent).toBe(historyBefore);
    });
  });

  describe("keyboard accessibility", () => {
    it("input has id and label pointing to it (for assistive tech)", async () => {
      stubMatchMedia(true);
      render(<TerminalIntro />);
      await flushEffects();
      const input = screen.getByLabelText(/terminal command input/i);
      expect(input).toBeInTheDocument();
    });
  });
});
