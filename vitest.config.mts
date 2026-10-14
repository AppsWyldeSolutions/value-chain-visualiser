import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Test against the packages' source so unit tests need no build first.
    alias: {
      "@AppsWyldeSolutions/vcv-core": fileURLToPath(
        new URL("packages/core/src/index.ts", import.meta.url),
      ),
      "@AppsWyldeSolutions/vcv-renderer": fileURLToPath(
        new URL("packages/renderer/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
