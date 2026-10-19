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

// The fixture as a table data view: one column per KpiRow field, each bound
// to the data role of the same name.
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
      roles: { [field]: true },
    })),
    rows: rows.map((row) => fields.map((field) => row[field])),
  };
  expect(
    existsSync(path.join(drop, "visual.js")),
    "build the visual first: npm run build",
  ).toBe(true);
});

type Page = import("@playwright/test").Page;

/**
 * Loads the packaged bundle into a blank page the way Power BI does, creates
 * the visual through the plugin it registers, and keeps it as
 * window.vcvVisual; the rendering events go to window.vcvEvents.
 */
async function load(page: Page) {
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
  await page.evaluate((guid) => {
    type Plugin = { create(options: object): object };
    const w = window as unknown as {
      powerbi: { visuals: { plugins: Record<string, Plugin> } };
      vcvVisual: object;
      vcvEvents: string[];
      vcvTooltips: { call: string; options: unknown }[];
      vcvPalette: { isHighContrast: boolean };
    };
    w.vcvEvents = [];
    w.vcvTooltips = [];
    w.vcvPalette = {
      isHighContrast: false,
      foreground: { value: "#ffff00" },
      background: { value: "#000000" },
      foregroundSelected: { value: "#00ffff" },
      hyperlink: { value: "#ff00ff" },
    } as { isHighContrast: boolean };
    // A selection manager that, like Power BI's, replaces the selection on
    // a plain select and adds to it on a multi-select. Ids are table rows.
    type Id = { row: number; equals(other: Id): boolean };
    let selected: Id[] = [];
    const selectionManager = {
      select: async (id: Id, multi = false) => {
        selected = multi ? [...selected, id] : [id];
        return selected;
      },
      clear: async () => {
        selected = [];
        return {};
      },
      getSelectionIds: () => selected,
      registerOnSelectCallback: () => {},
    };
    w.vcvVisual = w.powerbi.visuals.plugins[guid]!.create({
      element: document.getElementById("host"),
      host: {
        // Records what the visual asks Power BI's tooltip service to do.
        tooltipService: {
          enabled: () => true,
          show: (options: unknown) =>
            w.vcvTooltips.push({ call: "show", options }),
          move: (options: unknown) =>
            w.vcvTooltips.push({ call: "move", options }),
          hide: (options: unknown) =>
            w.vcvTooltips.push({ call: "hide", options }),
        },
        // Power BI's palette in its "High contrast #1" colours; the test turns
        // isHighContrast on and off.
        colorPalette: w.vcvPalette,
        locale: "en-US",
        createSelectionManager: () => selectionManager,
        createSelectionIdBuilder: () => {
          let id: Id;
          const builder = {
            withTable(_: unknown, row: number) {
              id = { row, equals: (other: Id) => other.row === row };
              return builder;
            },
            createSelectionId: () => id,
          };
          return builder;
        },
        eventService: {
          renderingStarted: () => w.vcvEvents.push("started"),
          renderingFinished: () => w.vcvEvents.push("finished"),
          renderingFailed: (_: unknown, reason: string) =>
            w.vcvEvents.push(`failed: ${reason}`),
        },
      },
    });
  }, guid);
}

/** Power BI's update: the table, and the format pane's saved settings. */
async function update(page: Page, objects: object = {}) {
  await page.evaluate(
    ({ table, objects }) => {
      const visual = (
        window as unknown as { vcvVisual: { update(options: object): void } }
      ).vcvVisual;
      visual.update({
        dataViews: [{ table, metadata: { columns: [], objects } }],
        viewport: {},
      });
    },
    { table, objects },
  );
}

const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { vcvEvents: string[] }).vcvEvents);

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

  await load(page);
  await update(page);

  expect(await events(page)).toEqual(["started", "finished"]);
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

test("each format pane setting updates the drawn visual, with no reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await load(page);
  await update(page);

  const host = page.locator("#host");
  const root = host.locator(".vcv-root");
  const ocean = host.locator(".vcv-ocean");
  const primary = host.locator(".vcv-kpi--primary .vcv-sphere").first();
  const transfers = host.locator(".vcv-transfer");
  const style = (name: string) =>
    root.evaluate(
      (element, name) => getComputedStyle(element).getPropertyValue(name),
      name,
    );
  await expect(transfers.first()).toBeAttached();
  const transferCount = await transfers.count();
  expect((await primary.boundingBox())?.width).toBeCloseTo(132, 0);
  await root.evaluate((element) => element.setAttribute("data-first", ""));

  await update(page, {
    colours: {
      fillColor: { solid: { color: "#2f9e44" } },
      shortfallColor: { solid: { color: "#e03131" } },
    },
    background: { preset: "deep", opacity: 40 },
    display: { showTransferPoints: false, sphereSize: 150 },
  });

  // The same element, restyled: nothing was reloaded.
  await expect(host.locator(".vcv-root[data-first]")).toHaveCount(1);
  expect((await style("--vcv-fill-color")).trim()).toBe("#2f9e44");
  expect((await style("--vcv-shortfall-color")).trim()).toBe("#e03131");
  await expect(ocean).toHaveCSS("opacity", "0.4");
  await expect(ocean).toHaveCSS("background-color", "rgb(3, 24, 44)");
  await expect
    .poll(async () => (await primary.boundingBox())?.width)
    .toBeCloseTo(198, 0);
  await expect(transfers).toHaveCount(0);

  // No ocean at all: the page behind shows through.
  await update(page, { background: { preset: "none" } });
  // Two background layers (gradient, base colour), neither an image.
  await expect(ocean).toHaveCSS("background-image", "none, none");
  await expect(ocean).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(root).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  // Back to the defaults: Transfer Points return, spheres and ocean reset.
  await update(page);
  await expect(transfers).toHaveCount(transferCount);
  await expect(ocean).toHaveCSS("opacity", "1");
  await expect(ocean).toHaveCSS("background-color", "rgb(7, 58, 99)");
  await expect
    .poll(async () => (await primary.boundingBox())?.width)
    .toBeCloseTo(132, 0);
  expect((await events(page)).filter((e) => e.startsWith("failed"))).toEqual(
    [],
  );
  expect(errors).toEqual([]);
});

test("clicking spheres selects, ctrl-click adds, a click away clears", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await load(page);
  await update(page);

  const host = page.locator("#host");
  const cards = host.locator(".vcv-grid > .vcv-card");
  const dimmed = host.locator(".vcv-grid > .vcv-card--dimmed");
  await expect(cards).toHaveCount(9);
  const sphere = (card: number) =>
    cards.nth(card).locator(".vcv-kpi--primary .vcv-sphere").first();

  await sphere(0).click();
  await expect(dimmed).toHaveCount(8);
  await expect(cards.nth(0)).not.toHaveClass(/vcv-card--dimmed/);
  await expect(cards.nth(1)).toHaveCSS("opacity", "0.35");

  await sphere(2).click({ modifiers: ["ControlOrMeta"] });
  await expect(dimmed).toHaveCount(7);
  await expect(cards.nth(2)).toHaveCSS("opacity", "1");

  await sphere(4).click();
  await expect(dimmed).toHaveCount(8);
  await expect(cards.nth(4)).not.toHaveClass(/vcv-card--dimmed/);

  await host.locator(".vcv-header__title").click();
  await expect(dimmed).toHaveCount(0);
  await expect(cards.nth(1)).toHaveCSS("opacity", "1");
  expect(errors).toEqual([]);
});

test("hovering shows Power BI's tooltip, not the browser's", async ({
  page,
}) => {
  await load(page);
  await update(page);
  const host = page.locator("#host");
  const kpi = host.locator(".vcv-card .vcv-kpi").first();
  const calls = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            vcvTooltips: {
              call: string;
              options: { dataItems?: { displayName: string; value: string }[] };
            }[];
          }
        ).vcvTooltips,
    );

  await kpi.locator(".vcv-sphere").hover();
  await expect
    .poll(async () => (await calls()).map((c) => c.call))
    .toContain("show");
  const shown = (await calls()).find((c) => c.call === "show")!;
  expect(shown.options.dataItems?.map((item) => item.displayName)).toEqual([
    "KPI",
    "Period",
    "Actual",
    "Budget",
    "Rule",
    "Status",
  ]);
  // No native tooltip to show alongside it.
  await expect(kpi).not.toHaveAttribute("title");

  await host.locator(".vcv-header__title").hover();
  await expect.poll(async () => (await calls()).at(-1)?.call).toBe("hide");
});

test("high-contrast mode draws the visual flat, in the palette's colours", async ({
  page,
}) => {
  await load(page);
  await update(page);
  const host = page.locator("#host");
  const root = host.locator(".vcv-root");
  const card = host.locator(".vcv-grid > .vcv-card").first();
  const liquid = host
    .locator(".vcv-sphere:not(.vcv-sphere--no-data) .vcv-sphere__liquid")
    .first();
  const highlight = host.locator(".vcv-sphere__highlight").first();
  const setContrast = (on: boolean) =>
    page.evaluate((on) => {
      (
        window as unknown as { vcvPalette: { isHighContrast: boolean } }
      ).vcvPalette.isHighContrast = on;
    }, on);

  await expect(liquid).not.toHaveCSS("background-image", "none");

  await setContrast(true);
  await update(page);
  await expect(root).toHaveClass(/vcv-root--flat/);
  await expect(root).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(host.locator(".vcv-ocean")).toBeHidden();
  await expect(card).toHaveCSS("backdrop-filter", "none");
  await expect(card).toHaveCSS("box-shadow", "none");
  await expect(card).toHaveCSS("background-image", "none");
  await expect(card).toHaveCSS("border-top-color", "rgb(255, 255, 0)");
  await expect(card).toHaveCSS("border-top-style", "solid");
  await expect(liquid).toHaveCSS("background-image", "none");
  expect(
    await liquid.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toMatch(/^rgb\((255, 255, 0|255, 0, 255)\)$/);
  await expect(highlight).toBeHidden();

  await setContrast(false);
  await update(page);
  await expect(root).not.toHaveClass(/vcv-root--flat/);
  await expect(host.locator(".vcv-ocean")).toBeVisible();
  await expect(liquid).not.toHaveCSS("background-image", "none");
});
