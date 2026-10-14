import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The single-file browser build, loaded by a plain <script> tag on a page that
// has nothing else: no bundler, no playground code. global-setup.ts builds it.
const ORIGIN = "http://vcv.test";
const PAGE = `<!doctype html>
<html>
  <head><script src="/vcv.iife.js"></script></head>
  <body>
    <value-chain-visualiser data-src="/data.json"></value-chain-visualiser>
  </body>
</html>`;

test("the IIFE build registers <value-chain-visualiser> from a script tag", async ({
  page,
}) => {
  // Read here, not at load: Playwright collects tests before global setup.
  const iife = readFileSync("packages/web-component/dist/vcv.iife.js", "utf8");
  const data = readFileSync("fixtures/bobos-big-block.json", "utf8");
  const requested: string[] = [];
  await page.route(`${ORIGIN}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    requested.push(pathname);
    const [body, contentType] =
      pathname === "/vcv.iife.js"
        ? [iife, "text/javascript"]
        : pathname === "/data.json"
          ? [data, "application/json"]
          : [PAGE, "text/html"];
    return route.fulfill({ body, contentType });
  });

  await page.goto(`${ORIGIN}/`);
  await expect(page.locator("value-chain-visualiser .vcv-card")).toHaveCount(9);

  expect(
    await page.evaluate(
      () =>
        customElements.get("value-chain-visualiser") ===
        (window as unknown as { ValueChainVisualiser: Record<string, unknown> })
          .ValueChainVisualiser.ValueChainVisualiserElement,
    ),
  ).toBe(true);
  // One file: the page, the script and the data, nothing else fetched.
  expect(requested).toEqual(["/", "/vcv.iife.js", "/data.json"]);
});
