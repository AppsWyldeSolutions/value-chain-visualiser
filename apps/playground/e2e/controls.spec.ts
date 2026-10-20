import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

interface GoldenRow {
  node: string;
  group: string;
  subGroup: string;
  metric: string;
  year: number;
  period: string;
  hasData: boolean;
  met: boolean;
  level: number;
  label: string;
}

interface DrawnSphere {
  metric: string | undefined;
  label: string | null | undefined;
  state: string;
  level: string;
}

// fixtures/golden holds the prototype's own evaluation of the fixture, made
// independently of packages/core.
const GOLDEN = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../fixtures/golden/bobos-big-block.json", import.meta.url),
    ),
    "utf8",
  ),
) as GoldenRow[];

/**
 * What every sphere on the page should show for a period, in page order:
 * each card's KPIs (a process: primary, then satellites; the Score Card:
 * primary, then each sub-group's panel), then the transfer points in the
 * arrows' popovers, one arrow per link that has a next link.
 */
function expectedSpheres(period: string): DrawnSphere[] {
  const rows = GOLDEN.filter((r) => r.year === 2026 && r.period === period);
  const nodes = [...new Set(rows.map((r) => r.node))];
  const of = (node: string, group: string) =>
    rows.filter((r) => r.node === node && r.group === group);
  const drawn = (r: GoldenRow): DrawnSphere => ({
    metric: r.metric,
    label: r.label,
    state: !r.hasData ? "no-data" : r.met ? "met" : "missed",
    level: `${(r.level * 100).toFixed(1)}%`,
  });

  const cards = nodes.flatMap((node) => {
    const primary = of(node, "Primary");
    const satellites = of(node, "Satellite");
    if (node !== "Score Card") return [...primary, ...satellites];
    const panels = [...new Set(satellites.map((r) => r.subGroup))];
    return [
      ...primary,
      ...panels.flatMap((name) =>
        satellites.filter((r) => r.subGroup === name),
      ),
    ];
  });
  const transfers = nodes
    .slice(0, -1)
    .flatMap((node) => of(node, "Transfer Points"));
  return [...cards, ...transfers].map(drawn);
}

function drawnSpheres(page: Page): Promise<DrawnSphere[]> {
  return page.locator(".vcv-grid .vcv-kpi").evaluateAll((kpis) =>
    kpis.map((kpi) => {
      const sphere = kpi.querySelector<HTMLElement>(".vcv-sphere");
      const state = sphere?.classList.contains("vcv-sphere--no-data")
        ? "no-data"
        : sphere?.classList.contains("vcv-sphere--met")
          ? "met"
          : "missed";
      return {
        metric: kpi.getAttribute("title")?.split("\n")[0],
        label: kpi.querySelector(".vcv-kpi__percent")?.textContent,
        state,
        level: sphere?.style.getPropertyValue("--vcv-sphere-level") ?? "",
      };
    }),
  );
}

async function openVisual(page: Page, width = 1440): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/?view=visual&display=full");
  await expect(page.locator(".vcv-card--score")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test("matches the header screenshot", async ({ page }) => {
  await openVisual(page);
  await expect(page.locator(".vcv-header")).toHaveScreenshot(
    "header-controls.png",
  );
});

test("changing Period updates every sphere", async ({ page }) => {
  await openVisual(page);
  const period = page.getByLabel("Period");
  await expect(period).toHaveValue("August");
  expect(await drawnSpheres(page)).toEqual(expectedSpheres("August"));

  for (const next of ["July", "February", "September"]) {
    await period.selectOption(next);
    await expect(page.locator(".vcv-header__subtitle")).toContainText(
      `${next} 2026`,
    );
    const drawn = await drawnSpheres(page);
    expect(drawn).toHaveLength(85);
    expect(drawn).toEqual(expectedSpheres(next));
  }
});

test("changing Year redraws the chain for that year", async ({ page }) => {
  await openVisual(page);
  await page.getByLabel("Year").selectOption("2027");
  await expect(page.locator(".vcv-header__subtitle")).toHaveText(
    "August 2027 · No data loaded for this period",
  );
  await expect(page.locator(".vcv-card")).toHaveCount(9);
  await expect(
    page.locator(".vcv-sphere:not(.vcv-sphere--no-data)"),
  ).toHaveCount(0);
});

test("colour change updates met and short fills", async ({ page }) => {
  await openVisual(page);

  // The colours each sphere should be drawn in, worked out by the browser
  // from the default theme's ring opacity and liquid gradient.
  const expected = (color: string) =>
    page.evaluate((c) => {
      const probe = document.createElement("div");
      probe.style.borderTop = `2px solid color-mix(in srgb, ${c} 92%, transparent)`;
      probe.style.backgroundImage = `linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, #ffffff 35%, ${c}) 80%, transparent), color-mix(in srgb, ${c} 66%, transparent))`;
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const result = {
        ring: style.borderTopColor,
        liquid: style.backgroundImage,
      };
      probe.remove();
      return result;
    }, color);

  const drawn = (state: string) =>
    page.locator(`.vcv-card .vcv-sphere--${state}`).evaluateAll((spheres) =>
      spheres.map((sphere) => ({
        ring: getComputedStyle(sphere).borderTopColor,
        liquid: getComputedStyle(
          sphere.querySelector(".vcv-sphere__liquid") as Element,
        ).backgroundImage,
      })),
    );

  const expectAll = async (state: string, color: string) => {
    const want = await expected(color);
    const spheres = await drawn(state);
    expect(spheres.length).toBeGreaterThan(0);
    for (const sphere of spheres) expect(sphere).toEqual(want);
  };

  await expectAll("met", "#8fd3f4");
  await expectAll("missed", "#ff9f40");

  await page.getByLabel("Fill colour when target is met").fill("#00aa55");
  await expectAll("met", "#00aa55");
  await expectAll("missed", "#ff9f40");

  await page.getByLabel("Fill colour when target is missed").fill("#cc2266");
  await expectAll("met", "#00aa55");
  await expectAll("missed", "#cc2266");
});

test("keeps the controls usable on a narrow screen", async ({ page }) => {
  await openVisual(page, 480);
  for (const label of [
    "Year",
    "Period",
    "Fill colour when target is met",
    "Fill colour when target is missed",
  ]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
