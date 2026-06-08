"use client";

/**
 * Global error boundary — catches unhandled errors in Server Components
 * and shows a graceful recovery UI rather than a full crash screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 flex flex-col items-center text-center gap-6">
      <div className="font-mono text-[var(--color-red)] text-xs uppercase tracking-widest">
        Error
      </div>
      <h1 className="text-3xl font-bold text-[var(--color-text)]">
        Something went wrong
      </h1>
      <p className="text-[var(--color-text-muted)] max-w-md leading-relaxed text-sm">
        {error.message || "An unexpected error occurred loading this page."}
        {error.digest && (
          <span className="block mt-2 font-mono text-xs text-[var(--color-text-dim)]">
            digest: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="rounded border border-[var(--color-accent-dim)] bg-[var(--color-bg-card)] px-5 py-2.5 font-mono text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-bg)] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
