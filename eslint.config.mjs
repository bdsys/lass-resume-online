import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare build output — generated files, not source
    ".open-next/**",
    ".wrangler/**",
    // Separate package with its own tooling — exclude entirely
    "waf-demo-app/**",
    // Handoff drop-in scratch folder — not source; removed after the /journey PR merges
    "integration/**",
  ]),
]);

export default eslintConfig;
