/**
 * Unit tests for the JourneyExperience client component.
 *
 * Covers:
 *   - Contact data sourced from resume.json (terminal `contact` command + bottom links)
 *   - Smoke render: component mounts without error
 *   - Terminal input works: typing a command + Enter produces output
 *   - Reduced-motion render doesn't crash
 *   - Welcome message appears on mount
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getResume } from "@/lib/resume";
import { JourneyExperience } from "./JourneyExperience";

// ── Resume data for assertions ────────────────────────────────────────────────

const resume = getResume();
const { contact } = resume;

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

/**
 * Render the component and type a command into the terminal input, pressing Enter.
 * Returns the container for further assertions.
 */
function renderAndRunCommand(cmd: string) {
  const result = render(<JourneyExperience showPacketFlow={false} />);
  const input = screen.getByPlaceholderText("help");
  fireEvent.change(input, { target: { value: cmd } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  return result;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  stubMatchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("JourneyExperience", () => {
  describe("smoke render", () => {
    it("mounts without error", () => {
      expect(() => render(<JourneyExperience showPacketFlow={false} />)).not.toThrow();
    });

    it("renders the welcome message", () => {
      render(<JourneyExperience showPacketFlow={false} />);
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });

  describe("terminal contact command", () => {
    it("outputs the resume email", () => {
      renderAndRunCommand("contact");
      expect(screen.getByText(new RegExp(`email:\\s+${contact.email}`))).toBeInTheDocument();
    });

    it("outputs the resume GitHub handle", () => {
      renderAndRunCommand("contact");
      expect(
        screen.getByText(new RegExp(`github:\\s+github\\.com/${contact.github}`))
      ).toBeInTheDocument();
    });

    it("outputs the resume LinkedIn handle", () => {
      renderAndRunCommand("contact");
      expect(
        screen.getByText(new RegExp(`linkedin:\\s+linkedin\\.com/in/${contact.linkedin}`))
      ).toBeInTheDocument();
    });
  });

  describe("bottom Contact section links", () => {
    it("has a mailto link using resume email", () => {
      const { container } = render(<JourneyExperience showPacketFlow={false} />);
      const mailto = container.querySelector(`a[href="mailto:${contact.email}"]`);
      expect(mailto).toBeInTheDocument();
      expect(mailto).toHaveTextContent("Get in touch");
    });

    it("has a LinkedIn link using resume handle", () => {
      const { container } = render(<JourneyExperience showPacketFlow={false} />);
      const linkedin = container.querySelector(
        `a[href="https://linkedin.com/in/${contact.linkedin}"]`
      );
      expect(linkedin).toBeInTheDocument();
      expect(linkedin).toHaveTextContent("LinkedIn");
    });

    it("has a GitHub link using resume handle", () => {
      const { container } = render(<JourneyExperience showPacketFlow={false} />);
      const github = container.querySelector(
        `a[href="https://github.com/${contact.github}"]`
      );
      expect(github).toBeInTheDocument();
      expect(github).toHaveTextContent("GitHub");
    });
  });

  describe("terminal help command", () => {
    it("lists available commands", () => {
      renderAndRunCommand("help");
      expect(screen.getByText(/available commands/i)).toBeInTheDocument();
    });
  });

  describe("reduced motion", () => {
    it("renders without error when prefers-reduced-motion is active", () => {
      stubMatchMedia(true);
      expect(() => render(<JourneyExperience showPacketFlow={false} />)).not.toThrow();
    });
  });

  describe("keyboard interaction", () => {
    it("clears history on 'clear' command", () => {
      renderAndRunCommand("help");
      // Confirm something rendered
      expect(screen.getByText(/available commands/i)).toBeInTheDocument();
      // Now run "clear"
      const input = screen.getByPlaceholderText("help");
      fireEvent.change(input, { target: { value: "clear" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      // Welcome + help output should be gone
      expect(screen.queryByText(/available commands/i)).not.toBeInTheDocument();
    });
  });
});
