#!/usr/bin/env node
/**
 * scripts/build-resume-pdf.mjs
 *
 * Generates public/AndrewLass-Resume.pdf from src/data/resume.json.
 * Run automatically via the `prebuild` npm hook.
 *
 * Usage:
 *   node scripts/build-resume-pdf.mjs
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");

// ── Data ──────────────────────────────────────────────────────────────────────

const resume = JSON.parse(
  await readFile(join(ROOT, "src/data/resume.json"), "utf8")
);

// ── Date helper ───────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(s) {
  if (!s || s.toLowerCase() === "present") return "Present";
  const [year, month] = s.split("-");
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily:  "Helvetica",
    fontSize:    9.5,
    color:       "#1e293b",
    paddingTop:  36,
    paddingBottom: 36,
    paddingHorizontal: 44,
    lineHeight:  1.4,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems:    "flex-start",
    marginBottom:  14,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f172a",
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize:   20,
    color:      "#0f172a",
    letterSpacing: -0.3,
  },
  headline: {
    fontSize: 10,
    color:    "#0369a1",
    marginTop: 3,
  },
  contactBlock: {
    textAlign: "right",
    fontSize:  8.5,
    color:     "#475569",
    lineHeight: 1.6,
  },

  // Pills
  pillRow: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           4,
    marginBottom:  10,
  },
  pill: {
    backgroundColor: "#e0f2fe",
    color:           "#0369a1",
    fontSize:        8,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius:    10,
    fontFamily:      "Helvetica-Bold",
    letterSpacing:   0.3,
  },

  // Summary
  summary: {
    fontSize:     9,
    color:        "#334155",
    marginBottom: 12,
    lineHeight:   1.55,
  },

  // Sections
  sectionHeading: {
    fontFamily:    "Helvetica-Bold",
    fontSize:      8,
    color:         "#0f172a",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 3,
    marginBottom:  8,
    marginTop:     14,
  },

  // Experience
  expEntry: {
    marginBottom: 9,
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems:    "baseline",
    marginBottom:  1.5,
  },
  company: {
    fontFamily: "Helvetica-Bold",
    fontSize:   10,
    color:      "#0f172a",
  },
  dateRange: {
    fontSize: 8.5,
    color:    "#64748b",
  },
  role: {
    fontSize:     8.5,
    color:        "#475569",
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    gap:          4,
    marginBottom: 2.5,
  },
  bulletDot: {
    color:     "#94a3b8",
    fontSize:  9,
    marginTop: 1,
    width:     8,
    flexShrink: 0,
  },
  bulletText: {
    flex:     1,
    fontSize: 8.5,
    color:    "#475569",
    lineHeight: 1.5,
  },

  // Education
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  eduName: {
    fontFamily: "Helvetica-Bold",
    fontSize:   9,
    color:      "#0f172a",
  },
  eduYears: {
    fontSize: 8.5,
    color:    "#64748b",
  },
});

// ── Components ────────────────────────────────────────────────────────────────

function ContactLine({ children }) {
  return h(Text, { style: { fontSize: 8.5, color: "#475569" } }, children);
}

function ResumeDocument() {
  return h(
    Document,
    {
      title:   `${resume.name} — Resume`,
      author:  resume.name,
      subject: resume.headline,
    },
    h(
      Page,
      { size: "LETTER", style: S.page },

      // ── Header ──────────────────────────────────────────────────────
      h(
        View,
        { style: S.header },
        h(
          View,
          null,
          h(Text, { style: S.name }, resume.name),
          h(Text, { style: S.headline }, resume.headline)
        ),
        h(
          View,
          { style: S.contactBlock },
          h(ContactLine, null, resume.contact.location),
          h(ContactLine, null, resume.contact.email),
          h(ContactLine, null, `github.com/${resume.contact.github}`),
          resume.contact.linkedin &&
            h(ContactLine, null, `linkedin.com/in/${resume.contact.linkedin}`),
          resume.contact.phone && h(ContactLine, null, resume.contact.phone)
        )
      ),

      // ── Pillar pills ──────────────────────────────────────────────────
      h(
        View,
        { style: S.pillRow },
        ...resume.pillars.map((p) =>
          h(Text, { key: p, style: S.pill }, p)
        )
      ),

      // ── Summary ───────────────────────────────────────────────────────
      h(Text, { style: S.summary }, resume.summary),

      // ── Experience ────────────────────────────────────────────────────
      h(
        Text,
        { style: S.sectionHeading },
        "Experience"
      ),
      ...resume.experience.map((exp) =>
        h(
          View,
          { key: `${exp.company}-${exp.start}`, style: S.expEntry },
          h(
            View,
            { style: S.expHeader },
            h(Text, { style: S.company }, exp.company),
            h(
              Text,
              { style: S.dateRange },
              `${formatDate(exp.start)} – ${formatDate(exp.end)}`
            )
          ),
          h(
            Text,
            { style: S.role },
            `${exp.title} · ${exp.location}`
          ),
          ...exp.bullets.map((bullet, i) =>
            h(
              View,
              { key: i, style: S.bullet },
              h(Text, { style: S.bulletDot }, "•"),
              h(Text, { style: S.bulletText }, bullet)
            )
          )
        )
      ),

      // ── Education ─────────────────────────────────────────────────────
      h(Text, { style: S.sectionHeading }, "Education"),
      ...resume.education.map((edu) =>
        h(
          View,
          { key: edu.school, style: S.eduRow },
          h(
            Text,
            { style: S.eduName },
            `${edu.school} — ${edu.field}`
          ),
          h(Text, { style: S.eduYears }, edu.years)
        )
      )
    )
  );
}

// ── Generate ──────────────────────────────────────────────────────────────────

const outPath = join(ROOT, "public", "AndrewLass-Resume.pdf");

process.stdout.write("Generating resume PDF... ");

const buffer = await pdf(h(ResumeDocument)).toBuffer();

import { writeFile } from "node:fs/promises";
await writeFile(outPath, buffer);

console.log(`done → public/AndrewLass-Resume.pdf`);
