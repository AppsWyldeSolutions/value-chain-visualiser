// npm run icon -w packages/tableau-extension: renders assets/icon.svg to
// assets/icon.png, the 70x70 PNG Tableau requires for the .trex icon. Run it
// after changing the SVG, and commit both.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const svg = readFileSync(
  new URL("../assets/icon.svg", import.meta.url),
  "utf8",
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 70, height: 70 } });
  await page.setContent(
    `<style>html, body { margin: 0; background: transparent; }</style>${svg}`,
  );
  await page.locator("svg").screenshot({
    path: fileURLToPath(new URL("../assets/icon.png", import.meta.url)),
    omitBackground: true,
  });
} finally {
  await browser.close();
}
console.log("Wrote assets/icon.png");
