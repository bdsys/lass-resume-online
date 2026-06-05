# Resume Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/resume` — a typeset resume page with light/dark mode toggle and print-CSS PDF download.

**Architecture:** Server component (`page.tsx`) calls `getResume()` and passes the result to a client component (`ResumeView`) that owns the `light | dark` mode state. Print CSS in `globals.css` always forces light colors regardless of active mode, hiding the nav and floating buttons.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Vitest + RTL (tests), inline SVG icons (no new dependencies)

---

## File Map

| File | Role |
|---|---|
| `src/lib/format-date.ts` | Pure helper: `formatDate("2021-06") → "Jun 2021"`, `"present" → "Present"` |
| `src/lib/format-date.test.ts` | Unit tests for formatDate |
| `src/components/resume-view.tsx` | `"use client"` — full resume layout, mode state, floating buttons |
| `src/components/resume-view.test.tsx` | RTL tests for ResumeView |
| `src/app/resume/page.tsx` | Server component — metadata + `<ResumeView resume={getResume()} />` |
| `src/app/globals.css` | Add `@media print` block |

---

## Task 1: formatDate helper

**Files:**
- Create: `src/lib/format-date.ts`
- Create: `src/lib/format-date.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/format-date.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it('formats YYYY-MM as "Mon YYYY"', () => {
    expect(formatDate("2021-06")).toBe("Jun 2021");
    expect(formatDate("2019-01")).toBe("Jan 2019");
    expect(formatDate("2010-12")).toBe("Dec 2010");
  });

  it('formats "present" (case-insensitive) as "Present"', () => {
    expect(formatDate("present")).toBe("Present");
    expect(formatDate("Present")).toBe("Present");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /home/andrew/lass-resume-online && npm run test -- format-date
```

Expected: `Cannot find module './format-date'`

- [ ] **Step 3: Implement formatDate**

Create `src/lib/format-date.ts`:

```typescript
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatDate(s: string): string {
  if (s.toLowerCase() === "present") return "Present";
  const [year, month] = s.split("-");
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}
```

- [ ] **Step 4: Run to confirm passing**

```bash
cd /home/andrew/lass-resume-online && npm run test -- format-date
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/andrew/lass-resume-online && git add src/lib/format-date.ts src/lib/format-date.test.ts && git commit -m "feat: add formatDate helper for resume experience dates"
```

---

## Task 2: ResumeView — tests first

**Files:**
- Create: `src/components/resume-view.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/resume-view.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeView } from "./resume-view";
import type { Resume } from "@/lib/resume";

const RESUME: Resume = {
  name: "Andrew Lass",
  headline: "Senior Cloud Security & Infrastructure Engineer",
  summary: "Test summary.",
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

  it("defaults to light mode", () => {
    const { container } = render(<ResumeView resume={RESUME} />);
    expect(container.querySelector('[data-mode="light"]')).toBeInTheDocument();
  });

  it("switches to dark mode when wrench button is clicked", () => {
    const { container } = render(<ResumeView resume={RESUME} />);
    fireEvent.click(screen.getByTitle("Portfolio view"));
    expect(container.querySelector('[data-mode="dark"]')).toBeInTheDocument();
  });

  it("returns to light mode when briefcase button is clicked", () => {
    const { container } = render(<ResumeView resume={RESUME} />);
    fireEvent.click(screen.getByTitle("Portfolio view"));
    fireEvent.click(screen.getByTitle("Recruiter view"));
    expect(container.querySelector('[data-mode="light"]')).toBeInTheDocument();
  });

  it("calls window.print when Save PDF button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<ResumeView resume={RESUME} />);
    fireEvent.click(screen.getByTitle("Save as PDF"));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd /home/andrew/lass-resume-online && npm run test -- resume-view
```

Expected: `Cannot find module './resume-view'`

---

## Task 3: ResumeView — implementation

**Files:**
- Create: `src/components/resume-view.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/resume-view.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { Resume } from "@/lib/resume";
import { formatDate } from "@/lib/format-date";

type Mode = "light" | "dark";

const L = {
  container:       "bg-white text-slate-900",
  header:          "border-b-2 border-slate-900",
  headline:        "text-slate-600",
  contact:         "text-slate-500",
  pill:            "resume-pill bg-sky-100 text-sky-700",
  sectionHeading:  "resume-section-heading text-slate-900 border-b border-slate-200",
  company:         "text-slate-900",
  dateRange:       "text-slate-500",
  role:            "text-slate-500",
  bullet:          "text-slate-700",
  education:       "text-slate-900",
  educationMuted:  "text-slate-500",
  fabBriefcase:    "bg-slate-900 text-white shadow-md",
  fabWrench:       "bg-slate-100 border border-slate-200 text-slate-600",
  fabSave:         "bg-sky-700 text-white shadow-md",
};

const D = {
  container:       "bg-[var(--color-bg)] text-[var(--color-text)]",
  header:          "border-b-2 border-[var(--color-accent-dim)]",
  headline:        "text-[var(--color-accent)]",
  contact:         "text-[var(--color-text-muted)]",
  pill:            "resume-pill bg-[var(--color-accent-dim)] text-[var(--color-text)]",
  sectionHeading:  "resume-section-heading text-[var(--color-accent)] border-b border-[var(--color-border)]",
  company:         "text-[var(--color-text)]",
  dateRange:       "text-[var(--color-text-muted)]",
  role:            "text-[var(--color-text-muted)]",
  bullet:          "text-[var(--color-text-muted)]",
  education:       "text-[var(--color-text)]",
  educationMuted:  "text-[var(--color-text-muted)]",
  fabBriefcase:    "bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]",
  fabWrench:       "bg-[var(--color-accent)] text-[var(--color-bg)] shadow-[0_0_12px_var(--color-accent)]",
  fabSave:         "bg-[var(--color-accent-dim)] text-[var(--color-text)]",
};

export function ResumeView({ resume }: { resume: Resume }) {
  const [mode, setMode] = useState<Mode>("light");
  const c = mode === "light" ? L : D;

  return (
    <div
      data-resume
      data-mode={mode}
      className={`mx-auto max-w-4xl px-8 py-12 print:max-w-none print:px-6 print:py-4 ${c.container}`}
    >
      {/* Header */}
      <div className={`flex justify-between items-start pb-6 mb-6 ${c.header}`}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{resume.name}</h1>
          <p className={`mt-1 text-base ${c.headline}`}>{resume.headline}</p>
        </div>
        <div className={`text-right text-sm leading-loose ${c.contact}`}>
          <div>{resume.contact.location}</div>
          <a href={`mailto:${resume.contact.email}`} className="hover:underline block">
            {resume.contact.email}
          </a>
          <a
            href={`https://github.com/${resume.contact.github}`}
            className="hover:underline block"
          >
            github.com/{resume.contact.github}
          </a>
          {resume.contact.phone && <div>{resume.contact.phone}</div>}
          {resume.contact.linkedin && (
            <a
              href={`https://linkedin.com/in/${resume.contact.linkedin}`}
              className="hover:underline block"
            >
              linkedin.com/in/{resume.contact.linkedin}
            </a>
          )}
        </div>
      </div>

      {/* Pillar pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {resume.pillars.map((pillar) => (
          <span
            key={pillar}
            className={`px-3 py-1 rounded-full text-sm font-medium ${c.pill}`}
          >
            {pillar}
          </span>
        ))}
      </div>

      {/* Experience */}
      <section className="mb-8">
        <h2 className={`text-xs font-bold uppercase tracking-widest pb-2 mb-5 ${c.sectionHeading}`}>
          Experience
        </h2>
        <div className="space-y-6">
          {resume.experience.map((exp) => (
            <div
              key={`${exp.company}-${exp.start}`}
              className="resume-experience-entry"
            >
              <div className="flex justify-between items-baseline">
                <span className={`font-semibold text-base ${c.company}`}>{exp.company}</span>
                <span className={`text-sm ${c.dateRange}`}>
                  {formatDate(exp.start)} – {formatDate(exp.end)}
                </span>
              </div>
              <p className={`text-sm mb-2 ${c.role}`}>
                {exp.title} · {exp.location}
              </p>
              <ul className="space-y-1.5">
                {exp.bullets.map((bullet, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${c.bullet}`}>
                    <span className="shrink-0 mt-[7px] w-1 h-1 rounded-full bg-current opacity-40" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section>
        <h2 className={`text-xs font-bold uppercase tracking-widest pb-2 mb-4 ${c.sectionHeading}`}>
          Education
        </h2>
        {resume.education.map((edu) => (
          <div key={edu.school} className="flex justify-between items-baseline">
            <span className={`font-medium ${c.education}`}>
              {edu.school} — {edu.field}
            </span>
            <span className={`text-sm ${c.educationMuted}`}>{edu.years}</span>
          </div>
        ))}
      </section>

      {/* Floating controls */}
      <div className="resume-controls fixed bottom-6 right-6 z-50 flex flex-col gap-2 print:hidden">
        <button
          onClick={() => setMode("light")}
          title="Recruiter view"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${c.fabBriefcase}`}
        >
          <BriefcaseIcon />
        </button>
        <button
          onClick={() => setMode("dark")}
          title="Portfolio view"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${c.fabWrench}`}
        >
          <WrenchIcon />
        </button>
        <button
          onClick={() => window.print()}
          title="Save as PDF"
          className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-sm font-semibold transition-all ${c.fabSave}`}
        >
          <SaveIcon />
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16" height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
cd /home/andrew/lass-resume-online && npm run test -- resume-view
```

Expected: `13 passed`

- [ ] **Step 3: Run full suite to confirm no regressions**

```bash
cd /home/andrew/lass-resume-online && npm run test
```

Expected: `6 test files, 54 passed` (40 existing + 2 formatDate + 12 resume-view)

- [ ] **Step 4: Commit**

```bash
cd /home/andrew/lass-resume-online && git add src/components/resume-view.tsx src/components/resume-view.test.tsx && git commit -m "feat: ResumeView component with light/dark toggle and floating controls"
```

---

## Task 4: Print CSS

**Files:**
- Modify: `src/app/globals.css` (append at end of file)

- [ ] **Step 1: Add print block to globals.css**

Append to the end of `src/app/globals.css`:

```css
/* ── Print / Save-as-PDF ──────────────────────────────────────────────────── */
/* Always renders in light/document mode regardless of active toggle.          */
@media print {
  nav,
  footer,
  .resume-controls {
    display: none !important;
  }

  body {
    background: white !important;
  }

  [data-resume] {
    background: white !important;
    color: #0f172a !important;
    max-width: none !important;
    padding: 1cm 1.5cm !important;
  }

  [data-resume] .resume-section-heading {
    color: #0f172a !important;
    border-color: #e2e8f0 !important;
  }

  [data-resume] .resume-pill {
    background: #e0f2fe !important;
    color: #0369a1 !important;
  }

  .resume-experience-entry {
    break-inside: avoid;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/andrew/lass-resume-online && git add src/app/globals.css && git commit -m "feat: add print CSS for resume PDF download"
```

---

## Task 5: Wire up the page

**Files:**
- Rewrite: `src/app/resume/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `src/app/resume/page.tsx` with:

```typescript
import type { Metadata } from "next";
import { getResume } from "@/lib/resume";
import { ResumeView } from "@/components/resume-view";

const resume = getResume();

export const metadata: Metadata = {
  title: "Resume",
  description: `${resume.headline} — Andrew Lass resume.`,
};

export default function ResumePage() {
  return <ResumeView resume={resume} />;
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /home/andrew/lass-resume-online && npm run test
```

Expected: all tests pass, no regressions.

- [ ] **Step 3: Commit**

```bash
cd /home/andrew/lass-resume-online && git add src/app/resume/page.tsx && git commit -m "feat: wire /resume page — Phase 3 complete"
```

---

## Task 6: Visual verification and full gate

- [ ] **Step 1: Start the dev server (if not already running)**

```bash
cd /home/andrew/lass-resume-online && make up
```

- [ ] **Step 2: Open http://localhost:3000/resume and verify**

Checklist:
- [ ] White background, navy text, floating briefcase highlighted (active)
- [ ] Name "Andrew Lass" at top-left, contact info at top-right
- [ ] 6 blue pill badges below the header: Cloud Security, Networking, Governance, Infrastructure, DevOps, Automation
- [ ] All 7 experience entries render with company, formatted date range, title, bullets
- [ ] Education renders: "Cuesta College — Computer Science" with "2010–2012" right-aligned
- [ ] LinkedIn is NOT shown (empty in data)
- [ ] Floating buttons: briefcase (dark/active), wrench (light/inactive), "💾 PDF" pill

- [ ] **Step 3: Toggle dark mode**

Click the wrench button:
- [ ] Background shifts to dark (`#070d14`)
- [ ] Section headings turn cyan
- [ ] Pill badges shift to cyan-dim background
- [ ] Wrench button glows cyan (active)
- [ ] Briefcase button goes inactive

Click briefcase to return to light mode — confirm it reverts correctly.

- [ ] **Step 4: Test print**

Click "💾 PDF" button:
- [ ] Browser print dialog opens
- [ ] Print preview shows white background regardless of active mode
- [ ] Nav, footer, and floating buttons do NOT appear in preview

- [ ] **Step 5: Run full gate**

```bash
cd /home/andrew/lass-resume-online && make test-all
```

Expected: `✓ All local gates passed.`

- [ ] **Step 6: Push**

```bash
cd /home/andrew/lass-resume-online && git push origin dev
```
