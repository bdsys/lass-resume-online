"use client";

import { useState } from "react";
import type { Resume } from "@/lib/resume";
import { formatDate } from "@/lib/format-date";

type Mode = "light" | "dark";

const L = {
  container:       "bg-white text-slate-900",
  header:          "resume-header border-b-2 border-slate-900",
  headline:        "resume-muted text-slate-600",
  contact:         "resume-muted text-slate-500",
  pill:            "resume-pill bg-sky-100 text-sky-700",
  sectionHeading:  "resume-section-heading text-slate-900 border-b border-slate-200",
  company:         "text-slate-900",
  dateRange:       "resume-muted text-slate-500",
  role:            "resume-muted text-slate-500",
  bullet:          "text-slate-700",
  education:       "text-slate-900",
  educationMuted:  "resume-muted text-slate-500",
  fabBriefcase:    "bg-slate-900 text-white shadow-md",
  fabWrench:       "bg-slate-100 border border-slate-200 text-slate-600",
  fabSave:         "bg-sky-700 text-white shadow-md",
};

const D = {
  container:       "bg-[var(--color-bg)] text-[var(--color-text)]",
  header:          "resume-header border-b-2 border-[var(--color-accent-dim)]",
  headline:        "resume-muted text-[var(--color-accent)]",
  contact:         "resume-muted text-[var(--color-text-muted)]",
  pill:            "resume-pill bg-[var(--color-accent-dim)] text-[var(--color-text)]",
  sectionHeading:  "resume-section-heading text-[var(--color-accent)] border-b border-[var(--color-border)]",
  company:         "text-[var(--color-text)]",
  dateRange:       "resume-muted text-[var(--color-text-muted)]",
  role:            "resume-muted text-[var(--color-text-muted)]",
  bullet:          "text-[var(--color-text-muted)]",
  education:       "text-[var(--color-text)]",
  educationMuted:  "resume-muted text-[var(--color-text-muted)]",
  fabBriefcase:    "bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]",
  fabWrench:       "bg-[var(--color-accent)] text-[var(--color-bg)] shadow-[0_0_12px_var(--color-accent)]",
  fabSave:         "bg-[var(--color-accent-dim)] text-[var(--color-text)]",
};

export function ResumeView({ resume }: { resume: Resume }) {
  const [mode, setMode] = useState<Mode>("dark");
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

      {/* Summary */}
      <p className={`text-sm leading-relaxed mb-8 ${mode === "light" ? "text-slate-700" : "text-[var(--color-text-muted)]"}`}>
        {resume.summary}
      </p>

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
              <div className="resume-entry-head">
                <div className="flex justify-between items-baseline">
                  <span className={`font-semibold text-base ${c.company}`}>{exp.company}</span>
                  <span className={`text-sm ${c.dateRange}`}>
                    {formatDate(exp.start)} – {formatDate(exp.end)}
                  </span>
                </div>
                <p className={`text-sm mb-2 ${c.role}`}>
                  {exp.title} · {exp.location}
                </p>
              </div>
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
        {/* Download the pre-built PDF artifact */}
        <a
          href="/AndrewLass-Resume.pdf"
          download="AndrewLass-Resume.pdf"
          title="Download PDF"
          className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-sm font-semibold transition-all ${c.fabSave}`}
        >
          <DownloadIcon />
          <span>PDF</span>
        </a>
        {/* Print / Save as PDF via browser dialog */}
        <button
          onClick={() => window.print()}
          title="Print / Save as PDF"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${c.fabBriefcase}`}
        >
          <PrintIcon />
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

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrintIcon() {
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
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
