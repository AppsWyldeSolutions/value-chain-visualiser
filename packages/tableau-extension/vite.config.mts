import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const source = (file: string) =>
  fileURLToPath(new URL(`../${file}`, import.meta.url));

export default defineConfig(({ command }) => ({
  // Relative URLs, so the built dist/ works wherever it is hosted.
  base: "./",
  resolve: {
    // The dev server serves the packages straight from source, so edits to
    // the renderer show in Tableau on reload with no build. The build
    // bundles the web component's built dist/, like any other host would.
    alias:
      command === "serve"
        ? {
            "@appswyldesolutions/vcv-core": source("core/src/index.ts"),
            "@appswyldesolutions/vcv-renderer": source("renderer/src/index.ts"),
            // Before the root alias, which would otherwise match ".../define" first.
            "@appswyldesolutions/vcv-web-component/define": source(
              "web-component/src/define.ts",
            ),
            "@appswyldesolutions/vcv-web-component": source(
              "web-component/src/index.ts",
            ),
          }
        : {},
  },
}));
