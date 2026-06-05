# Resume Page — Design Spec

**Date:** 2026-06-05
**Phase:** 3

---

## Context

The `/resume` route currently renders a placeholder. This spec covers the full implementation:
typeset resume from `content/resume.yaml`, two visual modes toggled by floating icons, and
print-CSS-based PDF download.

---

## Decisions Made

| Decision | Choice |
|---|---|
| Layout | Full-width single column, contact right-aligned in header |
| Toggle placement | Floating corner buttons (fixed bottom-right) |
| Typography | System sans-serif (modern), not classic serif |
| PDF strategy | Print CSS + `window.print()` — no library |
| Modes | Dark (default, portfolio-matched) / Light (recruiter, PDF always prints light) |
| Skills display | Pillar name pills only — not the full item lists |

---

## Architecture

Two files:

**`src/app/resume/page.tsx`** — server component
- Exports `metadata` (title, description from `resume.headline`)
- Calls `getResume()` synchronously
- Renders `<ResumeView resume={resume} />`

**`src/components/resume-view.tsx`** — `"use client"` component
- Holds `mode: 'light' | 'dark'` state (default `'dark'`)
- Renders the full resume layout + floating buttons
- Applies `data-mode="light|dark"` on the root `<div>` for CSS targeting

No additional files. No new dependencies.

---

## Layout: ResumeView

```
┌─────────────────────────────────────────────────────────┐
│  Andrew Lass                      Everett, WA           │
│  Senior Cloud Security & ...      github.com/bdsys      │  ← header
│                                   email · phone         │
├─────────────────────────────────────────────────────────┤
│  [Cloud Security] [Networking] [Governance] ...         │  ← pillar pills
├─────────────────────────────────────────────────────────┤
│  EXPERIENCE                                             │
│  SAP (Concur)                     Jun 2021 – Present    │
│  Sr. Cloud Security Engineer · Bellevue, WA             │
│  • bullet                                               │
│  • bullet                                               │
│                                                         │
│  Xaxis (GroupM)                   2019 – 2021           │
│  ...                                                    │
├─────────────────────────────────────────────────────────┤
│  EDUCATION                                              │
│  Cuesta College — Computer Science          2010–2012   │
└─────────────────────────────────────────────────────────┘
                                          [💼]  ← floating
                                          [🔧]
                                          [⬇]
```

Max width: `max-w-4xl` (~896px), centered, with generous vertical padding.
Print: `max-w-none`, tighter margins so content fits on paper.

**Background note:** The global `body` is dark (`#070d14`). In light mode, `bg-white` is applied
to the `ResumeView` root container — not the body. The nav/footer remain dark in both modes.
In dark mode the container uses `var(--color-bg)`, blending with the rest of the site.

---

## Sections

### Header
- Name: large, bold, tracking-tight
- Headline: muted, one size smaller
- Contact (right column): location, email, github link, phone — **skip linkedin if empty**
- Divider below header

### Skills (Pillar Pills)
- Render `resume.pillars` (the 6 names) as pill badges
- Light mode: `bg-sky-100 text-sky-700`
- Dark mode: `bg-[var(--color-accent-dim)] text-[var(--color-text)]`

### Summary
- Render `resume.summary` as a paragraph between pills and experience
- Light mode: `text-slate-700`
- Dark mode: `text-[var(--color-text-muted)]`
- No section heading — flows naturally after the pills

### Experience
- Section heading: small-caps uppercase label
- Per entry: company name + date range (right-aligned), title + location (muted), bullet list
- Date formatting: `"2021-06"` → `"Jun 2021"`, `"present"` → `"Present"`
- Dates stored as `YYYY-MM` strings; helper function `formatDate(s: string): string`

### Education
- Single entry: `school — field` left, `years` right

---

## Mode Toggle

### Light mode (`data-mode="light"`) — also the forced PDF/print mode
- Background: `#ffffff`
- Text: `#0f172a` (slate-900)
- Section headers: uppercase, `#0f172a`, border-bottom `#e2e8f0`
- Muted text: `#475569` (slate-600)
- Briefcase button: filled dark, active state

### Dark mode (default — `data-mode="dark"`)
- Uses portfolio CSS custom properties: `var(--color-bg)`, `var(--color-text)`, `var(--color-accent)`
- Section headers: `var(--color-accent)` (cyan), border-bottom `var(--color-border)`
- Muted text: `var(--color-text-muted)`
- Wrench button: filled cyan with glow, active state

Both modes use **Tailwind utility classes** with `data-[mode=dark]:` variants on the container,
or a conditional `className` approach (simpler given two modes are mutually exclusive).
**Recommended:** conditional className strings — `mode === 'dark' ? darkClass : lightClass`.

---

## Floating Buttons

Fixed position, bottom-right: `fixed bottom-6 right-6 z-50 flex flex-col gap-2`

Three buttons in the cluster:

| Button | Shape | Content | Action | Active state |
|---|---|---|---|---|
| Briefcase | 36×36px circle | Briefcase SVG | `setMode('light')` | Dark fill when light mode active |
| Wrench | 36×36px circle | Wrench SVG | `setMode('dark')` | Cyan fill + glow when dark mode active |
| Save PDF | Pill (auto-width) | 💾 floppy disk SVG + "PDF" label | `window.print()` | No toggle state |

The Save PDF button is pill-shaped (rounded-full, `px-3 h-9`) rather than a circle so the
"PDF" text fits naturally. It sits below the two mode-toggle circles in the same fixed cluster.

Icons: inline SVG (no library dependency — only 3 icons needed).
Lucide SVG paths: `Briefcase`, `Wrench`, `Save` — copy paths directly from lucide.dev.

---

## Print CSS

Defined in `src/app/globals.css` under `@media print`:

```css
@media print {
  /* Always print in light/document mode regardless of toggle */
  .resume-controls { display: none !important; }
  nav, footer { display: none !important; }
  body { background: white !important; }
  /* Force light color overrides */
  [data-resume] { background: white !important; color: #0f172a !important; }
  [data-resume] .resume-section-heading { color: #0f172a !important; border-color: #e2e8f0 !important; }
  [data-resume] .resume-pill { background: #e0f2fe !important; color: #0369a1 !important; }
  /* Page break control */
  .resume-experience-entry { break-inside: avoid; }
}
```

`window.print()` opens the native print dialog where the user saves as PDF.

---

## Metadata Fix

Current: `"Andrew Lass — Senior SRE & Cloud Security Engineer resume."` (stale, hardcoded)
Updated: use `resume.headline` from `getResume()`:
```ts
description: `${resume.headline} — Andrew Lass resume.`
```

---

## Files Changed

| File | Change |
|---|---|
| `src/app/resume/page.tsx` | Full rewrite — server component wrapping ResumeView |
| `src/components/resume-view.tsx` | New — client component, all resume rendering + toggle |
| `src/app/globals.css` | Add `@media print` block |

---

## Verification

1. `make up` → open `http://localhost:3000/resume`
2. Light mode renders with white background, navy text, blue pills, floating briefcase highlighted
3. Click wrench → dark mode applies immediately, cyan accents, dark background
4. Click briefcase → returns to light mode
5. Click print button → browser print dialog opens; preview shows white background, nav hidden, buttons hidden
6. `npm run test` → 40 tests still pass (no regressions)
7. `make test-all` → full gate passes
