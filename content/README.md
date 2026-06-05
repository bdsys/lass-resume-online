# Content Directory

This directory holds the hand-editable sources for the portfolio site.
**Edit these files — not the code** — to update what appears on the site.

---

## Files

| File | Purpose |
|------|---------|
| `resume.yaml` | **Single source of truth.** All résumé content: headline, skills, work history, bio summary. |
| `about.md` | Long-form bio paragraph shown on the About section. Plain Markdown. |

`src/data/resume.json` is a **generated file** (produced by `make content-check` from `resume.yaml`). Don't edit it directly — your changes will be overwritten.

---

## Edit → Preview Loop

```bash
# 1. Edit content/resume.yaml in your editor
# 2. Validate + regenerate the JSON:
make content-check

# 3. Start (or restart) the dev server:
npm run dev

# 4. Open http://localhost:3000 — your changes are live
```

If the dev server is already running when you run `make content-check`, Next.js will detect the JSON change and hot-reload the affected pages automatically.

---

## resume.yaml Field Reference

### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full name. Shown in the hero. |
| `headline` | string | Job title shown under your name and in the `<title>` tag. |
| `pillars` | string[] | Ordered list of 6 skill domain names. Drives the skills grid column order and the hero sub-headline. **Must match the `area` names in `skills` exactly.** |
| `summary` | string | 3–5 sentence bio. Used on the résumé page. Use YAML `>-` to write multi-line without worrying about newlines. |

### `contact` object

| Field | Required | Description |
|-------|----------|-------------|
| `location` | yes | City, State. |
| `email` | yes | Contact email. |
| `phone` | yes | Phone number. |
| `github` | yes | GitHub username (no `@` or URL — just the handle). |
| `linkedin` | no | LinkedIn URL or handle. Leave blank (`""`) to omit from the site. |

### `skills` array

Each entry is one card on the homepage and one section on the résumé page.

```yaml
skills:
  - area: Cloud Security        # must match a value in `pillars`
    items:
      - "AWS IAM (expert)"
      - "GuardDuty"
      # add / remove / reorder items freely
```

Rules:
- `area` must match one of the pillar names exactly (case-sensitive).
- `items` is a free-form list of strings — add, remove, or reorder without limit.
- The grid is 2-col on mobile, 3-col on desktop (fits 6 groups evenly).

### `experience` array

Each entry is one job on the résumé page, in reverse-chronological order.

```yaml
experience:
  - company: "SAP (Concur)"
    title: "Senior Cloud Security & Infrastructure Engineer"
    location: "Bellevue, WA"
    start: "2021-06"          # YYYY-MM
    end: present              # "present" or "YYYY-MM"
    bullets:
      - "First bullet..."
      - "Second bullet..."
```

Rules:
- `start` / `end`: use `YYYY-MM` format, or the literal string `present` for the current role.
- `bullets`: at least one required. Add, remove, reorder, or reword freely over the years.
- Promote your best bullets to the top — the résumé page will respect this order.

### `education` array

```yaml
education:
  - school: "Cuesta College"
    field: "Computer Science"
    years: "2010–2012"
```

---

## Validation

`make content-check` runs structural validation and reports field-level errors:

```
✓  content/resume.yaml: parsed OK
✓  6 pillars: Cloud Security, Networking, Governance, Infrastructure, DevOps, Automation
✓  6 skill groups
✓  7 experience entries: SAP (Concur), Nintendo of America, ...
✓  Education: Cuesta College
✓  Generated → src/data/resume.json

✓  All checks passed.
```

Common errors:
- `pillars: no skill group for pillar(s): DevOps` — you renamed a pillar but didn't update `skills[].area` (or vice versa).
- `experience[0].end: required string` — missing `end` field on a job entry.
- YAML parse error — usually a rogue tab character or misaligned indentation; YAML uses **spaces only**.

---

## Tips

- **YAML uses spaces, not tabs.** Most editors can be configured to auto-indent with 2 spaces.
- **Quotes aren't required** for most strings, but use them when the value contains `:`, `#`, `&`, or starts with a special character.
- **Multi-line bullets:** Use a quoted string — YAML handles line-wrapping inside quotes automatically. Or use `>-` for block style.
- **Comments are allowed** (`# like this`) — use them to park notes, alternative phrasings, or temporary removals.
