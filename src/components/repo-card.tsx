import type { GitHubRepo } from "@/lib/github";

// Matches GitHub Linguist language colors
const LANG_COLORS: Record<string, string> = {
  TypeScript:  "#3178c6",
  Python:      "#3572A5",
  JavaScript:  "#f1e05a",
  Go:          "#00ADD8",
  Rust:        "#DEA584",
  Shell:       "#89e051",
  HTML:        "#e34c26",
  CSS:         "#563d7c",
  Ruby:        "#701516",
  Java:        "#b07219",
};

function formatAge(isoDate: string): string {
  const diffMs   = Date.now() - new Date(isoDate).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <  30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

interface RepoCardProps {
  repo: GitHubRepo;
}

export function RepoCard({ repo }: RepoCardProps) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? "#64748b") : null;

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 gap-2 hover:border-[var(--color-accent-dim)] transition-colors"
      aria-label={`${repo.name} on GitHub`}
    >
      {/* Name + stars */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-[var(--color-accent)] group-hover:underline leading-snug">
          {repo.name}
        </span>
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-muted)] shrink-0">
            ★ {repo.stargazers_count}
          </span>
        )}
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.map(t => (
            <span
              key={t}
              className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Language + date */}
      <div className="mt-auto pt-1 flex items-center justify-between gap-2">
        {langColor && repo.language ? (
          <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-muted)]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: langColor }}
              aria-hidden="true"
            />
            {repo.language}
          </span>
        ) : (
          <span />
        )}
        <span className="font-mono text-xs text-[var(--color-text-dim)]">
          {formatAge(repo.pushed_at)}
        </span>
      </div>
    </a>
  );
}
