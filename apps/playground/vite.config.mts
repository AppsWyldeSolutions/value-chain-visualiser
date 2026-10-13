import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    // Serve the renderer straight from source so the playground needs no build.
    alias: {
      "@AppsWyldeSolutions/vcv-renderer": fileURLToPath(
        new URL("../../packages/renderer/src/index.ts", import.meta.url),
      ),
    },
  },
});
