import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Andrew Lass's GitHub projects — organized by topic.",
};

// Phase 2: real GitHub repo data, KV cache, topic sections, pinned/featured cards
export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
          Phase 2
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          Portfolio
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)] max-w-xl">
          Live GitHub projects via REST + GraphQL, cached at the edge. Coming in Phase 2.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
        <p className="font-mono text-sm text-[var(--color-text-muted)]">
          &gt; GitHub portfolio section — building in Phase 2
        </p>
      </div>
    </div>
  );
}
