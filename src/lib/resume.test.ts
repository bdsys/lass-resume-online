/**
 * src/lib/resume.test.ts
 *
 * Guards the content base: ensures resume.json (generated from resume.yaml)
 * passes the Zod schema and contains the expected structural spine.
 * Run: npm test  |  make test
 */

import { describe, it, expect } from "vitest";
import { getResume, ResumeSchema } from "./resume";

describe("getResume()", () => {
  it("returns a valid Resume object without throwing", () => {
    expect(() => getResume()).not.toThrow();
  });

  it("passes the full Zod schema", () => {
    const result = ResumeSchema.safeParse(getResume());
    expect(result.success).toBe(true);
  });

  it("contains all 6 pillars in the correct order", () => {
    const { pillars } = getResume();
    expect(pillars).toEqual([
      "Cloud Security",
      "Networking",
      "Governance",
      "Infrastructure",
      "DevOps",
      "Automation",
    ]);
  });

  it("has a skill group for every pillar", () => {
    const { pillars, skills } = getResume();
    const skillAreas = new Set(skills.map((s) => s.area));
    for (const pillar of pillars) {
      expect(skillAreas).toContain(pillar);
    }
  });

  it("each skill group has at least one item", () => {
    const { skills } = getResume();
    for (const group of skills) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("contains exactly 7 experience entries (canonical work history)", () => {
    const { experience } = getResume();
    expect(experience).toHaveLength(7);
  });

  it("work history spine is correct and in order", () => {
    const companies = getResume().experience.map((e) => e.company);
    expect(companies).toEqual([
      "SAP (Concur)",
      "Nintendo of America",
      "Puget Sound Energy",
      "Univar Inc.",
      "Vix Technology",
      "ChemPoint Inc.",
      "MINDBODY",
    ]);
  });

  it("current role (SAP Concur) has end = 'present'", () => {
    const current = getResume().experience[0];
    expect(current.company).toBe("SAP (Concur)");
    expect(current.end).toBe("present");
  });

  it("every experience entry has at least one bullet", () => {
    const { experience } = getResume();
    for (const role of experience) {
      expect(role.bullets.length).toBeGreaterThan(0);
    }
  });

  it("education contains Cuesta College", () => {
    const { education } = getResume();
    expect(education.some((e) => e.school === "Cuesta College")).toBe(true);
  });

  it("contact has required fields", () => {
    const { contact } = getResume();
    expect(contact.email).toBeTruthy();
    expect(contact.github).toBe("bdsys");
    expect(contact.location).toBeTruthy();
  });

  it("headline and summary are non-empty strings", () => {
    const { headline, summary } = getResume();
    expect(typeof headline).toBe("string");
    expect(headline.length).toBeGreaterThan(0);
    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(0);
  });
});
