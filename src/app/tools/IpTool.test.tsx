import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { IpTool } from "./IpTool";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ipResponse(ip: string) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ ip }),
  } as unknown as Response;
}

function errorResponse(status = 500) {
  return {
    ok: false,
    status,
  } as unknown as Response;
}

async function clickReveal() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /reveal my ip/i }));
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe("initial render", () => {
  it("shows the 'Reveal my IP' button", () => {
    render(<IpTool />);
    expect(screen.getByRole("button", { name: /reveal my ip/i })).toBeInTheDocument();
  });

  it("shows the curl hint for ip.andrewlass.com", () => {
    render(<IpTool />);
    // The hostname appears in multiple elements (terminal prompt + explainer code blocks)
    const els = screen.getAllByText(/ip\.andrewlass\.com/i);
    expect(els.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show an IP address on first render", () => {
    render(<IpTool />);
    // No IP-shaped text in the document
    expect(screen.queryByText(/\d+\.\d+\.\d+\.\d+/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("shows 'Detecting…' and disables the button while fetch is pending", async () => {
    let resolve!: (v: Response) => void;
    vi.mocked(globalThis.fetch).mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    render(<IpTool />);
    act(() => { fireEvent.click(screen.getByRole("button", { name: /reveal my ip/i })); });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /detecting/i })).toBeDisabled();
    });

    // Clean up — resolve to avoid unhandled rejection
    await act(async () => { resolve(errorResponse()); });
  });
});

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

describe("success state", () => {
  it("displays the returned IP address", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(ipResponse("203.0.113.42"));
    render(<IpTool />);
    await clickReveal();
    await waitFor(() => {
      expect(screen.getByText("203.0.113.42")).toBeInTheDocument();
    });
  });

  it("shows a Clear button after revealing IP", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(ipResponse("203.0.113.42"));
    render(<IpTool />);
    await clickReveal();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });
  });

  it("returns to idle state when Clear is clicked", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(ipResponse("203.0.113.42"));
    render(<IpTool />);
    await clickReveal();
    await waitFor(() => screen.getByRole("button", { name: /clear/i }));

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /clear/i })); });

    expect(screen.getByRole("button", { name: /reveal my ip/i })).toBeInTheDocument();
    expect(screen.queryByText("203.0.113.42")).toBeNull();
  });

  it("fetches /api/ip?format=json", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(ipResponse("1.2.3.4"));
    render(<IpTool />);
    await clickReveal();
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith("/api/ip?format=json");
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe("error state", () => {
  it("shows an error message when the fetch returns not-ok", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(errorResponse(500));
    render(<IpTool />);
    await clickReveal();
    await waitFor(() => {
      expect(screen.getByText(/http 500/i)).toBeInTheDocument();
    });
  });

  it("shows an error when fetch rejects (network error)", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<IpTool />);
    await clickReveal();
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it("shows a 'Try again' button on error", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(errorResponse(500));
    render(<IpTool />);
    await clickReveal();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });
  });

  it("retries the fetch when 'Try again' is clicked", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(ipResponse("9.9.9.9"));

    render(<IpTool />);
    await clickReveal();
    await waitFor(() => screen.getByRole("button", { name: /try again/i }));

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /try again/i })); });

    await waitFor(() => {
      expect(screen.getByText("9.9.9.9")).toBeInTheDocument();
    });
  });
});
