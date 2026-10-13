import { expect, test, type Page } from "@playwright/test";

const STATES = ["met", "short", "exceeded", "full", "empty", "no-data"];

interface Measured {
  state: string | null;
  size: number;
  fill: number;
  liquidShown: boolean;
  meniscusShown: boolean;
  ringStyle: string;
  ringColor: string;
}

async function openSpheres(page: Page): Promise<void> {
  await page.goto("/?view=spheres");
  await expect(page.locator(".vcv-sphere").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

// Measures the large sphere of each state as the browser actually drew it.
function measure(page: Page): Promise<Measured[]> {
  return page
    .locator("[data-size='large'] .vcv-sphere")
    .evaluateAll((spheres) =>
      spheres.map((sphere) => {
        const liquid = sphere.querySelector(".vcv-sphere__liquid");
        const meniscus = sphere.querySelector(".vcv-sphere__meniscus");
        if (!liquid || !meniscus) throw new Error("sphere is missing parts");
        const style = getComputedStyle(sphere);
        const liquidShown = getComputedStyle(liquid).display !== "none";
        return {
          state:
            sphere.closest("[data-state]")?.getAttribute("data-state") ?? null,
          size: sphere.getBoundingClientRect().width,
          fill: liquidShown
            ? liquid.getBoundingClientRect().height / sphere.clientHeight
            : 0,
          liquidShown,
          meniscusShown: getComputedStyle(meniscus).display !== "none",
          ringStyle: style.borderTopStyle,
          ringColor: style.borderTopColor,
        };
      }),
    );
}

test("matches the screenshot grid of the six states", async ({ page }) => {
  await openSpheres(page);
  await expect(page).toHaveScreenshot("spheres-states.png");
});

test("draws each state the way core evaluated it", async ({ page }) => {
  await openSpheres(page);
  const spheres = await measure(page);
  expect(spheres.map((sphere) => sphere.state)).toEqual(STATES);
  const [met, short, exceeded, full, empty, noData] = spheres;

  for (const sphere of spheres) expect(sphere.size).toBe(132);

  // Fill height is actual / budget, capped at a full sphere.
  expect(met?.fill).toBeCloseTo(0.7, 2);
  expect(short?.fill).toBeCloseTo(0.44, 2);
  expect(exceeded?.fill).toBeCloseTo(1, 2);
  expect(full?.fill).toBeCloseTo(1, 2);
  expect(empty?.fill).toBe(0);
  expect(noData?.liquidShown).toBe(false);

  // Only a partly filled sphere has a surface to show.
  expect(spheres.map((sphere) => sphere.meniscusShown)).toEqual([
    true,
    true,
    false,
    false,
    false,
    false,
  ]);

  // On target shares one ring colour, missed another, no data a dashed third.
  expect(exceeded?.ringColor).toBe(met?.ringColor);
  expect(full?.ringColor).toBe(short?.ringColor);
  expect(empty?.ringColor).toBe(short?.ringColor);
  expect(short?.ringColor).not.toBe(met?.ringColor);
  expect(noData?.ringColor).not.toBe(met?.ringColor);
  expect(noData?.ringColor).not.toBe(short?.ringColor);
  expect(spheres.map((sphere) => sphere.ringStyle)).toEqual([
    "solid",
    "solid",
    "solid",
    "solid",
    "solid",
    "dashed",
  ]);
});

test("recolours every sphere when the theme changes", async ({ page }) => {
  await openSpheres(page);
  const before = await measure(page);
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".vcv-root");
    root?.style.setProperty("--vcv-fill-color", "#00ff00");
    root?.style.setProperty("--vcv-shortfall-color", "#ff00ff");
  });
  const after = await measure(page);

  const ring = (list: Measured[], state: string) =>
    list.find((sphere) => sphere.state === state)?.ringColor;
  expect(ring(after, "met")).not.toBe(ring(before, "met"));
  expect(ring(after, "short")).not.toBe(ring(before, "short"));
  expect(ring(after, "no-data")).toBe(ring(before, "no-data"));
});
