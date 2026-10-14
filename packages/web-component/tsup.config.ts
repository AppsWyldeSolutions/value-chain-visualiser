import { cp } from "node:fs/promises";
import type { Plugin } from "esbuild";
import { defineConfig } from "tsup";

// Core and the renderer are bundled in, so consumers install one package.
const noExternal = [/^@appswyldesolutions\/vcv-/];

// The define entry imports the root entry's built file rather than bundling
// its own copy, so "." and "./define" share one element class in ESM and CJS.
const rootEntryExternal: Plugin = {
  name: "root-entry-external",
  setup(build) {
    const file =
      build.initialOptions.format === "cjs" ? "index.cjs" : "index.js";
    build.onResolve({ filter: /^\.\/index\.js$/ }, () => ({
      path: `./${file}`,
      external: true,
    }));
  },
};

export default defineConfig([
  {
    entry: { index: "src/index.ts", define: "src/define.ts" },
    format: ["esm", "cjs"],
    dts: { resolve: noExternal },
    noExternal,
    esbuildPlugins: [rootEntryExternal],
    tsconfig: "tsconfig.build.json",
    target: "es2022",
    // The renderer embeds its fonts, so their licences travel with the build.
    onSuccess: () =>
      cp("../renderer/licenses", "dist/licenses", { recursive: true }),
  },
  {
    // One file for a <script> tag: registers the element and exposes the
    // exports as window.ValueChainVisualiser.
    entry: { vcv: "src/define.ts" },
    format: ["iife"],
    globalName: "ValueChainVisualiser",
    outExtension: () => ({ js: ".iife.js" }),
    noExternal,
    tsconfig: "tsconfig.build.json",
    target: "es2022",
    minify: true,
  },
]);
