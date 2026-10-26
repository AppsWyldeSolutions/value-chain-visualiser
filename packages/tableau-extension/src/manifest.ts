// The extension's .trex manifest, which Tableau reads to add the extension
// to a dashboard (https://tableau.github.io/extensions-api/docs/dashext/trex_manifest).
// trexPlugin.ts writes it: the hosted one into dist/ at build, the
// development one (for localhost) when the dev server starts.

/** Tableau's rule: a reverse-domain id, unique to the extension. */
export const EXTENSION_ID = "com.wyldesolutions.valuechainvisualiser";

/** The dev server's page (npm start -w packages/tableau-extension). */
export const DEV_URL = "http://localhost:8765/index.html";

/**
 * Where the extension is hosted: GitHub Pages, deployed from main by
 * .github/workflows/pages.yml. The hosted build points here by default.
 */
export const HOSTED_URL =
  "https://appswyldesolutions.github.io/value-chain-visualiser/tableau/index.html";

/**
 * The oldest Extensions API the extension runs on. Its newer calls have
 * fallbacks: without SummaryDataChanged (1.9) it listens for FilterChanged.
 */
export const MIN_API_VERSION = "1.4";

export interface ManifestOptions {
  /** extension-version: the package's version. */
  version: string;
  /** The page Tableau loads; see sourceUrl. */
  url: string;
  /** The 70x70 PNG icon, base64-encoded. */
  icon: string;
  /** The development manifest: its own id and name, beside the hosted one. */
  dev?: boolean;
}

/**
 * The hosted page's URL, checked: GitHub Pages when none is given, and
 * https only, as Tableau loads plain http from localhost alone.
 */
export function sourceUrl(url: string | undefined): string {
  if (!url) return HOSTED_URL;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${url} is not a URL`);
  }
  const localhost =
    parsed.protocol === "http:" && parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !localhost) {
    throw new Error(
      `${url} must use https: Tableau loads plain http only from localhost`,
    );
  }
  return url;
}

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * The .trex XML. It declares no <permissions>: Tableau's only one, full
 * data, is for the underlying-data APIs, and getSummaryDataAsync needs none.
 */
export function manifest(options: ManifestOptions): string {
  const id = options.dev ? `${EXTENSION_ID}.dev` : EXTENSION_ID;
  const name = options.dev
    ? "Value Chain Visualiser (dev)"
    : "Value Chain Visualiser";
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest manifest-version="0.1" xmlns="http://www.tableau.com/xml/extension_manifest">
  <dashboard-extension id="${escape(id)}" extension-version="${escape(options.version)}">
    <default-locale>en_US</default-locale>
    <name resource-id="name"/>
    <description>A glass-and-spheres KPI visual for business-process value chains.</description>
    <author name="Wylde Solutions Pty Ltd" email="apps.wyldesolutions@gmail.com" organization="Wylde Solutions" website="https://github.com/AppsWyldeSolutions/value-chain-visualiser"/>
    <min-api-version>${MIN_API_VERSION}</min-api-version>
    <source-location>
      <url>${escape(options.url)}</url>
    </source-location>
    <icon>${escape(options.icon)}</icon>
  </dashboard-extension>
  <resources>
    <resource id="name">
      <text locale="en_US">${escape(name)}</text>
    </resource>
  </resources>
</manifest>
`;
}
