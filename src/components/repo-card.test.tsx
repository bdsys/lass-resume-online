import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepoCard } from "./repo-card";
import type { GitHubRepo } from "@/lib/github";

const mockRepo: GitHubRepo = {
  name:             "my-project",
  description:      "A really cool cloud project",
  html_url:         "https://github.com/bdsys/my-project",
  homepage:         null,
  language:         "TypeScript",
  stargazers_count: 3,
  pushed_at:        "2026-06-01T00:00:00Z",
  topics:           ["cloud", "automation"],
};

describe("RepoCard", () => {
  it("renders the repo name", () => {
    render(<RepoCard repo={mockRepo} />);
    expect(screen.getByText("my-project")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<RepoCard repo={mockRepo} />);
    expect(screen.getByText("A really cool cloud project")).toBeInTheDocument();
  });

  it("renders the language", () => {
    render(<RepoCard repo={mockRepo} />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders star count when > 0", () => {
    render(<RepoCard repo={mockRepo} />);
    expect(screen.getByText("★ 3")).toBeInTheDocument();
  });

  it("does not render stars when count is 0", () => {
    render(<RepoCard repo={{ ...mockRepo, stargazers_count: 0 }} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("links to the GitHub URL", () => {
    render(<RepoCard repo={mockRepo} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://github.com/bdsys/my-project");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders topic badges", () => {
    render(<RepoCard repo={mockRepo} />);
    expect(screen.getByText("cloud")).toBeInTheDocument();
    expect(screen.getByText("automation")).toBeInTheDocument();
  });

  it("does not render description section when description is null", () => {
    render(<RepoCard repo={{ ...mockRepo, description: null }} />);
    expect(screen.queryByText("A really cool cloud project")).not.toBeInTheDocument();
  });

  it("does not render language section when language is null", () => {
    render(<RepoCard repo={{ ...mockRepo, language: null }} />);
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });
});
