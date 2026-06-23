import Link from "next/link";
import { PlugInButton } from "@/components/plug-in-button";

const navLinks = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/resume",    label: "Resume"    },
  { href: "/security",  label: "Security"  },
  { href: "/tools",     label: "Tools"     },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo / name */}
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-widest text-[var(--color-accent)] hover:opacity-80 transition-opacity"
        >
          <span className="text-[var(--color-text-muted)]">&gt;</span>
          <span>AL</span>
          <span className="hidden sm:inline text-[var(--color-text-muted)] font-normal">
            {" "}
            {"// Andrew Lass"}
          </span>
        </Link>

        {/* Links */}
        <ul className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="rounded px-3 py-1.5 font-mono text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)] transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
          {/* Matrix "Plug in…" CTA → the immersive /journey experience */}
          <li className="ml-1.5">
            <PlugInButton href="/journey" variant="toolbar" label="Plug in…" />
          </li>
        </ul>
      </nav>
    </header>
  );
}
