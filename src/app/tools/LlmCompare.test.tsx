import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { LlmCompare } from "./LlmCompare";
import type { LlmCompareResponse } from "@/app/api/llm-compare/route";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT = "Help me plan a fun day in Everett today.";

function successResponse(
  claudeText = "Claude says: visit the waterfront.",
  geminiText = "Gemini says: check out the farmers market.",
  prompt = DEFAULT_PROMPT,
): Partial<LlmCompareResponse> {
  return {
    prompt,
    claude: { text: claudeText, model: "claude-haiku-4-5", latencyMs: 800, inputTokens: 10, outputTokens: 50 },
    gemini: { text: geminiText, model: "gemini-2.5-flash", latencyMs: 600 },
  };
}

function okFetch(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function errFetch(status: number, body: unknown) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

async function clickCompare() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^compare$/i }));
  });
}

// ---------------------------------------------------------------------------
// Setup — real timers for all tests except the cooldown-expiry test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

describe("initial render", () => {
  it("shows the default prompt in the textarea", () => {
    render(<LlmCompare />);
    const textarea = screen.getByRole("textbox");
    expect((textarea as HTMLTextAreaElement).value).toBe(DEFAULT_PROMPT);
  });

  it("shows the Compare button enabled", () => {
    render(<LlmCompare />);
    expect(screen.getByRole("button", { name: /^compare$/i })).not.toBeDisabled();
  });

  it("shows placeholder text in both panels", () => {
    render(<LlmCompare />);
    const placeholders = screen.getAllByText(/press compare to see a response/i);
    expect(placeholders).toHaveLength(2);
  });

  it("shows the Claude Haiku and Gemini Flash panel labels", () => {
    render(<LlmCompare />);
    expect(screen.getByText(/claude haiku/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini flash/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("shows 'Comparing…' and disables button while fetch is pending", async () => {
    let resolve!: (v: Response) => void;
    vi.mocked(globalThis.fetch).mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    render(<LlmCompare />);
    act(() => { fireEvent.click(screen.getByRole("button", { name: /^compare$/i })); });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /comparing/i })).toBeDisabled();
    });

    // Clean up — resolve to avoid unhandled rejection warnings
    await act(async () => { resolve(errFetch(500, { error: "cleanup" })); });
  });

  it("shows 'Generating…' in both panels while loading", async () => {
    let resolve!: (v: Response) => void;
    vi.mocked(globalThis.fetch).mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    render(<LlmCompare />);
    act(() => { fireEvent.click(screen.getByRole("button", { name: /^compare$/i })); });

    await waitFor(() => {
      const generatingEls = screen.getAllByText(/generating/i);
      expect(generatingEls.length).toBeGreaterThanOrEqual(2);
    });

    await act(async () => { resolve(errFetch(500, { error: "cleanup" })); });
  });
});

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

describe("success state", () => {
  it("shows both model responses after a successful compare", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(successResponse()));
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByText(/visit the waterfront/i)).toBeInTheDocument();
      expect(screen.getByText(/farmers market/i)).toBeInTheDocument();
    });
  });

  it("shows latency for each provider", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(successResponse()));
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByText(/800ms/)).toBeInTheDocument();
      expect(screen.getByText(/600ms/)).toBeInTheDocument();
    });
  });

  it("sends the current prompt value to the API", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(successResponse()));
    render(<LlmCompare />);

    const textarea = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "What's good in Seattle?" } });
    });

    await clickCompare();

    const [, callOptions] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((callOptions as RequestInit).body as string) as { prompt: string };
    expect(body.prompt).toBe("What's good in Seattle?");
  });

  it("posts to /api/llm-compare", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(successResponse()));
    render(<LlmCompare />);
    await clickCompare();
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      "/api/llm-compare",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the Compare button disabled during cooldown after success", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(successResponse()));
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^compare$/i })).toBeDisabled();
    });
  });

  it("shows the countdown timer text during cooldown", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(successResponse()));
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      // The countdown text should appear — format: "Next compare available in Xs"
      expect(screen.getByText(/next compare available in/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------

describe("error state — 429 rate limit", () => {
  it("shows the rate-limit error message", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      errFetch(429, { error: "Rate limit exceeded — please wait.", retryAfterSeconds: 60 }),
    );
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  it("disables the Compare button after a 429", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      errFetch(429, { error: "Rate limit exceeded", retryAfterSeconds: 60 }),
    );
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^compare$/i })).toBeDisabled();
    });
  });
});

describe("error state — server error", () => {
  it("shows the error message from the server", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      errFetch(500, { error: "Missing API key(s): ANTHROPIC_API_KEY" }),
    );
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByText(/Missing API key/)).toBeInTheDocument();
    });
  });
});

describe("error state — network failure", () => {
  it("shows an error when fetch rejects", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Per-provider error — one panel shows text, other shows error
// ---------------------------------------------------------------------------

describe("per-provider error isolation", () => {
  it("shows Claude's error text in its panel when only Claude fails", async () => {
    const body: Partial<LlmCompareResponse> = {
      prompt: DEFAULT_PROMPT,
      claude: { error: "Anthropic timeout" },
      gemini: { text: "Gemini is fine", model: "gemini-2.5-flash", latencyMs: 500 },
    };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(okFetch(body));
    render(<LlmCompare />);
    await clickCompare();

    await waitFor(() => {
      expect(screen.getByText(/Anthropic timeout/)).toBeInTheDocument();
      expect(screen.getByText(/Gemini is fine/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Prompt character limit
// ---------------------------------------------------------------------------

describe("prompt character limit", () => {
  it("truncates textarea input at 500 characters", async () => {
    render(<LlmCompare />);
    const textarea = screen.getByRole("textbox");
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "x".repeat(600) } });
    });
    expect((textarea as HTMLTextAreaElement).value).toHaveLength(500);
  });

  it("shows a character counter", () => {
    render(<LlmCompare />);
    expect(screen.getByText(/\/500/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Cleanup — ensure real timers are restored if a test forgot to
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.useRealTimers();
});
