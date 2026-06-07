#!/usr/bin/env node
/**
 * scripts/content-check.mjs
 *
 * Validates content/resume.yaml and writes src/data/resume.json.
 * Called by `make content-check` and automatically before `npm run build`
 * via the "prebuild" npm lifecycle hook.
 *
 * Usage:  node scripts/content-check.mjs
 *         make content-check
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const YAML_PATH = join(ROOT, 'content', 'resume.yaml');
const OUT_DIR  = join(ROOT, 'src', 'data');
const OUT_PATH = join(OUT_DIR, 'resume.json');

const errors = [];

// ── Parse YAML ────────────────────────────────────────────────────────────────

let raw;
try {
  raw = readFileSync(YAML_PATH, 'utf-8');
} catch (e) {
  console.error(`✗  Cannot read content/resume.yaml: ${e.message}`);
  process.exit(1);
}

let data;
try {
  data = parse(raw);
  console.log('✓  content/resume.yaml: parsed OK');
} catch (e) {
  console.error(`✗  YAML parse error: ${e.message}`);
  process.exit(1);
}

// ── Top-level required string fields ─────────────────────────────────────────

for (const field of ['name', 'headline', 'summary']) {
  if (typeof data[field] !== 'string' || !data[field].trim()) {
    errors.push(`${field}: required non-empty string`);
  }
}

// ── Pillars ───────────────────────────────────────────────────────────────────

if (!Array.isArray(data.pillars) || data.pillars.length === 0) {
  errors.push('pillars: required non-empty array of strings');
} else {
  const bad = data.pillars.filter(p => typeof p !== 'string');
  if (bad.length) errors.push(`pillars: all entries must be strings (got: ${bad})`);
  console.log(`✓  ${data.pillars.length} pillars: ${data.pillars.join(', ')}`);
}

// ── Industries ────────────────────────────────────────────────────────────────

if (data.industries !== undefined) {
  if (!Array.isArray(data.industries) || data.industries.some(i => typeof i !== 'string')) {
    errors.push('industries: must be an array of strings');
  } else {
    console.log(`✓  ${data.industries.length} industries: ${data.industries.join(', ')}`);
  }
}

// ── Contact ───────────────────────────────────────────────────────────────────

if (!data.contact || typeof data.contact !== 'object') {
  errors.push('contact: required object');
} else {
  for (const field of ['location', 'email', 'phone', 'github']) {
    if (typeof data.contact[field] !== 'string' || !data.contact[field].trim()) {
      errors.push(`contact.${field}: required non-empty string`);
    }
  }
}

// ── Skills ────────────────────────────────────────────────────────────────────

if (!Array.isArray(data.skills) || data.skills.length === 0) {
  errors.push('skills: required non-empty array');
} else {
  data.skills.forEach((group, i) => {
    if (!group.area || typeof group.area !== 'string') {
      errors.push(`skills[${i}].area: required string`);
    }
    if (!Array.isArray(group.items) || group.items.length === 0) {
      errors.push(`skills[${i}].items: required non-empty array`);
    }
  });

  // Warn if a pillar doesn't have a matching skill group
  if (Array.isArray(data.pillars)) {
    const skillAreas = new Set(data.skills.map(s => s.area));
    const missing = data.pillars.filter(p => !skillAreas.has(p));
    if (missing.length) {
      errors.push(`skills: no skill group for pillar(s): ${missing.join(', ')}`);
    }
  }

  console.log(`✓  ${data.skills.length} skill groups`);
}

// ── Experience ────────────────────────────────────────────────────────────────

if (!Array.isArray(data.experience) || data.experience.length === 0) {
  errors.push('experience: required non-empty array');
} else {
  const REQUIRED = ['company', 'title', 'location', 'start', 'end', 'bullets'];
  data.experience.forEach((exp, i) => {
    for (const field of REQUIRED) {
      if (field === 'bullets') {
        if (!Array.isArray(exp.bullets) || exp.bullets.length === 0) {
          errors.push(`experience[${i}] (${exp.company ?? '?'}): bullets must be non-empty array`);
        }
      } else if (typeof exp[field] !== 'string' || !String(exp[field]).trim()) {
        errors.push(`experience[${i}] (${exp.company ?? '?'}): ${field} required string`);
      }
    }
  });
  console.log(`✓  ${data.experience.length} experience entries: ${data.experience.map(e => e.company).join(', ')}`);
}

// ── Education ─────────────────────────────────────────────────────────────────

if (!Array.isArray(data.education) || data.education.length === 0) {
  errors.push('education: required non-empty array');
} else {
  data.education.forEach((edu, i) => {
    for (const field of ['school', 'field', 'years']) {
      if (typeof edu[field] !== 'string' || !edu[field].trim()) {
        errors.push(`education[${i}].${field}: required string`);
      }
    }
  });
  console.log(`✓  Education: ${data.education.map(e => e.school).join(', ')}`);
}

// ── Results ───────────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error('\n✗  Validation errors:');
  errors.forEach(e => console.error(`   • ${e}`));
  process.exit(1);
}

// ── Write generated JSON ──────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`✓  Generated → src/data/resume.json`);
console.log('\n✓  All checks passed.');
