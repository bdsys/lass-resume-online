/**
 * POST /api/llm-compare
 *
 * Runs the same prompt against Claude Haiku and Gemini Flash in parallel,
 * returning both responses for side-by-side comparison.
 *
 * Body: { prompt?: string }
 *   - prompt defaults to DEFAULT_PROMPT if omitted.
 *   - prompt is trimmed and capped at MAX_PROMPT_CHARS to bound token cost.
 *
 * Rate limiting (best-effort, KV-backed — eventually consistent):
 *   - 1 call/min per caller IP (via KV counter).
 *   - Global daily cap of DAILY_CAP calls across all visitors.
 *
 * Required secrets (wrangler secret put / .env.local for dev):
 *   ANTHROPIC_API_KEY — Anthropic API key.
 *   GOOGLE_API_KEY    — Google AI Studio / Gemini API key.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { getClientIp } from "@/lib/client-ip";
import { getSecret } from "@/lib/cf-env";
import { checkPerCaller, checkDailyCap } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT = "Help me plan a fun day in Everett today.";
const MAX_PROMPT_CHARS = 500;
const CLAUDE_MAX_TOKENS = 1024;
// Gemini 2.5 Flash has thinking enabled by default; thinking tokens count against
// maxOutputTokens and cut off the visible response. Disable thinking (thinkingBudget: 0)
// and give the output adequate room.
const GEMINI_MAX_TOKENS = 2048;
const FETCH_TIMEOUT_MS = 30_000;
const DAILY_CAP = 500;

const CLAUDE_MODEL = "claude-haiku-4-5";
const GEMINI_MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LlmResult {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmCompareResponse {
  prompt: string;
  claude: LlmResult | { error: string };
  gemini: LlmResult | { error: string };
}

// ---------------------------------------------------------------------------
// Per-provider callers
// ---------------------------------------------------------------------------

async function callClaude(prompt: string, apiKey: string): Promise<LlmResult> {
  const client = new Anthropic({ apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const start = Date.now();
  try {
    const message = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal },
    );

    const text =
      message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("") || "";

    return {
      text,
      model: CLAUDE_MODEL,
      latencyMs: Date.now() - start,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<LlmResult> {
  const ai = new GoogleGenAI({ apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const start = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: GEMINI_MAX_TOKENS,
        thinkingConfig:  { thinkingBudget: 0 },
        abortSignal:     controller.signal,
      },
    });

    const text = response.text ?? "";
    return {
      text,
      model: GEMINI_MODEL,
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------------

/**
 * Converts raw provider errors into user-friendly messages.
 * Distinguishes timeout/abort from authentication failures so the UI
 * can give actionable feedback.
 */
function friendlyError(err: unknown, provider: string): string {
  const name    = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "AbortError" || message.toLowerCase().includes("abort")) {
    return `${provider} timed out — try a shorter prompt.`;
  }
  if (
    message.includes("401") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("authentication")
  ) {
    return `${provider} authentication error — API key may be invalid or expired.`;
  }
  return message || `${provider} request failed.`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate prompt
  let prompt = DEFAULT_PROMPT;
  try {
    const body = (await request.json()) as { prompt?: unknown };
    if (typeof body.prompt === "string") {
      const trimmed = body.prompt.trim();
      if (trimmed.length > MAX_PROMPT_CHARS) {
        return Response.json(
          { error: `Prompt too long — max ${MAX_PROMPT_CHARS} characters.` },
          { status: 400 },
        );
      }
      if (trimmed) prompt = trimmed;
    }
  } catch {
    // Body absent or non-JSON → use default prompt
  }

  // 2. Rate limiting
  const ip = getClientIp(request);

  const perCaller = await checkPerCaller(ip);
  if (!perCaller.allowed) {
    return Response.json(
      {
        error: "Rate limit exceeded — please wait before submitting another prompt.",
        retryAfterSeconds: perCaller.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(perCaller.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  const daily = await checkDailyCap(DAILY_CAP);
  if (!daily.allowed) {
    return Response.json(
      {
        error: "Daily request cap reached — this demo is throttled to keep API costs manageable. Try again tomorrow.",
      },
      { status: 429 },
    );
  }

  // 3. Resolve API keys
  const [anthropicKey, googleKey] = await Promise.all([
    getSecret("ANTHROPIC_API_KEY"),
    getSecret("GOOGLE_API_KEY"),
  ]);

  if (!anthropicKey || !googleKey) {
    const missing = [
      !anthropicKey && "ANTHROPIC_API_KEY",
      !googleKey && "GOOGLE_API_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    return Response.json(
      { error: `Missing API key(s): ${missing}` },
      { status: 500 },
    );
  }

  // 4. Fire both calls in parallel; surface per-provider errors without failing the whole request
  const [claudeOutcome, geminiOutcome] = await Promise.allSettled([
    callClaude(prompt, anthropicKey),
    callGemini(prompt, googleKey),
  ]);

  const claude: LlmCompareResponse["claude"] =
    claudeOutcome.status === "fulfilled"
      ? claudeOutcome.value
      : { error: friendlyError(claudeOutcome.reason, "Claude") };

  const gemini: LlmCompareResponse["gemini"] =
    geminiOutcome.status === "fulfilled"
      ? geminiOutcome.value
      : { error: friendlyError(geminiOutcome.reason, "Gemini") };

  const body: LlmCompareResponse = { prompt, claude, gemini };
  return Response.json(body);
}
