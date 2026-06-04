You are designing and building a personal developer/security portfolio website from scratch. This is a real production project. Think carefully about architecture before writing any code, and ask clarifying questions if anything is ambiguous.

---

## Github repo for project management
I don't have a repo yet. Can you create a repo "lass-resume-online". Please have "main" as the main branch. Checkout "dev" as a feature branch for any work we're doing initially. Also create a README.md describing the project, how to build it and deploy it. We may not have all of that information available immediately, so we'll add that as a todo to backfill once we have the relevant information.

There are many md files in "resume-project". Please move theses into a new folder "assets" in the github project.

---

## PROJECT OVERVIEW

A personal portfolio website for a developer/security professional. The site must look polished and professional — this will be shown to hiring managers and used on a resume. Design quality matters as much as functionality.

---

## OWNER / IDENTITY

- GitHub: https://github.com/bdsys
- Pull the owner's name, bio, and public profile info directly from the GitHub API to populate the site
- A bio/about section should be prominent and above the fold on the homepage

---

## CORE FEATURES

### 1. Live GitHub Project Portfolio
- Fetch repos in real time from the GitHub API (REST + GraphQL)
- Use GitHub repo topics as the categorization mechanism — define a clear topic schema (e.g. `security`, `web`, `tooling`, `automation`) and map topics to portfolio sections
- Surface pinned repos as "featured projects" using GitHub's GraphQL pinned repositories API
- Display: repo name, description, language, stars, last commit date, live link if available
- Cache API responses at the edge (Cloudflare KV) to avoid rate limits and ensure fast load
- Graceful fallback if GitHub API is unavailable

### 2. WAF Demo Feature (The Centerpiece)
This is an intentional, educational security demonstration — NOT a security vulnerability in the portfolio itself.

**Vulnerable demo app:**
- A completely isolated microservice deployed separately (Fly.io or Railway)
- Contains intentionally vulnerable endpoints for demonstration only:
  - Reflected XSS
  - SQLi-style injection path
  - Path traversal attempt
- No real database, no persistent state, no shared secrets with the main portfolio
- Hard rate-limited to prevent abuse
- Clearly labeled as intentional and educational

**WAF layer:**
- Cloudflare WAF rules sit in front of the demo app
- When a visitor clicks an "attempt attack" button in the portfolio UI, the request fires and gets blocked
- The portfolio UI shows this with a split panel:
  - Left: the outgoing request (method, path, payload)
  - Right: the WAF block response (403, rule ID that triggered, block reason)
- This should feel like a live terminal/security dashboard, not a toy

**Isolation requirements — these are non-negotiable:**
- The vulnerable app must have zero access to portfolio infrastructure, secrets, or data
- Must be sandboxed and stateless
- Document the isolation architecture clearly

### 3. Resume Section
- Single source of truth: resume data stored as structured JSON or MDX
- Browser view: beautifully typeset, print-friendly HTML/CSS layout
- Download options: PDF (pre-generated, always in sync) and optionally DOCX
- Consider Puppeteer or equivalent for on-demand PDF generation from the HTML source
- This should look as good as a professionally designed resume template

### 4. Bio / About
- Pulled from GitHub profile where possible (name, bio, avatar)
- There are many .MD files in the "assets" folder describing various resumes and achievements. 
- Supplemented with a curated summary in a content file
- Consider a terminal-style animated intro or typed-text effect that fits a security/dev aesthetic
- Social links: GitHub, LinkedIn, email

---

## TECH STACK

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Hosting | Cloudflare Pages |
| Edge functions | Cloudflare Workers |
| Caching | Cloudflare KV |
| WAF | Cloudflare WAF rules |
| Vulnerable demo backend | Fly.io or Railway (Docker container) |
| Styling | Tailwind CSS + shadcn/ui |
| Resume source | JSON or MDX |

---

## DESIGN DIRECTION

- Dark theme preferred — professional, modern, security-tool aesthetic
- Clean typography, generous whitespace
- The WAF demo panel should feel like a real security dashboard
- Mobile responsive throughout
- Accessibility baseline: proper ARIA labels, keyboard navigable

---

## WHAT I NEED FROM YOU

1. **Start with architecture** — produce a full project structure and architecture decision record before writing implementation code
2. **Define the GitHub topic schema** — what topics should I add to my repos for the categorization to work?
3. **Design the WAF demo isolation** — diagram or describe the network/infrastructure boundary between the main portfolio and the vulnerable app
4. **Implement the full project** — all frontend components, Workers/edge functions, resume rendering, WAF demo UI, and the isolated vulnerable backend
5. **Write deployment instructions** — Cloudflare Pages setup, Workers config, Fly.io deployment, WAF rule configuration
6. **Document the WAF demo** clearly so visitors understand what they're seeing

Start with step 1 and proceed methodically. Ask me before making any significant architecture decisions that aren't covered above.