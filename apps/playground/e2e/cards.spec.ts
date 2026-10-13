import { expect, test, type Page } from "@playwright/test";

// The 8 processes of fixtures/bobos-big-block.json, for August 2026.
const PROCESSES = [
  { slug: "bu1-p2", eyebrow: "BU1 · P2", title: "Product Development" },
  { slug: "bu2-p3", eyebrow: "BU2 · P3", title: "Placement & Allocation" },
  { slug: "bu3-p1", eyebrow: "BU3 · P1", title: "Client Onboarding" },
  { slug: "bu3-p2", eyebrow: "BU3 · P2", title: "Relationship Management" },
  { slug: "bu4-p1", eyebrow: "BU4 · P1", title: "Creation & Redemption" },
  { slug: "bu4-p2", eyebrow: "BU4 · P2", title: "Market Making & Liquidity" },
  { slug: "bu5-p1", eyebrow: "BU5 · P1", title: "Fund Administration" },
  { slug: "bu5-p3", eyebrow: "BU5 · P3", title: "Compliance & Regulatory" },
];

async function openCards(page: Page): Promise<void> {
  await page.goto("/?view=cards");
  await expect(page.locator(".vcv-card").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test("shows a card for each of the 8 processes, in chain order", async ({
  page,
}) => {
  await openCards(page);
  const cards = page.locator(".vcv-card");
  await expect(cards).toHaveCount(PROCESSES.length);
  await expect(cards.locator(".vcv-card__eyebrow")).toHaveText(
    PROCESSES.map((process) => process.eyebrow),
  );
  await expect(cards.locator(".vcv-card__title")).toHaveText(
    PROCESSES.map((process) => process.title),
  );
});

for (const [index, process] of PROCESSES.entries()) {
  test(`card screenshot: ${process.eyebrow} ${process.title}`, async ({
    page,
  }) => {
    await openCards(page);
    const card = page.locator(".vcv-card").nth(index);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveScreenshot(
      `card-${index + 1}-${process.slug}.png`,
    );
  });
}

test("fills the first card from the fixture's August figures", async ({
  page,
}) => {
  await openCards(page);
  const card = page.locator(".vcv-card").first();
  await expect(card.locator(".vcv-card__pill")).toHaveText("3 of 5 on target");
  await expect(card.locator(".vcv-kpi-row__label")).toHaveText([
    "Primary KPI",
    "Satellite KPIs",
  ]);
  const primary = card.locator(".vcv-kpi--primary");
  await expect(primary.locator(".vcv-kpi__percent")).toHaveText("100%");
  await expect(primary.locator(".vcv-kpi__value")).toHaveText("10 / 10");
  await expect(card.locator(".vcv-kpi--satellite")).toHaveCount(4);
});

test("sizes the spheres by row and keeps every KPI inside its card", async ({
  page,
}) => {
  await openCards(page);
  const cards = await page.locator(".vcv-card").evaluateAll((elements) =>
    elements.map((card) => {
      const box = card.getBoundingClientRect();
      const widths = (selector: string) =>
        Array.from(
          card.querySelectorAll(selector),
          (sphere) => sphere.getBoundingClientRect().width,
        );
      return {
        primary: widths(".vcv-kpi--primary .vcv-sphere"),
        satellite: widths(".vcv-kpi--satellite .vcv-sphere"),
        inside: Array.from(card.querySelectorAll(".vcv-kpi")).every((kpi) => {
          const rect = kpi.getBoundingClientRect();
          return (
            rect.left >= box.left &&
            rect.right <= box.right &&
            rect.bottom <= box.bottom
          );
        }),
      };
    }),
  );
  for (const card of cards) {
    expect(new Set(card.primary)).toEqual(new Set([132]));
    expect(new Set(card.satellite)).toEqual(new Set([72]));
    expect(card.inside).toBe(true);
  }
});

test("lets the cards in a row share one height", async ({ page }) => {
  await openCards(page);
  const heights = await page
    .locator(".vcv-card")
    .evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().height)),
    );
  expect(heights.slice(0, 3)).toEqual(Array(3).fill(heights[0]));
  expect(heights.slice(3, 6)).toEqual(Array(3).fill(heights[3]));
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(608);
});
