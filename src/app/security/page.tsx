import type { Metadata } from "next";
import { WafDemo } from "./WafDemo";

export const metadata: Metadata = {
  title: "Security Demo",
  description:
    "Live WAF demo — watch a real Cloudflare WAF block XSS, SQL injection, and path traversal attacks.",
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          WAF Demo
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)] max-w-2xl">
          A real Cloudflare WAF sits in front of an isolated, intentionally-vulnerable app.
          Click an attack below to fire a live request through both paths — the raw exploit
          and the WAF-protected route — and see what happens.
        </p>
      </div>
      <WafDemo />
    </div>
  );
}
