"use client";

import { useState, useRef } from "react";
import type { LlmCompareResponse, LlmResult } from "@/app/api/llm-compare/route";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT = "Help me plan a fun day in Everett today.";
const MAX_PROMPT_CHARS = 500;
const COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PanelProps {
  label: string;
  model: string;
  result: LlmResult | { error: string } | null;
  loading: boolean;
}

function ModelPanel({ label, model, result, loading }: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex flex-col gap-3 transition-opacity ${
        loading ? "opacity-50 animate-pulse" : "opacity-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">
          {label}
        </span>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">{model}</span>
      </div>

      {/* Content */}
      {loading ? (
        <p className="font-mono text-xs text-[var(--color-text-muted)]">Generating…</p>
      ) : result === null ? (
        <p className="font-mono text-xs text-[var(--color-text-muted)]">
          Press Compare to see a response.
        </p>
      ) : "error" in result ? (
        <p className="font-mono text-xs text-[var(--color-red)]">{result.error}</p>
      ) : (
        <>
          <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
            {result.text}
          </p>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">
            {result.latencyMs}ms
            {result.inputTokens != null
              ? ` · ${result.inputTokens} in / ${result.outputTokens ?? "?"} out tokens`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type CompareState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; data: LlmCompareResponse }
  | { phase: "error"; message: string; retryAfterSeconds?: number };

export function LlmCompare() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [state, setState] = useState<CompareState>({ phase: "idle" });
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function compare() {
    if (cooldown > 0) return;
    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/llm-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || DEFAULT_PROMPT }),
      });

      if (res.status === 429) {
        const data = (await res.json()) as { error: string; retryAfterSeconds?: number };
        const retry = data.retryAfterSeconds ?? COOLDOWN_SECONDS;
        setState({ phase: "error", message: data.error, retryAfterSeconds: retry });
        startCooldown(retry);
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setState({
          phase: "error",
          message: data.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      const data = (await res.json()) as LlmCompareResponse;
      setState({ phase: "done", data });
      startCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }

  const isLoading = state.phase === "loading";
  const canSubmit = !isLoading && cooldown === 0;

  const claudeResult =
    state.phase === "done" ? state.data.claude : null;
  const geminiResult =
    state.phase === "done" ? state.data.gemini : null;

  return (
    <div className="space-y-6">
      {/* Prompt input */}
      <div className="space-y-2 max-w-2xl">
        <label
          htmlFor="llm-prompt"
          className="font-mono text-xs text-[var(--color-text-muted)]"
        >
          Prompt{" "}
          <span className="text-[var(--color-text-muted)]">
            ({prompt.length}/{MAX_PROMPT_CHARS})
          </span>
        </label>
        <textarea
          id="llm-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_CHARS))}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 font-mono text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          placeholder={DEFAULT_PROMPT}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={compare}
          disabled={!canSubmit}
          className="rounded px-4 py-2 font-mono text-sm border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Comparing…" : "Compare"}
        </button>

        {cooldown > 0 && (
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            Next compare available in {cooldown}s
          </span>
        )}
      </div>

      {/* Error banner */}
      {state.phase === "error" && (
        <p className="font-mono text-xs text-[var(--color-red)] max-w-2xl">
          {state.message}
        </p>
      )}

      {/* Side-by-side model panels */}
      <div className="grid gap-4 md:grid-cols-2">
        <ModelPanel
          label="Claude Haiku"
          model="claude-haiku-4-5"
          result={claudeResult}
          loading={isLoading}
        />
        <ModelPanel
          label="Gemini Flash"
          model="gemini-2.5-flash"
          result={geminiResult}
          loading={isLoading}
        />
      </div>

      {/* Fine print */}
      <p className="text-xs text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
        Rate-limited to one compare per minute per IP. Both calls run in parallel
        server-side — API keys are never sent to the browser.
      </p>
    </div>
  );
}
