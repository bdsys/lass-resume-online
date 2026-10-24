import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  ThinkingLevel: { MINIMAL: "MINIMAL" },
}));

vi.mock("@/lib/client-ip", () => ({ getClientIp: vi.fn().mockReturnValue("1.2.3.4") }));

vi.mock("@/lib/rate-limit", () => ({
  checkPerCaller: vi.fn(),
  checkDailyCap: vi.fn(),
}));

vi.mock("@/lib/cf-env", () => ({ getSecret: vi.fn() }));

vi.mock("@/lib/llm-models", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm-models")>()),
  resolveClaudeModel: vi.fn(),
  resolveGeminiModel: vi.fn(),
}));

import { POST } from "./route";
import { getClientIp } from "@/lib/client-ip";
import { checkPerCaller, checkDailyCap } from "@/lib/rate-limit";
import { getSecret } from "@/lib/cf-env";
import { resolveClaudeModel, resolveGeminiModel } from "@/lib/llm-models";

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

  // Default: newest Haiku (accepts disabled thinking) and Google's Flash-Lite alias
  vi.mocked(resolveClaudeModel).mockResolvedValue({ id: "claude-haiku-5-5", thinkingDisabledSupported: true });
  vi.mocked(resolveGeminiModel).mockResolvedValue("gemini-flash-lite-latest");

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
    expect(data.claude.model).toBe("claude-haiku-5-5");
    expect(data.gemini.model).toBe("gemini-flash-lite-latest");
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

  it("requests Gemini with minimal thinking (3.x models take thinkingLevel, not thinkingBudget)", async () => {
    await POST(makeReq());
    const req = mockGeminiGenerate.mock.calls[0][0];
    expect(req.model).toBe("gemini-flash-lite-latest");
    expect(req.config.thinkingConfig).toEqual({ thinkingLevel: "MINIMAL" });
  });
});

// ---------------------------------------------------------------------------
// Model selection — resolved models are used and the served model is reported
// ---------------------------------------------------------------------------

describe("model selection", () => {
  it("calls the resolved Claude model with thinking turned off", async () => {
    await POST(makeReq());
    const req = mockAnthropicCreate.mock.calls[0][0];
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req.thinking).toEqual({ type: "disabled" });
  });

  it("reports the model Claude says served the request", async () => {
    mockAnthropicCreate.mockResolvedValue({ ...successAnthropicResponse(), model: "claude-haiku-6" });
    const data = (await (await POST(makeReq())).json()) as LlmCompareResponse;
    if (!("text" in data.claude)) throw new Error("claude errored");
    expect(data.claude.model).toBe("claude-haiku-6");
  });

  it("reports the model version behind Google's alias", async () => {
    mockGeminiGenerate.mockResolvedValue({ text: "hi", modelVersion: "gemini-3.6-flash-lite" });
    const data = (await (await POST(makeReq())).json()) as LlmCompareResponse;
    if (!("text" in data.gemini)) throw new Error("gemini errored");
    expect(data.gemini.model).toBe("gemini-3.6-flash-lite");
  });
});

// ---------------------------------------------------------------------------
// Retry once without thinking settings — a model swap can change what's accepted
// ---------------------------------------------------------------------------

describe("retry without thinking settings", () => {
  function status400(message: string): Error {
    return Object.assign(new Error(message), { status: 400 });
  }

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retries Gemini once without thinkingConfig after a 400", async () => {
    mockGeminiGenerate
      .mockRejectedValueOnce(status400('{"error":{"code":400,"message":"thinking_level is not supported"}}'))
      .mockResolvedValueOnce(successGeminiResponse("second try"));
    const data = (await (await POST(makeReq())).json()) as LlmCompareResponse;
    expect(mockGeminiGenerate).toHaveBeenCalledTimes(2);
    expect(mockGeminiGenerate.mock.calls[1][0].config.thinkingConfig).toBeUndefined();
    if (!("text" in data.gemini)) throw new Error("gemini errored");
    expect(data.gemini.text).toBe("second try");
  });

  it("does not retry Gemini when the key is invalid", async () => {
    mockGeminiGenerate.mockRejectedValue(status400('{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}'));
    await POST(makeReq());
    expect(mockGeminiGenerate).toHaveBeenCalledOnce();
  });

  it("retries Claude once without thinking settings after a 400", async () => {
    mockAnthropicCreate
      .mockRejectedValueOnce(status400("thinking.type: disabled is not supported"))
      .mockResolvedValueOnce(successAnthropicResponse("second try"));
    const data = (await (await POST(makeReq())).json()) as LlmCompareResponse;
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(2);
    expect(mockAnthropicCreate.mock.calls[1][0].thinking).toBeUndefined();
    if (!("text" in data.claude)) throw new Error("claude errored");
    expect(data.claude.text).toBe("second try");
  });

  it("does not retry Claude when no thinking settings were sent", async () => {
    vi.mocked(resolveClaudeModel).mockResolvedValue({ id: "claude-haiku-5-5" });
    mockAnthropicCreate.mockRejectedValue(status400("bad request"));
    await POST(makeReq());
    expect(mockAnthropicCreate).toHaveBeenCalledOnce();
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
// Provider error messages — readable text, never raw provider JSON
// ---------------------------------------------------------------------------

/** Mimics the SDKs' API errors: an Error carrying the HTTP status. */
function apiError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}

// Verbatim error body production returned for a dead GOOGLE_API_KEY (Oct 2026)
const GOOGLE_INVALID_KEY_BODY =
  '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com","metadata":{"service":"generativelanguage.googleapis.com"}},{"@type":"type.googleapis.com/google.rpc.LocalizedMessage","locale":"en-US","message":"API key not valid. Please pass a valid API key."}]}}';

async function geminiErrorFor(err: unknown): Promise<string> {
  mockGeminiGenerate.mockRejectedValue(err);
  const res = await POST(makeReq());
  const data = (await res.json()) as LlmCompareResponse;
  if (!("error" in data.gemini)) throw new Error("expected gemini error");
  return data.gemini.error;
}

describe("provider error messages", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("maps Google's 400 API_KEY_INVALID to an authentication error with the reason code", async () => {
    const msg = await geminiErrorFor(apiError(400, GOOGLE_INVALID_KEY_BODY));
    expect(msg).toBe("Gemini authentication error (API_KEY_INVALID) — API key may be invalid or expired.");
  });

  it("maps 401 to an authentication error", async () => {
    const msg = await geminiErrorFor(apiError(401, "Unauthorized"));
    expect(msg).toBe("Gemini authentication error (401) — API key may be invalid or expired.");
  });

  it("maps 403 to an authentication error", async () => {
    const msg = await geminiErrorFor(apiError(403, "Forbidden"));
    expect(msg).toBe("Gemini authentication error (403) — API key may be invalid or expired.");
  });

  it("maps 404 to a model-unavailable error", async () => {
    const msg = await geminiErrorFor(
      apiError(404, '{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users."}}'),
    );
    expect(msg).toBe("Gemini model unavailable (404) — the configured model may have been retired.");
  });

  it("maps 429 to a rate-limit / quota error", async () => {
    const msg = await geminiErrorFor(apiError(429, "Resource has been exhausted"));
    expect(msg).toBe("Gemini is rate-limited or out of quota (429) — try again later.");
  });

  it("maps 5xx to a temporarily-unavailable error", async () => {
    const msg = await geminiErrorFor(apiError(503, "The model is overloaded."));
    expect(msg).toBe("Gemini is temporarily unavailable (503).");
  });

  it("maps other statuses to a generic failure with the status code", async () => {
    const msg = await geminiErrorFor(apiError(400, '{"error":{"code":400,"status":"INVALID_ARGUMENT"}}'));
    expect(msg).toBe("Gemini request failed (400).");
  });

  it("maps errors without a status to a generic failure", async () => {
    const msg = await geminiErrorFor(new TypeError("fetch failed"));
    expect(msg).toBe("Gemini request failed.");
  });

  it("still reports aborts as timeouts", async () => {
    const abort = Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
    const msg = await geminiErrorFor(abort);
    expect(msg).toBe("Gemini timed out — try a shorter prompt.");
  });

  it("applies the same mapping to Claude errors", async () => {
    mockAnthropicCreate.mockRejectedValue(
      apiError(401, '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}'),
    );
    const res = await POST(makeReq());
    const data = (await res.json()) as LlmCompareResponse;
    if (!("error" in data.claude)) throw new Error("expected claude error");
    expect(data.claude.error).toBe("Claude authentication error (401) — API key may be invalid or expired.");
  });

  it("logs the raw provider error server-side", async () => {
    const err = apiError(400, GOOGLE_INVALID_KEY_BODY);
    await geminiErrorFor(err);
    expect(consoleError).toHaveBeenCalledWith("[llm-compare] Gemini error:", err);
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
