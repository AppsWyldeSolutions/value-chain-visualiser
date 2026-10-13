import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    // Serve the packages straight from source so the playground needs no build.
    alias: {
      "@fixtures": fileURLToPath(new URL("../../fixtures", import.meta.url)),
      "@AppsWyldeSolutions/vcv-core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@AppsWyldeSolutions/vcv-renderer": fileURLToPath(
        new URL("../../packages/renderer/src/index.ts", import.meta.url),
      ),
    },
  },
});
