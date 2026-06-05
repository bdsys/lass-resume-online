import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // E2E lives in tests/e2e/ and is run by Playwright, not Vitest
    exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/.open-next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/components/**"],
    },
  },
});
