import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Demo",
  description:
    "Live WAF demo — watch a real Cloudflare WAF block XSS, SQL injection, and path traversal attacks.",
};

// Phase 5: real CF WAF + Fly.io, split-panel terminal dashboard
export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
          Phase 5
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          WAF Demo
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)] max-w-xl">
          Educational security dashboard. A real Cloudflare WAF sits in front of an isolated,
          intentionally-vulnerable app. Click a button, see the attack blocked live. Coming in
          Phase 5.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--color-green-dim)] bg-[var(--color-bg-card)] p-8 text-center">
        <p className="font-mono text-sm text-[var(--color-green)]">
          &gt; WAF security dashboard — building in Phase 5
        </p>
      </div>
    </div>
  );
}
