import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  // fixtures/ is served as static files, so <value-chain-visualiser
  // data-src="/bobos-big-block.json"> can fetch one.
  publicDir: fileURLToPath(new URL("../../fixtures", import.meta.url)),
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
      "@AppsWyldeSolutions/vcv-web-component": fileURLToPath(
        new URL("../../packages/web-component/src/index.ts", import.meta.url),
      ),
    },
  },
});
