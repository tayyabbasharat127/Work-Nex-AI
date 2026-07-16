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
    // Accidentally committed Next.js development output. Treat it as generated
    // code until it is removed from version control in a dedicated cleanup.
    "dev/**",
    "next-env.d.ts",
    // Archived duplicate route tree with stale API contracts.
    "_archive_src_duplicate/**",
    // Generated Playwright HTML test report, not source code.
    "playwright-report/**",
    // Playwright test suite and config use CommonJS by design.
    "e2e/**",
    "playwright.config.js",
  ]),
]);

export default eslintConfig;
