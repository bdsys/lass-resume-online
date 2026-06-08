/**
 * src/lib/version.ts
 *
 * Typed loader for build-time version metadata.
 *
 * SOURCE OF TRUTH: git tag / SHA / log (read at build time)
 * GENERATED COPY:  src/data/version.json (produced by `make version-check`)
 *
 * To update:
 *   node scripts/gen-version.mjs    ← or `make version-check`
 *   The prebuild hook runs this automatically before every `npm run build`.
 */

import { z } from "zod";
import versionJson from "../data/version.json";

// ── Schema ────────────────────────────────────────────────────────────────────

const VersionSchema = z.object({
  number: z.string(),
  name: z.string(),
  sha: z.string(),
  describe: z.string(),
  date: z.string(),
});

export type Version = z.infer<typeof VersionSchema>;

// ── Loader ────────────────────────────────────────────────────────────────────

let _cached: Version | null = null;

/**
 * Returns the validated Version object parsed from src/data/version.json.
 * Throws a descriptive error if the JSON doesn't match the schema (i.e.,
 * the generated file is missing or malformed — run `make version-check`).
 */
export function getVersion(): Version {
  if (_cached) return _cached;

  const result = VersionSchema.safeParse(versionJson);
  if (!result.success) {
    const detail = result.error.issues
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(
      `src/data/version.json failed schema validation.\n` +
        `Run \`make version-check\` to regenerate from git metadata.\n` +
        detail
    );
  }

  _cached = result.data;
  return result.data;
}
