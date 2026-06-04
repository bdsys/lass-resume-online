export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-sm text-[var(--color-text-muted)]">
        <span>© {year} Andrew Lass</span>

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
            href="mailto:andrew.lass2174@gmail.com"
            className="hover:text-[var(--color-accent)] transition-colors"
            aria-label="Send email"
          >
            Email
          </a>
          {/* LinkedIn link — add URL when available */}
          {/* <a href="https://linkedin.com/in/TODO" target="_blank" rel="noopener noreferrer">LinkedIn</a> */}
        </div>
      </div>
    </footer>
  );
}
