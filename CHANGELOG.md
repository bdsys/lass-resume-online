# Changelog

All notable releases are documented here.

**Convention:** version = annotated git tag name (`vX.Y.Z`), codename = that tag's
message body. Releases deploy to production automatically on merge to `main`.

To cut a new release:
```bash
git tag -a vX.Y.Z -m "Codename"
git push origin vX.Y.Z
```

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [v0.2.6] — "Milly Pie" — 2026-06-08

> Note: shares codename with v0.2.0 (the tag was not re-named — see v0.2.0 entry).

### Fixed
- Preview deploy was missing `fetch-depth: 0` and `DEPLOY_ENV: preview`, causing the
  footer to show `v0.1.0 · "dev" · production` on the preview environment.

### Changed
- Bumped all GitHub Actions to Node 24 runtime: `actions/checkout` v4→v6,
  `actions/setup-node` v4→v6, `actions/upload-artifact` v4→v7,
  `opentofu/setup-opentofu` v1→v2 across all 7 workflow files.
- Centered version/codename/environment line under "Made in Everett, Wash." in footer.
- Added `DEMO_KEY` to `wrangler.toml` preview secrets documentation.

---

## [v0.2.0] — "Milly Pie" — 2026-06-08

### Added
- Environment (`local` / `preview` / `production`) shown in the footer version line.
- `version-comment.yml` CI workflow — posts version number + release codename as a
  comment on every PR, with instructions for how to change them.

### Fixed
- WAF demo attack counter always showed 0: `incrementAttackCounter()` now runs before
  the KV cache short-circuit and is properly awaited.
- LinkedIn button on homepage now matches the "Get in Touch" button style (LinkedIn
  brand blue).

---

<!-- Links -->
[Unreleased]: https://github.com/bdsys/lass-resume-online/compare/v0.2.6...HEAD
[v0.2.6]: https://github.com/bdsys/lass-resume-online/compare/v0.2.0...v0.2.6
[v0.2.0]: https://github.com/bdsys/lass-resume-online/releases/tag/v0.2.0
