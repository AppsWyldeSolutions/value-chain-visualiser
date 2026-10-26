import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { DEV_URL, manifest, sourceUrl } from "./manifest.js";

/** The hosted manifest, beside the built page in dist/. */
export const MANIFEST = "value-chain-visualiser.trex";
/** The development manifest, in the package folder, for localhost. */
export const DEV_MANIFEST = "value-chain-visualiser.dev.trex";

export interface TrexPluginOptions {
  /** packages/tableau-extension: its package.json and assets/icon.png. */
  packageDir: string;
  /** Where the development manifest goes; the package folder by default. */
  devDir?: string;
  /** TABLEAU_EXTENSION_URL, the hosted page's URL, is read from here. */
  env?: Record<string, string | undefined>;
}

/**
 * Writes the extension's .trex manifests: `vite build` emits the hosted one
 * into dist/, pointed at TABLEAU_EXTENSION_URL (the placeholder without
 * it); the dev server writes the one for localhost into the package folder.
 * Both take extension-version from package.json, which changesets bump.
 */
export function trexPlugin(options: TrexPluginOptions): Plugin {
  const { packageDir, devDir = packageDir, env = process.env } = options;
  let command: "build" | "serve" = "build";
  return {
    name: "vcv-trex",
    configResolved(config) {
      command = config.command;
    },
    buildStart() {
      const { version } = JSON.parse(
        readFileSync(path.join(packageDir, "package.json"), "utf8"),
      ) as { version: string };
      const icon = readFileSync(
        path.join(packageDir, "assets/icon.png"),
      ).toString("base64");
      if (command === "serve") {
        writeFileSync(
          path.join(devDir, DEV_MANIFEST),
          manifest({ version, url: DEV_URL, icon, dev: true }),
        );
        return;
      }
      let url: string;
      try {
        url = sourceUrl(env.TABLEAU_EXTENSION_URL);
      } catch (error) {
        throw new Error(
          `TABLEAU_EXTENSION_URL: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      this.emitFile({
        type: "asset",
        fileName: MANIFEST,
        source: manifest({ version, url, icon }),
      });
    },
  };
}
