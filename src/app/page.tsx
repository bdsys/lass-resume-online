import Image from "next/image";
import Link from "next/link";
import { TerminalIntro } from "@/components/terminal-intro";
import { getGitHubUser } from "@/lib/github";
import { getResume } from "@/lib/resume";

export default async function HomePage() {
  const user = await getGitHubUser();
  const resume = getResume();

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">

          {/* Left: identity + terminal */}
          <div className="flex flex-col gap-8 flex-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-green)] opacity-40 blur-sm" />
                <Image
                  src={user.avatar_url}
                  alt={`${user.name ?? user.login} avatar`}
                  width={88}
                  height={88}
                  className="relative rounded-full ring-2 ring-[var(--color-accent-dim)]"
                  priority
                />
              </div>

              {/* Name + title */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)] sm:text-4xl">
                  {user.name ?? user.login}
                </h1>
                <p className="mt-1 font-mono text-[var(--color-accent)] text-sm">
                  {resume.headline}
                </p>
                {user.location && (
                  <p className="mt-0.5 font-mono text-[var(--color-text-muted)] text-xs">
                    📍 {user.location}
                  </p>
                )}
              </div>
            </div>

            {/* GitHub bio */}
            {user.bio && (
              <p className="text-[var(--color-text-muted)] leading-relaxed max-w-xl">
                {user.bio}
              </p>
            )}

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 rounded border border-[var(--color-accent-dim)] bg-[var(--color-bg-card)] px-5 py-2.5 font-mono text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-bg)] transition-colors"
              >
                View Portfolio
              </Link>
              <Link
                href="/resume"
                className="inline-flex items-center gap-2 rounded border border-[var(--color-yellow-dim)] bg-[var(--color-bg-card)] px-5 py-2.5 font-mono text-sm text-[var(--color-yellow)] hover:bg-[var(--color-yellow-dim)] hover:text-[var(--color-bg)] transition-colors"
              >
                Resume
              </Link>
              <Link
                href="/security"
                className="inline-flex items-center gap-2 rounded border border-[var(--color-green-dim)] bg-[var(--color-bg-card)] px-5 py-2.5 font-mono text-sm text-[var(--color-green)] hover:bg-[var(--color-green-dim)] hover:text-[var(--color-text)] transition-colors"
              >
                WAF Demo
              </Link>
            </div>

            {resume.industries && resume.industries.length > 0 && (
              <div aria-labelledby="industries-heading">
                <h2
                  id="industries-heading"
                  className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-3"
                >
                  Industries Served
                </h2>
                <ul className="flex flex-wrap gap-2.5">
                  {resume.industries.map((industry) => (
                    <li
                      key={industry}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-1.5 font-mono text-xs text-[var(--color-text-muted)]"
                    >
                      {industry}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <TerminalIntro />
          </div>

          {/* Right: GitHub stats card */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-4">
              <p className="font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-widest">
                GitHub Profile
              </p>
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-[var(--color-accent)] hover:underline"
              >
                @{user.login}
              </a>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: "Repos",     value: user.public_repos },
                  { label: "Followers", value: user.followers    },
                  { label: "Following", value: user.following    },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2"
                  >
                    <span className="font-mono text-lg font-semibold text-[var(--color-text)]">
                      {value}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1 border-t border-[var(--color-border)]">
                <p className="font-mono text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {resume.pillars.join(" · ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Skills ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16" aria-labelledby="skills-heading">
        <h2
          id="skills-heading"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-8"
        >
          Core Skills
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resume.skills.map(({ area, items }) => (
            <div
              key={area}
              className="card-hover rounded-lg bg-[var(--color-bg-card)] p-4 space-y-3"
            >
              <h3 className="font-mono text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest">
                {area}
              </h3>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li key={s} className="flex items-start gap-1.5 text-sm text-[var(--color-text-muted)]">
                    <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-[var(--color-accent-dim)]" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ───────────────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] mx-6" />

      {/* ─── Sections preview ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16" aria-labelledby="sections-heading">
        <h2
          id="sections-heading"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-8"
        >
          What&apos;s Here
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              href:  "/portfolio",
              icon:  "⬡",
              title: "Portfolio",
              desc:  "Live GitHub projects, categorized by type. REST + GraphQL, KV-cached.",
              color: "var(--color-accent)",
            },
            {
              href:  "/resume",
              icon:  "◈",
              title: "Resume",
              desc:  "Typeset, print-friendly resume with PDF download. Single source of truth.",
              color: "var(--color-text-muted)",
            },
            {
              href:  "/security",
              icon:  "⬢",
              title: "WAF Demo",
              desc:  "Live security dashboard. Watch a real Cloudflare WAF block XSS, SQLi, and path traversal.",
              color: "var(--color-green)",
            },
          ].map(({ href, icon, title, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="card-hover group rounded-lg bg-[var(--color-bg-card)] p-5 space-y-3 flex flex-col"
            >
              <span className="text-2xl" style={{ color }} aria-hidden="true">
                {icon}
              </span>
              <h3
                className="font-mono font-semibold text-sm"
                style={{ color }}
              >
                {title}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {desc}
              </p>
              <span className="mt-auto font-mono text-xs" style={{ color }}>
                View →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
