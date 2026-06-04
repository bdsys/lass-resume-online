/**
 * Unit tests for the Nav component.
 * Nav is a sync server component — safe to render in Vitest.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "./nav";

describe("Nav", () => {
  it("renders the site logo/name link", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /andrew lass/i })).toBeInTheDocument();
  });

  it("renders the three main nav links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /security/i })).toBeInTheDocument();
  });

  it("portfolio link points to /portfolio", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /portfolio/i })).toHaveAttribute("href", "/portfolio");
  });
});
