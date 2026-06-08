import Link from "next/link";

/**
 * Custom 404 — styled in the terminal/security aesthetic.
 * Makes a 404 a portfolio moment rather than a dead end.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 flex flex-col items-center text-center gap-6">
      <div className="font-mono text-[var(--color-accent)] text-xs uppercase tracking-widest">
        404 Not Found
      </div>

      <pre className="font-mono text-[var(--color-accent)] text-xs leading-relaxed select-none" aria-hidden="true">{`
  ███╗  ██╗ ██████╗ ████████╗
  ████╗ ██║██╔═══██╗╚══██╔══╝
  ██╔██╗██║██║   ██║   ██║
  ██║╚████║██║   ██║   ██║
  ██║ ╚███║╚██████╔╝   ██║
  ╚═╝  ╚══╝ ╚═════╝    ╚═╝
      `.trim()}</pre>

      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        Page not found
      </h1>
      <p className="font-mono text-sm text-[var(--color-text-muted)]">
        <span className="text-[var(--color-accent)]">$</span>{" "}
        <span className="text-[var(--color-yellow)]">cd</span> /404 → ENOENT
      </p>
      <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
        That path doesn&apos;t exist. The WAF didn&apos;t block it — it just isn&apos;t here.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="rounded border border-[var(--color-accent-dim)] bg-[var(--color-bg-card)] px-5 py-2.5 font-mono text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-bg)] transition-colors"
        >
          ← Home
        </Link>
        <Link
          href="/portfolio"
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 font-mono text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent-dim)] hover:text-[var(--color-accent)] transition-colors"
        >
          Portfolio
        </Link>
      </div>
    </div>
  );
}
