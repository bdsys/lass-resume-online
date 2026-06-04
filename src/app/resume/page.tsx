import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume",
  description: "Andrew Lass — Senior SRE & Cloud Security Engineer resume.",
};

// Phase 3: resume.json → typeset HTML, PDF download via Playwright
export default function ResumePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
          Phase 3
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          Resume
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)] max-w-xl">
          Typeset from a structured JSON source with print-friendly layout and PDF download.
          Coming in Phase 3.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
        <p className="font-mono text-sm text-[var(--color-text-muted)]">
          &gt; Resume section — building in Phase 3
        </p>
      </div>
    </div>
  );
}
