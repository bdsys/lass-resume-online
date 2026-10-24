/**
 * Model selection for the /tools LLM comparison — keeps both sides on the
 * newest model of their tier without code changes or redeploys.
 *
 * Gemini: Google's `gemini-flash-lite-latest` alias, which Google hot-swaps to
 * each new Flash-Lite release.
 *
 * Claude: Anthropic has no rolling alias (every model ID is a pinned snapshot),
 * so we ask the Models API for the newest model in the `haiku` line and cache
 * the answer in KV. A stale or missing cache entry is served as-is and refreshed
 * in the background, so visitors never wait on the lookup.
 *
 * Either side can be pinned with a CLAUDE_MODEL / GEMINI_MODEL var
 * (wrangler.toml [vars] or .env.local).
 */

import Anthropic from "@anthropic-ai/sdk";
import { getSecret, kvGet, kvSet, runInBackground } from "./cf-env";

export const DEFAULT_CLAUDE_MODEL = "claude-haiku-5-5";
export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";
export const CLAUDE_MODEL_CACHE_KEY = "llm:claude-model";

const CLAUDE_LINE = "haiku";
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
// Kept well past REFRESH_AFTER_MS so a failed refresh still serves the last good answer
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface ClaudeModelChoice {
  id: string;
  /** Models API: capabilities.thinking.types.disabled.supported */
  thinkingDisabledSupported?: boolean;
  /** Models API: capabilities.effort.supported */
  effortSupported?: boolean;
}

interface CachedClaudeChoice extends ClaudeModelChoice {
  fetchedAt: number;
}

/**
 * Models API entry, including fields newer than the installed SDK's types
 * (`line`, `thinking.types.disabled`). The SDK passes them through untouched.
 */
interface ModelEntry {
  id: string;
  line?: string | null;
  created_at: string;
  capabilities?: {
    thinking?: { types?: { disabled?: { supported?: boolean } } };
    effort?: { supported?: boolean };
  } | null;
}

/** Newest model in `line` by release date, or null. Never guesses the line from the id. */
export function pickNewestInLine(models: unknown[], line: string): ClaudeModelChoice | null {
  const newest = (models as ModelEntry[])
    .filter((m) => m.line === line)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!newest) return null;
  return {
    id: newest.id,
    thinkingDisabledSupported: newest.capabilities?.thinking?.types?.disabled?.supported,
    effortSupported: newest.capabilities?.effort?.supported,
  };
}

/** Asks the Models API for the newest Haiku. */
export async function fetchNewestClaude(apiKey: string): Promise<ClaudeModelChoice | null> {
  const client = new Anthropic({ apiKey });
  const models: unknown[] = [];
  for await (const m of client.models.list()) models.push(m);
  return pickNewestInLine(models, CLAUDE_LINE);
}

async function refreshClaudeChoice(apiKey: string, now: number): Promise<void> {
  try {
    const choice = await fetchNewestClaude(apiKey);
    if (!choice) {
      console.error(`[llm-models] Models API returned no "${CLAUDE_LINE}" model; keeping cached choice`);
      return;
    }
    const cached: CachedClaudeChoice = { ...choice, fetchedAt: now };
    await kvSet(CLAUDE_MODEL_CACHE_KEY, cached, CACHE_TTL_SECONDS);
  } catch (err) {
    console.error("[llm-models] Claude model lookup failed; keeping cached choice:", err);
  }
}

/**
 * The Claude model to call: CLAUDE_MODEL override, else the cached newest Haiku,
 * else DEFAULT_CLAUDE_MODEL. Refreshes a stale/missing cache in the background.
 */
export async function resolveClaudeModel(apiKey: string, now = Date.now()): Promise<ClaudeModelChoice> {
  const override = await getSecret("CLAUDE_MODEL");
  if (override) return { id: override };

  const cached = await kvGet<CachedClaudeChoice>(CLAUDE_MODEL_CACHE_KEY);
  if (!cached || now - cached.fetchedAt >= REFRESH_AFTER_MS) {
    void runInBackground(refreshClaudeChoice(apiKey, now));
  }
  if (!cached) return { id: DEFAULT_CLAUDE_MODEL };

  return {
    id: cached.id,
    thinkingDisabledSupported: cached.thinkingDisabledSupported,
    effortSupported: cached.effortSupported,
  };
}

/** The Gemini model to call: GEMINI_MODEL override, else Google's Flash-Lite alias. */
export async function resolveGeminiModel(): Promise<string> {
  return (await getSecret("GEMINI_MODEL")) ?? DEFAULT_GEMINI_MODEL;
}

/**
 * Thinking settings that keep Claude comparable to Gemini's minimal thinking
 * and stop thinking tokens eating max_tokens. Built from the model's reported
 * capabilities, so a new Haiku with different rules doesn't need a code change.
 */
export function claudeThinkingParams(
  choice: ClaudeModelChoice,
): { thinking?: { type: "disabled" }; output_config?: { effort: "low" } } {
  if (choice.thinkingDisabledSupported) return { thinking: { type: "disabled" } };
  if (choice.effortSupported) return { output_config: { effort: "low" } };
  return {};
}
