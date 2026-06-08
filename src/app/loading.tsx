/**
 * Global loading skeleton — shown while the portfolio page fetches GitHub data.
 * Matches the dark aesthetic of the site.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-16 pb-20 animate-pulse">
      {/* Hero placeholder */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-16 mb-16">
        <div className="flex flex-col gap-6 flex-1">
          <div className="flex items-center gap-6">
            <div className="w-[88px] h-[88px] rounded-full bg-[var(--color-bg-elevated)]" />
            <div className="space-y-2">
              <div className="h-8 w-48 rounded bg-[var(--color-bg-elevated)]" />
              <div className="h-4 w-64 rounded bg-[var(--color-bg-card)]" />
            </div>
          </div>
          <div className="h-4 w-full max-w-md rounded bg-[var(--color-bg-card)]" />
          <div className="h-4 w-3/4 max-w-sm rounded bg-[var(--color-bg-card)]" />
          <div className="flex gap-3">
            {[120, 100, 110, 90].map((w) => (
              <div key={w} className="h-9 rounded bg-[var(--color-bg-card)]" style={{ width: w }} />
            ))}
          </div>
        </div>
        <div className="w-full lg:w-72 shrink-0 h-40 rounded-lg bg-[var(--color-bg-card)]" />
      </div>

      {/* Skills grid placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-[var(--color-bg-card)]" />
        ))}
      </div>
    </div>
  );
}
