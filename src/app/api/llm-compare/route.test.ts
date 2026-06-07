import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LlmCompareResponse } from "./route";

// ---------------------------------------------------------------------------
// Hoisted mock handles — must be defined before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockAnthropicCreate, mockGeminiGenerate } = vi.hoisted(() => ({
  mockAnthropicCreate: vi.fn(),
  mockGeminiGenerate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockAnthropicCreate } };
  }),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: mockGeminiGenerate } };
  }),
}));

vi.mock("@/lib/client-ip", () => ({ getClientIp: vi.fn().mockReturnValue("1.2.3.4") }));

vi.mock("@/lib/rate-limit", () => ({
  checkPerCaller: vi.fn(),
  checkDailyCap: vi.fn(),
}));

vi.mock("@/lib/cf-env", () => ({ getSecret: vi.fn() }));

import { POST } from "./route";
import { getClientIp } from "@/lib/client-ip";
import { checkPerCaller, checkDailyCap } from "@/lib/rate-limit";
import { getSecret } from "@/lib/cf-env";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(body?: unknown): Request {
  return new Request("http://localhost/api/llm-compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function successAnthropicResponse(text = "Claude response") {
  return {
    content: [{ type: "text", text }],
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

function successGeminiResponse(text = "Gemini response") {
  return { text };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: rate limits allow
  vi.mocked(checkPerCaller).mockResolvedValue({ allowed: true });
  vi.mocked(checkDailyCap).mockResolvedValue({ allowed: true });

  // Default: API keys present
  vi.mocked(getSecret).mockImplementation(async (name: string) => {
    if (name === "ANTHROPIC_API_KEY") return "test-anthropic-key";
    if (name === "GOOGLE_API_KEY") return "test-google-key";
    return undefined;
  });

  // Default: successful LLM responses
  mockAnthropicCreate.mockResolvedValue(successAnthropicResponse());
  mockGeminiGenerate.mockResolvedValue(successGeminiResponse());
});

// ---------------------------------------------------------------------------
// Successful comparison
// ---------------------------------------------------------------------------

describe("successful comparison", () => {
  it("returns 200 with both provider results", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const data = (await res.json()) as LlmCompareResponse;
    expect(data.prompt).toBe("Help me plan a fun day in Everett today.");
    expect("text" in data.claude).toBe(true);
    expect("text" in data.gemini).toBe(true);
  });

  it("includes model name and latencyMs in each provider result", async () => {
    const res = await POST(makeReq());
    const data = (await res.json()) as LlmCompareResponse;
    if (!("text" in data.claude)) throw new Error("claude errored");
    if (!("text" in data.gemini)) throw new Error("gemini errored");
    expect(data.claude.model).toBe("claude-haiku-4-5");
    expect(data.gemini.model).toBe("gemini-2.5-flash");
    expect(typeof data.claude.latencyMs).toBe("number");
    expect(typeof data.gemini.latencyMs).toBe("number");
  });

  it("echoes back the prompt in the response", async () => {
    const res = await POST(makeReq({ prompt: "What should I have for lunch?" }));
    const data = (await res.json()) as LlmCompareResponse;
    expect(data.prompt).toBe("What should I have for lunch?");
  });

  it("uses the default prompt when body is absent", async () => {
    const r = new Request("http://localhost/api/llm-compare", { method: "POST" });
    const res = await POST(r);
    const data = (await res.json()) as LlmCompareResponse;
    expect(data.prompt).toBe("Help me plan a fun day in Everett today.");
  });

  it("uses the default prompt when prompt is an empty string", async () => {
    const res = await POST(makeReq({ prompt: "   " }));
    const data = (await res.json()) as LlmCompareResponse;
    expect(data.prompt).toBe("Help me plan a fun day in Everett today.");
  });

  it("includes token counts from Claude when available", async () => {
    const res = await POST(makeReq());
    const data = (await res.json()) as LlmCompareResponse;
    if (!("text" in data.claude)) throw new Error("claude errored");
    expect(data.claude.inputTokens).toBe(10);
    expect(data.claude.outputTokens).toBe(20);
  });

  it("fires both API calls in parallel (both mocks called once)", async () => {
    await POST(makeReq());
    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
    expect(mockGeminiGenerate).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Prompt validation
// ---------------------------------------------------------------------------

describe("prompt validation", () => {
  it("returns 400 when prompt exceeds 500 characters", async () => {
    const res = await POST(makeReq({ prompt: "a".repeat(501) }));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/too long/i);
  });

  it("allows a prompt of exactly 500 characters", async () => {
    const res = await POST(makeReq({ prompt: "a".repeat(500) }));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("per-caller rate limit", () => {
  it("returns 429 with retryAfterSeconds and Retry-After header", async () => {
    vi.mocked(checkPerCaller).mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const data = (await res.json()) as { error: string; retryAfterSeconds: number };
    expect(data.error).toMatch(/rate limit/i);
    expect(data.retryAfterSeconds).toBe(60);
  });

  it("does not call the LLM APIs when rate-limited", async () => {
    vi.mocked(checkPerCaller).mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    await POST(makeReq());
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
    expect(mockGeminiGenerate).not.toHaveBeenCalled();
  });
});

describe("daily cap", () => {
  it("returns 429 when the daily cap is hit", async () => {
    vi.mocked(checkDailyCap).mockResolvedValue({ allowed: false });
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/daily/i);
  });

  it("does not call LLM APIs when the daily cap is hit", async () => {
    vi.mocked(checkDailyCap).mockResolvedValue({ allowed: false });
    await POST(makeReq());
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
    expect(mockGeminiGenerate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Missing API keys
// ---------------------------------------------------------------------------

describe("missing API keys", () => {
  it("returns 500 when ANTHROPIC_API_KEY is missing", async () => {
    vi.mocked(getSecret).mockImplementation(async (name: string) => {
      if (name === "GOOGLE_API_KEY") return "test-key";
      return undefined;
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns 500 when GOOGLE_API_KEY is missing", async () => {
    vi.mocked(getSecret).mockImplementation(async (name: string) => {
      if (name === "ANTHROPIC_API_KEY") return "test-key";
      return undefined;
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/GOOGLE_API_KEY/);
  });

  it("lists both keys in the error when both are missing", async () => {
    vi.mocked(getSecret).mockResolvedValue(undefined);
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/ANTHROPIC_API_KEY/);
    expect(data.error).toMatch(/GOOGLE_API_KEY/);
  });
});

// ---------------------------------------------------------------------------
// Per-provider failure isolation
// ---------------------------------------------------------------------------

describe("per-provider failure isolation", () => {
  it("returns 200 with claude.error when Claude throws", async () => {
    mockAnthropicCreate.mockRejectedValue(new Error("Anthropic down"));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const data = (await res.json()) as LlmCompareResponse;
    expect("error" in data.claude).toBe(true);
    expect("text" in data.gemini).toBe(true);
  });

  it("returns 200 with gemini.error when Gemini throws", async () => {
    mockGeminiGenerate.mockRejectedValue(new Error("Gemini down"));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const data = (await res.json()) as LlmCompareResponse;
    expect("text" in data.claude).toBe(true);
    expect("error" in data.gemini).toBe(true);
  });

  it("returns 200 with both errors when both providers throw", async () => {
    mockAnthropicCreate.mockRejectedValue(new Error("Claude down"));
    mockGeminiGenerate.mockRejectedValue(new Error("Gemini down"));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const data = (await res.json()) as LlmCompareResponse;
    expect("error" in data.claude).toBe(true);
    expect("error" in data.gemini).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getClientIp called with the request
// ---------------------------------------------------------------------------

describe("getClientIp integration", () => {
  it("passes the request to getClientIp for rate-limit keying", async () => {
    const r = makeReq();
    await POST(r);
    expect(getClientIp).toHaveBeenCalledWith(r);
  });
});
