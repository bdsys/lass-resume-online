"use client";

import { useState } from "react";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; ip: string }
  | { status: "error"; message: string };

export function IpTool() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function reveal() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ip?format=json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ip: string };
      setState({ status: "done", ip: data.ip });
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 max-w-lg space-y-4">
      {/* Terminal hint */}
      <p className="font-mono text-xs text-[var(--color-text-muted)]">
        <span className="text-[var(--color-accent)]">$</span>{" "}
        curl <span className="text-[var(--color-yellow)]">ip.andrewlass.com</span>
      </p>

      {/* Result or button */}
      {state.status === "done" ? (
        <div className="space-y-3">
          <p className="font-mono text-[var(--color-text-muted)] text-xs">Your IP address:</p>
          <p className="font-mono text-2xl font-semibold text-[var(--color-accent)]">
            {state.ip}
          </p>
          <button
            onClick={() => setState({ status: "idle" })}
            className="font-mono text-xs text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text)] transition-colors"
          >
            Clear
          </button>
        </div>
      ) : state.status === "error" ? (
        <div className="space-y-3">
          <p className="font-mono text-xs text-[var(--color-red)]">{state.message}</p>
          <button
            onClick={reveal}
            className="rounded px-4 py-2 font-mono text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <button
          onClick={reveal}
          disabled={state.status === "loading"}
          className="rounded px-4 py-2 font-mono text-sm border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.status === "loading" ? "Detecting…" : "Reveal my IP"}
        </button>
      )}

      {/* Explainer */}
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        Reads the{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">CF-Connecting-IP</code>{" "}
        header set by Cloudflare&apos;s edge — the authoritative caller IP in Workers.{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">ip.andrewlass.com</code>{" "}
        returns the same value as plain text, so{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">curl ip.andrewlass.com</code>{" "}
        works from any terminal.
      </p>
    </div>
  );
}
