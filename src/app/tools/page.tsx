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
    </div>
  );
}
