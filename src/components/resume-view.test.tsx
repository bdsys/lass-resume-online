import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeView } from "./resume-view";
import type { Resume } from "@/lib/resume";

const RESUME: Resume = {
  name: "Andrew Lass",
  headline: "Senior Cloud Security & Infrastructure Engineer",
  summary: "Experienced engineer specializing in cloud security and infrastructure automation.",
  pillars: ["Cloud Security", "Networking", "Infrastructure"],
  contact: {
    location: "Everett, WA",
    email: "test@example.com",
    phone: "555-000-0000",
    github: "bdsys",
    linkedin: "",
  },
  skills: [],
  experience: [
    {
      company: "Test Corp",
      title: "Senior Engineer",
      location: "Seattle, WA",
      start: "2021-06",
      end: "present",
      bullets: ["Designed and led a major re-architecture."],
    },
    {
      company: "Old Co",
      title: "Engineer",
      location: "Portland, OR",
      start: "2019-03",
      end: "2021-05",
      bullets: ["Built things."],
    },
  ],
  education: [
    { school: "Test College", field: "Computer Science", years: "2010–2012" },
  ],
};

describe("ResumeView", () => {
  it("renders name as h1", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByRole("heading", { level: 1, name: "Andrew Lass" })).toBeInTheDocument();
  });

  it("renders headline", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText("Senior Cloud Security & Infrastructure Engineer")).toBeInTheDocument();
  });

  it("renders contact location, phone, and github link", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText("Everett, WA")).toBeInTheDocument();
    expect(screen.getByText("555-000-0000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github\.com\/bdsys/i })).toBeInTheDocument();
  });

  it("omits linkedin when empty", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.queryByText(/linkedin/i)).not.toBeInTheDocument();
  });

  it("renders the summary paragraph", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText("Experienced engineer specializing in cloud security and infrastructure automation.")).toBeInTheDocument();
  });

  it("renders all pillars as pill badges", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText("Cloud Security")).toBeInTheDocument();
    expect(screen.getByText("Networking")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure")).toBeInTheDocument();
  });

  it("renders experience companies and formatted dates", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText("Test Corp")).toBeInTheDocument();
    expect(screen.getByText(/Jun 2021/)).toBeInTheDocument();
    expect(screen.getByText(/Present/)).toBeInTheDocument();
    expect(screen.getByText("Old Co")).toBeInTheDocument();
    expect(screen.getByText(/Mar 2019/)).toBeInTheDocument();
    expect(screen.getByText(/May 2021/)).toBeInTheDocument();
  });

  it("renders experience bullets", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText("Designed and led a major re-architecture.")).toBeInTheDocument();
  });

  it("renders education", () => {
    render(<ResumeView resume={RESUME} />);
    expect(screen.getByText(/Test College/)).toBeInTheDocument();
    expect(screen.getByText("2010–2012")).toBeInTheDocument();
  });

  it("defaults to dark mode", () => {
    const { container } = render(<ResumeView resume={RESUME} />);
    expect(container.querySelector('[data-mode="dark"]')).toBeInTheDocument();
  });

  it("switches to light mode when briefcase button is clicked", () => {
    const { container } = render(<ResumeView resume={RESUME} />);
    fireEvent.click(screen.getByTitle("Recruiter view"));
    expect(container.querySelector('[data-mode="light"]')).toBeInTheDocument();
  });

  it("returns to dark mode when wrench button is clicked", () => {
    const { container } = render(<ResumeView resume={RESUME} />);
    fireEvent.click(screen.getByTitle("Recruiter view"));
    fireEvent.click(screen.getByTitle("Portfolio view"));
    expect(container.querySelector('[data-mode="dark"]')).toBeInTheDocument();
  });

  it("calls window.print when Save PDF button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<ResumeView resume={RESUME} />);
    fireEvent.click(screen.getByTitle("Save as PDF"));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });
});
