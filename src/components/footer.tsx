import { getVersion } from "@/lib/version";
import { WormholeToggle } from "@/components/transition/WormholeTransition";

export function Footer() {
  const year = new Date().getFullYear();
  let version: ReturnType<typeof getVersion> | null = null;
  try {
    version = getVersion();
  } catch {
    // Non-fatal — version line is hidden if version.json is missing or invalid
  }

  return (
    <footer className="border-t border-[var(--color-border)] mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-sm text-[var(--color-text-muted)]">
        <span>© {year} Andrew Lass</span>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[var(--color-text-dim)]">Made in Everett, Wash.</span>
          {version && (
            <p
              className="font-mono text-xs text-[var(--color-text-dim)]"
              title={`${version.describe} · ${version.date}`}
            >
              v{version.number} &middot; &ldquo;{version.name}&rdquo; &middot; {version.environment}
            </p>
          )}
          <WormholeToggle />
        </div>

        <div className="flex items-center gap-5">
          <a
            href="https://github.com/bdsys"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-accent)] transition-colors"
            aria-label="GitHub profile"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/andrew-lass-80422b33"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-accent)] transition-colors"
            aria-label="LinkedIn profile"
          >
            LinkedIn
          </a>
          <a
            href="mailto:andrew.lass2174@gmail.com"
            className="hover:text-[var(--color-accent)] transition-colors"
            aria-label="Send email"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
