/**
 * src/lib/resume.ts
 *
 * Typed loader for the portfolio content base.
 *
 * SOURCE OF TRUTH: content/resume.yaml  (hand-editable)
 * GENERATED COPY:  src/data/resume.json (produced by `make content-check`)
 *
 * To update content:
 *   1. Edit content/resume.yaml
 *   2. make content-check          ← validates + regenerates resume.json
 *   3. Changes appear live in `npm run dev` and on next production build
 */

import { z } from "zod";
import resumeJson from "../data/resume.json";

// ── Schema ────────────────────────────────────────────────────────────────────

const ContactSchema = z.object({
  location: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  github: z.string(),
  linkedin: z.string().optional(),
});

const SkillGroupSchema = z.object({
  area: z.string(),
  items: z.array(z.string()),
});

const ExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string(),
  start: z.string(),
  end: z.string(),
  bullets: z.array(z.string()),
});

const EducationSchema = z.object({
  school: z.string(),
  field: z.string(),
  years: z.string(),
});

export const ResumeSchema = z.object({
  name: z.string(),
  headline: z.string(),
  pillars: z.array(z.string()),
  industries: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  contact: ContactSchema,
  summary: z.string(),
  skills: z.array(SkillGroupSchema),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;

// ── Loader ────────────────────────────────────────────────────────────────────

let _cached: Resume | null = null;

/**
 * Returns the validated Resume object parsed from src/data/resume.json.
 * Throws a descriptive error if the JSON doesn't match the schema (i.e., you
 * edited resume.yaml but forgot to run `make content-check`).
 */
export function getResume(): Resume {
  if (_cached) return _cached;

  const result = ResumeSchema.safeParse(resumeJson);
  if (!result.success) {
    const detail = result.error.issues
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(
      `src/data/resume.json failed schema validation.\n` +
        `Run \`make content-check\` to regenerate from content/resume.yaml.\n` +
        detail
    );
  }

  _cached = result.data;
  return result.data;
}
