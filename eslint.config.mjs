import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      ".consumers/**",
      "**/.tmp/**",
      "docs/prototype/**",
      "packages/tableau-extension/public/lib/**",
      "fixtures/**",
      "**/*.md",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
