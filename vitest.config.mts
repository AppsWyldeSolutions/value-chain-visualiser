import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Test against the packages' source so unit tests need no build first.
    alias: {
      "@appswyldesolutions/vcv-core": fileURLToPath(
        new URL("packages/core/src/index.ts", import.meta.url),
      ),
      "@appswyldesolutions/vcv-renderer": fileURLToPath(
        new URL("packages/renderer/src/index.ts", import.meta.url),
      ),
      // Before the root alias, which would otherwise match ".../define" first.
      "@appswyldesolutions/vcv-web-component/define": fileURLToPath(
        new URL("packages/web-component/src/define.ts", import.meta.url),
      ),
      "@appswyldesolutions/vcv-web-component": fileURLToPath(
        new URL("packages/web-component/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    passWithNoTests: true,
    // The first test in a jsdom file also pays for the environment, the
    // embedded fonts and the first full draw of the fixture's 1,020 rows:
    // about 5s on a loaded machine, against Vitest's default limit of 5s.
    testTimeout: 20_000,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
