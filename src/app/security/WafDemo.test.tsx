/**
 * Component tests for WafDemo.tsx (jsdom + Testing Library).
 *
 * The component runs a two-phase fetch:
 *   Phase 1 — POST /api/waf-demo (server proxy, returns direct result + wafFetch spec)
 *   Phase 2 — GET waf-demo.andrewlass.com (browser-side, WAF fires)
 *
 * All fetch calls are mocked via vi.stubGlobal so no real network is touched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { WafDemo } from "./WafDemo";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Build a mock Phase-1 Response (POST /api/waf-demo) */
function phase1Ok(
  attack: string,
  directStatus: number,
  directBody: string,
  wafUrl = "https://waf-demo.andrewlass.com/api/users?id=1",
) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      attack,
      label: attack === "benign" ? "Benign request" : "Reflected XSS",
      direct: { status: directStatus, body: directBody },
      wafFetch: { url: wafUrl, demoKey: "test-demo-key" },
      cached: false,
    }),
  } as unknown as Response;
}

/** Build a mock Phase-1 Response that indicates a server error */
function phase1Error(status = 500, errorMsg = "DEMO_KEY secret not configured") {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error: errorMsg }),
  } as unknown as Response;
}

/** Build a mock Phase-2 WAF Response */
function phase2Ok(status: number, body: string) {
  return {
    status,
    text: vi.fn().mockResolvedValue(body),
    headers: { get: vi.fn().mockReturnValue(null) },
  } as unknown as Response;
}

/** Click a button by (partial) label and flush React microtasks */
async function clickButton(label: RegExp | string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

describe("WafDemo render", () => {
  it("renders all four attack buttons", () => {
    render(<WafDemo />);
    expect(screen.getByRole("button", { name: /xss attack/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sql injection/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /path traversal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /benign request/i })).toBeInTheDocument();
  });

  it("buttons are enabled on initial render (not loading)", () => {
    render(<WafDemo />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).not.toBeDisabled();
    }
  });
});

// ---------------------------------------------------------------------------
// Benign flow — both panels show 200 OK
// ---------------------------------------------------------------------------

describe("benign attack", () => {
  it("shows 200 OK in both panels after a successful run", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(phase1Ok("benign", 200, "user data"))
      .mockResolvedValueOnce(phase2Ok(200, "user data waf"));

    render(<WafDemo />);
    await clickButton(/benign request/i);

    await waitFor(() => {
      // Both panels should show STATUS 200 OK
      const statuses = screen.getAllByText(/STATUS 200 OK/i);
      expect(statuses).toHaveLength(2);
    });
  });

  it("populates both panel bodies", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(phase1Ok("benign", 200, "direct-body"))
      .mockResolvedValueOnce(phase2Ok(200, "waf-body"));

    render(<WafDemo />);
    await clickButton(/benign request/i);

    await waitFor(() => {
      expect(screen.getByText("direct-body")).toBeInTheDocument();
      expect(screen.getByText("waf-body")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// XSS attack — unprotected exploited, protected blocked
// ---------------------------------------------------------------------------

describe("XSS attack", () => {
  it("unprotected panel shows 200, protected panel shows 403 when WAF fetch throws", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        phase1Ok("xss", 200, "<script>alert(1)</script>",
          "https://waf-demo.andrewlass.com/api/echo?msg=%3Cscript%3E")
      )
      .mockRejectedValueOnce(new TypeError("Failed to fetch")); // WAF block → no CORS

    render(<WafDemo />);
    await clickButton(/xss attack/i);

    await waitFor(() => {
      // Unprotected: 200
      expect(screen.getAllByText(/STATUS 200 OK/i).length).toBeGreaterThanOrEqual(1);
    });

    // Protected: 403 (inferred from CORS/WAF TypeError)
    await waitFor(() => {
      expect(screen.getByText(/STATUS 403/i)).toBeInTheDocument();
    });
  });

  it("XSS payload renders as plain text — not as injected HTML (no dangerouslySetInnerHTML)", async () => {
    const xssPayload = "<script>alert(1)</script>";
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(phase1Ok("xss", 200, xssPayload))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<WafDemo />);
    await clickButton(/xss attack/i);

    await waitFor(() => {
      // The payload should appear as text content, not as actual DOM elements.
      // If dangerouslySetInnerHTML were used, a <script> element would be created
      // and getByText would not find the raw string.
      const pre = screen.getByText(xssPayload);
      expect(pre.tagName).toBe("PRE");
      // No <script> tag should have been injected
      expect(document.querySelector("script[data-injected]")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Server error — error banner shown, panels not populated
// ---------------------------------------------------------------------------

describe("server error (phase 1 fails)", () => {
  it("shows an error banner when the proxy API returns not-ok", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(phase1Error(500, "DEMO_KEY secret not configured"));

    render(<WafDemo />);
    await clickButton(/xss attack/i);

    await waitFor(() => {
      expect(screen.getByText(/DEMO_KEY secret not configured/i)).toBeInTheDocument();
    });
  });

  it("does not show STATUS banners when there is a server error", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(phase1Error(500, "Server error: 500"));

    render(<WafDemo />);
    await clickButton(/benign request/i);

    await waitFor(() => {
      expect(screen.queryByText(/STATUS 200 OK/i)).toBeNull();
      expect(screen.queryByText(/STATUS 403/i)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state — buttons disabled while a run is in flight
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("disables all buttons while fetch is pending", async () => {
    let resolvePhase1!: (v: Response) => void;
    const deferred = new Promise<Response>((r) => { resolvePhase1 = r; });

    vi.mocked(globalThis.fetch).mockReturnValueOnce(deferred);

    render(<WafDemo />);

    // Kick off the attack (don't await — we want the pending state)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /xss attack/i }));
    });

    // All buttons should be disabled while the first fetch is still pending
    await waitFor(() => {
      for (const btn of screen.getAllByRole("button")) {
        expect(btn).toBeDisabled();
      }
    });

    // Resolve to clean up — prevents unhandled rejection warnings
    await act(async () => {
      resolvePhase1(phase1Error(500, "cleanup"));
    });
  });
});
