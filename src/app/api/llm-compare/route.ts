/**
 * POST /api/llm-compare
 *
 * Runs the same prompt against the newest Claude Haiku and Gemini Flash-Lite in
 * parallel, returning both responses for side-by-side comparison. Model choice
 * lives in src/lib/llm-models.ts; each result reports the model that served it.
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
 *
 * Optional overrides (pin a model instead of auto-selecting the newest):
 *   CLAUDE_MODEL, GEMINI_MODEL
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getClientIp } from "@/lib/client-ip";
import { getSecret } from "@/lib/cf-env";
import {
  claudeThinkingParams,
  resolveClaudeModel,
  resolveGeminiModel,
  type ClaudeModelChoice,
} from "@/lib/llm-models";
import { checkPerCaller, checkDailyCap } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT = "Help me plan a fun day in Everett today.";
const MAX_PROMPT_CHARS = 500;
// Thinking tokens count against the output cap and can cut off the visible response.
// Both sides ask for the least thinking the model allows (Claude: per its reported
// capabilities; Gemini 3.x: thinkingLevel MINIMAL) and get the same headroom.
const CLAUDE_MAX_TOKENS = 2048;
const GEMINI_MAX_TOKENS = 2048;
const FETCH_TIMEOUT_MS = 30_000;
const DAILY_CAP = 500;

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

async function callClaude(prompt: string, apiKey: string, choice: ClaudeModelChoice): Promise<LlmResult> {
  const client = new Anthropic({ apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const thinkingParams = claudeThinkingParams(choice);
  const create = (extra: ReturnType<typeof claudeThinkingParams>) =>
    client.messages.create(
      {
        model: choice.id,
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
        ...extra,
      },
      { signal: controller.signal },
    );

  const start = Date.now();
  try {
    let message;
    try {
      message = await create(thinkingParams);
    } catch (err) {
      if (Object.keys(thinkingParams).length === 0 || !isRetryable400(err)) throw err;
      console.error("[llm-compare] Claude rejected thinking settings; retrying without:", err);
      message = await create({});
    }

    const text =
      message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("") || "";

    return {
      text,
      model: message.model ?? choice.id,
      latencyMs: Date.now() - start,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<LlmResult> {
  const ai = new GoogleGenAI({ apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const generate = (withThinking: boolean) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        maxOutputTokens: GEMINI_MAX_TOKENS,
        ...(withThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
        abortSignal:     controller.signal,
      },
    });

  const start = Date.now();
  try {
    let response;
    try {
      response = await generate(true);
    } catch (err) {
      // The -latest alias can move to a model that rejects this thinking level
      if (!isRetryable400(err)) throw err;
      console.error("[llm-compare] Gemini rejected thinking settings; retrying without:", err);
      response = await generate(false);
    }

    const text = response.text ?? "";
    return {
      text,
      // The alias resolves server-side; modelVersion names the release that answered
      model: response.modelVersion ?? model,
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------------

/** HTTP status both SDKs attach to their API errors, if any. */
function statusOf(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/**
 * A 400 that may be caused by our thinking settings (the model changed under us).
 * An invalid key is also a 400 at Google, but retrying can't fix it.
 */
function isRetryable400(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return statusOf(err) === 400 && !message.includes("API_KEY_INVALID");
}

/**
 * Converts raw provider errors into user-friendly messages.
 * Classifies by the HTTP status both SDKs attach to their API errors, so raw
 * provider JSON never reaches the UI. The status (or Google's ErrorInfo reason)
 * stays in the message to keep failures diagnosable from the browser; the full
 * error is logged for Workers Logs.
 */
function friendlyError(err: unknown, provider: string): string {
  console.error(`[llm-compare] ${provider} error:`, err);

  const name    = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "AbortError" || message.toLowerCase().includes("abort")) {
    return `${provider} timed out — try a shorter prompt.`;
  }

  const status    = statusOf(err);
  // Google reports a bad key as 400 + ErrorInfo reason API_KEY_INVALID, not 401
  const reason    = /"reason":\s*"([A-Z_]+)"/.exec(message)?.[1];

  if (status === 401 || status === 403 || reason === "API_KEY_INVALID") {
    return `${provider} authentication error (${reason ?? status}) — API key may be invalid or expired.`;
  }
  if (status === 404) {
    return `${provider} model unavailable (404) — the configured model may have been retired.`;
  }
  if (status === 429) {
    return `${provider} is rate-limited or out of quota (429) — try again later.`;
  }
  if (status !== undefined && status >= 500) {
    return `${provider} is temporarily unavailable (${status}).`;
  }
  return status !== undefined
    ? `${provider} request failed (${status}).`
    : `${provider} request failed.`;
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

  // 4. Pick models (cached lookups; never blocks on the Models API)
  const [claudeChoice, geminiModel] = await Promise.all([
    resolveClaudeModel(anthropicKey),
    resolveGeminiModel(),
  ]);

  // 5. Fire both calls in parallel; surface per-provider errors without failing the whole request
  const [claudeOutcome, geminiOutcome] = await Promise.allSettled([
    callClaude(prompt, anthropicKey, claudeChoice),
    callGemini(prompt, googleKey, geminiModel),
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
