import type { Metadata } from "next";
import { IpTool } from "./IpTool";
import { LlmCompare } from "./LlmCompare";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Interactive demos — find your IP address and compare Claude Haiku vs Gemini Flash side by side.",
};

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 space-y-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          Tools
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)] max-w-2xl">
          A few interactive gimmicks — live network tools and an LLM comparison demo.
        </p>
      </div>

      {/* IP lookup */}
      <section aria-labelledby="ip-tool-heading">
        <h2
          id="ip-tool-heading"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-6"
        >
          What&apos;s My IP?
        </h2>
        <IpTool />
      </section>

      {/* LLM comparison */}
      <section aria-labelledby="llm-compare-heading">
        <h2
          id="llm-compare-heading"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-6"
        >
          Claude Haiku vs Gemini Flash
        </h2>
        <LlmCompare />
      </section>
      {/* Plugin marketplace */}
      <section aria-labelledby="plugin-heading">
        <h2
          id="plugin-heading"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-6"
        >
          Claude Code Plugin Marketplace
        </h2>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-3 max-w-lg">
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            The <span className="font-mono text-[var(--color-accent)]">lass-labs</span> marketplace
            adds two Claude Code plugins:{" "}
            <code className="font-mono text-xs">whats-my-ip</code> and{" "}
            <code className="font-mono text-xs">who-should-i-hire</code>.
          </p>
          <a
            href="/tools/prompt.md"
            className="inline-flex items-center gap-2 font-mono text-xs text-[var(--color-accent)] hover:underline"
          >
            View agent setup instructions →
          </a>
        </div>
      </section>
    </div>
  );
}
