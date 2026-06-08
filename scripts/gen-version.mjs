#!/usr/bin/env node
/**
 * scripts/gen-version.mjs
 *
 * Reads git metadata and writes src/data/version.json.
 * Called by `make version-check` and automatically before `npm run build`
 * via the "prebuild" npm lifecycle hook.
 *
 * Usage:  node scripts/gen-version.mjs
 *         make version-check
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR  = join(ROOT, 'src', 'data');
const OUT_PATH = join(OUT_DIR, 'version.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Run a git command and return trimmed stdout.
 * Returns null if git is unavailable or the command fails.
 */
function git(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).toString().trim();
  } catch {
    return null;
  }
}

/**
 * Today's date in YYYY-MM-DD (local time).
 */
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── Read package.json version as fallback ─────────────────────────────────────

let pkgVersion = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  if (typeof pkg.version === 'string' && pkg.version) {
    pkgVersion = pkg.version;
  }
} catch {
  // ignore — leave default
}

// ── Extract git fields ────────────────────────────────────────────────────────

// number: latest tag without leading 'v', fallback to package.json version
const latestTag = git('describe --tags --abbrev=0');
let number;
if (latestTag) {
  number = latestTag.replace(/^v/, '');
  console.log(`✓  version.number: ${number} (from git tag ${latestTag})`);
} else {
  number = pkgVersion;
  console.log(`✓  version.number: ${number} (fallback from package.json — no git tags found)`);
}

// name: annotation subject of the latest tag, fallback to "dev"
let name = 'dev';
if (latestTag) {
  const tagMsg = git(`tag -l --format='%(contents:subject)' ${latestTag}`);
  if (tagMsg) {
    name = tagMsg;
    console.log(`✓  version.name: ${name}`);
  } else {
    console.log(`✓  version.name: dev (tag has no annotation message)`);
  }
} else {
  console.log(`✓  version.name: dev (fallback — no git tags found)`);
}

// sha: short HEAD commit hash
const sha = git('rev-parse --short HEAD') ?? 'unknown';
console.log(`✓  version.sha: ${sha}`);

// describe: full describe string (tag-distance-gSHA or SHA if no tags)
const describe = git('describe --tags --always --dirty') ?? sha;
console.log(`✓  version.describe: ${describe}`);

// date: commit date of HEAD in YYYY-MM-DD
const date = git('log -1 --format=%cs') ?? todayISO();
console.log(`✓  version.date: ${date}`);

// ── Write generated JSON ──────────────────────────────────────────────────────

const data = { number, name, sha, describe, date };

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`✓  Generated → src/data/version.json`);
console.log('\n✓  Version metadata written.');
