import type { Metadata } from "next";
import { getRepositories, getPinnedRepos, type GitHubRepo, type GitHubPinnedRepo } from "@/lib/github";
import { RepoCard } from "@/components/repo-card";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "GitHub projects — cloud automation, security tooling, and web applications.",
};

// Render per request on the Worker so GitHub data (incl. pinned repos via the
// GITHUB_TOKEN secret) and the KV cache are available. A static build has no
// token, so the "Featured" section would otherwise be baked empty.
export const dynamic = "force-dynamic";

// Matches docs/github-topic-schema.md
const TOPIC_LABELS: Record<string, string> = {
  security:   "Security",
  cloud:      "Cloud & IaC",
  automation: "Automation",
  tooling:    "Tooling",
  web:        "Web Apps",
  learning:   "Sandbox",
};
const TOPIC_ORDER = ["security", "cloud", "automation", "tooling", "web", "learning"] as const;

interface Section {
  key:   string;
  label: string;
  repos: GitHubRepo[];
}

function groupByTopic(repos: GitHubRepo[]): Section[] {
  const buckets = new Map<string, GitHubRepo[]>(TOPIC_ORDER.map(t => [t, []]));
  const rest: GitHubRepo[] = [];

  for (const repo of repos) {
    const primary = TOPIC_ORDER.find(t => repo.topics.includes(t));
    if (primary) buckets.get(primary)!.push(repo);
    else rest.push(repo);
  }

  const sections: Section[] = TOPIC_ORDER
    .map(t => ({ key: t, label: TOPIC_LABELS[t], repos: buckets.get(t)! }))
    .filter(s => s.repos.length > 0);

  if (rest.length > 0) sections.push({ key: "other", label: "Other", repos: rest });
  return sections;
}

function pinnedToRepo(r: GitHubPinnedRepo): GitHubRepo {
  return {
    name:             r.name,
    description:      r.description,
    html_url:         r.url,
    homepage:         null,
    language:         r.primaryLanguage?.name ?? null,
    stargazers_count: r.stargazerCount,
    pushed_at:        r.pushedAt,
    topics:           [],
  };
}

export default async function PortfolioPage() {
  const [repos, pinned] = await Promise.all([getRepositories(), getPinnedRepos()]);

  const hasTopics = repos.some(r => r.topics.some(t => TOPIC_LABELS[t]));
  const sections: Section[] = hasTopics
    ? groupByTopic(repos)
    : [{ key: "all", label: "All Projects", repos }];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">

      {/* Header */}
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
          GitHub · bdsys
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          Portfolio
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)] max-w-xl">
          {repos.length} public {repos.length === 1 ? "repository" : "repositories"} —
          personal projects, cloud automation, and web applications.
        </p>
      </div>

      {/* Featured (pinned repos — requires GITHUB_TOKEN) */}
      {pinned.length > 0 && (
        <section className="mb-12" aria-labelledby="featured-heading">
          <h2
            id="featured-heading"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)] mb-4"
          >
            Featured
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map(r => <RepoCard key={r.name} repo={pinnedToRepo(r)} />)}
          </div>
        </section>
      )}

      {/* Topic or flat sections */}
      {sections.map(section => (
        <section key={section.key} className="mb-10" aria-labelledby={`section-${section.key}`}>
          <h2
            id={`section-${section.key}`}
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-4"
          >
            {section.label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.repos.map(r => <RepoCard key={r.name} repo={r} />)}
          </div>
        </section>
      ))}

      {/* Hint when no topics applied */}
      {!hasTopics && (
        <p className="mt-6 font-mono text-xs text-[var(--color-text-dim)]">
          Apply topics via{" "}
          <code className="text-[var(--color-accent-dim)]">gh repo edit --add-topic</code>
          {" "}to enable category sections — see{" "}
          <code className="text-[var(--color-accent-dim)]">docs/github-topic-schema.md</code>.
        </p>
      )}
    </div>
  );
}
