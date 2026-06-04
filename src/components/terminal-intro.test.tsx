/**
 * Unit tests for the TerminalIntro client component.
 *
 * Asserts structural rendering only — timing/animation is tested with fake timers
 * at a basic level (we don't exhaustively replay the whole animation sequence).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalIntro } from "./terminal-intro";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TerminalIntro", () => {
  it("renders the terminal window chrome", () => {
    render(<TerminalIntro />);
    // The title bar shows the hostname
    expect(screen.getByText(/bdsys@portfolio/)).toBeInTheDocument();
  });

  it("renders with the correct accessibility role and label", () => {
    render(<TerminalIntro />);
    expect(
      screen.getByRole("presentation", { name: /terminal introduction/i })
    ).toBeInTheDocument();
  });

  it("starts rendering command lines after mount", async () => {
    render(<TerminalIntro />);
    // Advance timers to let the first character type
    await vi.runAllTimersAsync();
    // After all timers run, the idle prompt $ should be visible
    const prompts = screen.getAllByText("$");
    expect(prompts.length).toBeGreaterThan(0);
  });
});
