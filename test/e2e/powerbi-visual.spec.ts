import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { KpiRow } from "@appswyldesolutions/vcv-core";
import { expect, test } from "@playwright/test";

// The packaged Power BI visual, loaded the way Power BI loads it: the built
// bundle registers a plugin on window.powerbi, which is asked to create the
// visual in an element and then updated with a table data view. Short of
// Power BI itself (see packages/powerbi-visual/README.md), this checks the
// bundle runs in a browser with no errors.
const visualDir = path.resolve("packages/powerbi-visual");
const drop = path.join(visualDir, ".tmp/drop");
const guid = (
  JSON.parse(readFileSync(path.join(visualDir, "pbiviz.json"), "utf8")) as {
    visual: { guid: string };
  }
).visual.guid;

// The fixture as a table data view, one column per KpiRow field, which is
// what the visual's stub mapping reads.
let table: { columns: object[]; rows: unknown[][] };

test.beforeAll(async () => {
  // Core is ESM only, and Playwright compiles specs to CommonJS.
  const { fromLongRows } = await import("@appswyldesolutions/vcv-core");
  const rows: KpiRow[] = fromLongRows(
    (
      JSON.parse(
        readFileSync(path.resolve("fixtures/bobos-big-block.json"), "utf8"),
      ) as { records: unknown[] }
    ).records,
  );
  const fields = Object.keys(rows[0]!) as (keyof KpiRow)[];
  table = {
    columns: fields.map((field, index) => ({
      displayName: field,
      queryName: `Kpis.${field}`,
      index,
      roles: { fields: true },
    })),
    rows: rows.map((row) => fields.map((field) => row[field])),
  };
  expect(
    existsSync(path.join(drop, "visual.js")),
    "build the visual first: npm run build",
  ).toBe(true);
});

test("the packaged visual draws the chain in a browser, with no errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.setContent(
    '<div id="host" style="width: 1400px; height: 900px"></div>',
  );
  await page.evaluate(() => {
    (window as unknown as { powerbi: object }).powerbi = {};
  });
  await page.addStyleTag({
    content: readFileSync(path.join(drop, "visual.css"), "utf8"),
  });
  await page.addScriptTag({
    content: readFileSync(path.join(drop, "visual.js"), "utf8"),
  });

  const events = await page.evaluate(
    ({ guid, table }) => {
      type Plugin = {
        create(options: object): { update(options: object): void };
      };
      const plugins = (
        window as unknown as {
          powerbi: { visuals: { plugins: Record<string, Plugin> } };
        }
      ).powerbi.visuals.plugins;
      const events: string[] = [];
      const visual = plugins[guid]!.create({
        element: document.getElementById("host"),
        host: {
          eventService: {
            renderingStarted: () => events.push("started"),
            renderingFinished: () => events.push("finished"),
            renderingFailed: (_: unknown, reason: string) =>
              events.push(`failed: ${reason}`),
          },
        },
      });
      visual.update({ dataViews: [{ table }], viewport: {} });
      return events;
    },
    { guid, table },
  );

  expect(events).toEqual(["started", "finished"]);
  const host = page.locator("#host");
  await expect(host.locator(".vcv-root")).toHaveCount(1);
  await expect(host.locator(".vcv-grid > .vcv-card")).toHaveCount(9);
  await expect(host.locator(".vcv-card--score")).toBeVisible();
  await expect(host.locator(".vcv-controls")).toHaveCount(0);
  await expect(host.locator(".vcv-header__subtitle")).toHaveText(
    "August 2026 · 53 KPIs measured against budget",
  );
  expect(errors).toEqual([]);
  // Power BI's sandbox allows no network access: fonts and styles are inline.
  expect(requests.filter((url) => !url.startsWith("data:"))).toEqual([]);
});
