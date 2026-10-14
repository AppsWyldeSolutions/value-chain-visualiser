import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // React and the web component are dependencies, so tsup leaves them as
  // imports. esbuild drops module directives when bundling, so the banner
  // puts "use client" back for the Next.js App Router.
  banner: { js: '"use client";' },
  tsconfig: "tsconfig.build.json",
  target: "es2022",
});
