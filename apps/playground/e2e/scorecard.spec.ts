import { expect, test, type Page } from "@playwright/test";

// The same 85 KPIs in the two shapes core ingests: long rows and wide records.
const FIXTURES = ["bobos-big-block", "main-dc-prototype"];

const ROW_LABELS = [
  "Primary KPIs",
  "Financial Scorecard",
  "People & Culture Scorecard",
  "Production Performance Scorecard",
];

async function open(page: Page, query: string, width = 1440): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/?${query}`);
  await expect(page.locator(".vcv-card--score")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const fixture of FIXTURES) {
  test.describe(`Score Card from ${fixture}.json`, () => {
    test("matches the screenshot", async ({ page }) => {
      await open(page, `view=scorecard&fixture=${fixture}`);
      await expect(page.locator(".vcv-card--score")).toHaveScreenshot(
        `scorecard-${fixture}.png`,
      );
    });

    test("shows the primary row and sub-group panels, and no satellite row", async ({
      page,
    }) => {
      await open(page, `view=scorecard&fixture=${fixture}`);
      const card = page.locator(".vcv-card--score");
      await expect(card.locator(".vcv-card__eyebrow")).toHaveText("Outcome");
      await expect(card.locator(".vcv-card__title")).toHaveText("Score Card");
      await expect(card.locator(".vcv-card__pill")).toHaveText(
        "8 of 12 on target",
      );

      await expect(card.locator(".vcv-kpi-row__label")).toHaveText(ROW_LABELS);
      await expect(card.locator(".vcv-kpi-row--satellite")).toHaveCount(0);
      await expect(card.locator(".vcv-kpi--satellite")).toHaveCount(0);
      await expect(card.getByText("Satellite KPIs")).toHaveCount(0);

      await expect(card.locator(".vcv-kpi--primary")).toHaveCount(3);
      await expect(card.locator(".vcv-kpi-row--panel")).toHaveCount(3);
      await expect(card.locator(".vcv-kpi--panel")).toHaveCount(9);
      await expect(card.locator(".vcv-sphere")).toHaveCount(12);
    });
  });
}

test("spans the grid, with the three panels side by side at 1440px", async ({
  page,
}) => {
  await open(page, "view=scorecard");
  const layout = await page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`no ${selector}`);
      return element.getBoundingClientRect();
    };
    const spheres = (selector: string) =>
      Array.from(
        document.querySelectorAll(`${selector} .vcv-sphere`),
        (sphere) => sphere.getBoundingClientRect().width,
      );
    return {
      grid: box(".vcv-grid").width,
      card: box(".vcv-card--score").width,
      panelTops: Array.from(
        document.querySelectorAll(".vcv-kpi-row--panel"),
        (panel) => Math.round(panel.getBoundingClientRect().top),
      ),
      primarySpheres: spheres(".vcv-kpi--primary"),
      panelSpheres: spheres(".vcv-kpi--panel"),
    };
  });
  expect(layout.card).toBe(layout.grid);
  expect(new Set(layout.panelTops).size).toBe(1);
  expect(new Set(layout.primarySpheres)).toEqual(new Set([132]));
  expect(new Set(layout.panelSpheres)).toEqual(new Set([84]));
});

for (const width of [900, 480]) {
  test(`${width}px: still spans the grid, with nothing overlapping or cut off`, async ({
    page,
  }) => {
    await open(page, "view=scorecard", width);
    const layout = await page.evaluate(() => {
      const card = document.querySelector(".vcv-card--score");
      const grid = document.querySelector(".vcv-grid");
      if (!card || !grid) throw new Error("no score card");
      const cardBox = card.getBoundingClientRect();
      const kpis = Array.from(card.querySelectorAll(".vcv-kpi"));
      const spheres = Array.from(card.querySelectorAll(".vcv-sphere"), (s) =>
        s.getBoundingClientRect(),
      );
      let overlaps = 0;
      spheres.forEach((a, i) => {
        for (const b of spheres.slice(i + 1)) {
          const apart =
            a.right <= b.left + 0.5 ||
            b.right <= a.left + 0.5 ||
            a.bottom <= b.top + 0.5 ||
            b.bottom <= a.top + 0.5;
          if (!apart) overlaps++;
        }
      });
      return {
        spans: cardBox.width === grid.getBoundingClientRect().width,
        overlaps,
        inside: kpis.every((kpi) => {
          const rect = kpi.getBoundingClientRect();
          return (
            rect.left >= cardBox.left &&
            rect.right <= cardBox.right &&
            rect.bottom <= cardBox.bottom
          );
        }),
        pageOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    expect(layout).toEqual({
      spans: true,
      overlaps: 0,
      inside: true,
      pageOverflow: 0,
    });
  });
}

test.describe("the whole chain", () => {
  test("matches the screenshot", async ({ page }) => {
    await open(page, "view=full");
    await expect(page).toHaveScreenshot("full-1440.png", { fullPage: true });
  });

  test("ends with an arrow straight down onto the Score Card", async ({
    page,
  }) => {
    await open(page, "view=full");
    await expect(page.locator(".vcv-card")).toHaveCount(9);
    await expect(page.locator(".vcv-connector")).toHaveCount(8);

    const last = await page.evaluate(() => {
      const rect = (element: Element | null | undefined) => {
        if (!element) throw new Error("missing element");
        const { left, top, right, bottom } = element.getBoundingClientRect();
        return { left, top, right, bottom };
      };
      const connector = Array.from(
        document.querySelectorAll(".vcv-connector"),
      ).at(-1);
      const cards = document.querySelectorAll(".vcv-card");
      return {
        kind: connector?.getAttribute("data-kind"),
        head: rect(connector?.querySelector(".vcv-connector__head")),
        from: rect(cards[7]),
        score: rect(cards[8]),
      };
    });
    expect(last.kind).toBe("down");
    expect(Math.abs(last.head.bottom - last.score.top)).toBeLessThanOrEqual(
      0.75,
    );
    // Straight down from the middle of the last process card.
    const tipX = (last.head.left + last.head.right) / 2;
    expect(tipX).toBeCloseTo((last.from.left + last.from.right) / 2, 0);
    expect(tipX).toBeGreaterThan(last.score.left);
    expect(tipX).toBeLessThan(last.score.right);
  });

  test("shows the last process's transfer points on that arrow", async ({
    page,
  }) => {
    await open(page, "view=full");
    const triggers = page.locator(".vcv-transfer");
    await expect(triggers).toHaveCount(8);
    const trigger = triggers.last();
    await expect(trigger).toHaveAttribute(
      "aria-label",
      "Transfer points from BU5 · P3 to Score Card",
    );
    await trigger.hover();
    const panel = trigger.locator(".vcv-popover__panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator(".vcv-popover__title")).toHaveText(
      "BU5 · P3 → Score Card",
    );
    await expect(panel.locator(".vcv-sphere")).toHaveCount(4);
  });
});
