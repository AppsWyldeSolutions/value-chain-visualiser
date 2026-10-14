import { expect, test, type Page } from "@playwright/test";

// How far an arrow may be from an edge and still count as on it, in CSS px.
const TOLERANCE = 0.75;

const LAYOUTS = [
  {
    width: 1440,
    columns: 3,
    kinds: ["across", "across", "turn", "across", "across", "turn", "across"],
  },
  {
    width: 900,
    columns: 2,
    kinds: ["across", "turn", "across", "turn", "across", "turn", "across"],
  },
  {
    width: 480,
    columns: 1,
    kinds: ["down", "down", "down", "down", "down", "down", "down"],
  },
];

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Measured {
  columns: number;
  pageOverflow: number;
  cards: Rect[];
  connectors: { kind: string | null; line: Rect; head: Rect }[];
}

async function openChain(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/?view=chain");
  await expect(page.locator(".vcv-card").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".vcv-connector")).toHaveCount(7);
}

function measure(page: Page): Promise<Measured> {
  return page.evaluate(() => {
    const rect = (element: Element) => {
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    const part = (connector: Element, selector: string) => {
      const element = connector.querySelector(selector);
      if (!element) throw new Error(`connector has no ${selector}`);
      return rect(element);
    };
    const cards = Array.from(document.querySelectorAll(".vcv-card"), rect);
    return {
      columns: new Set(cards.map((card) => Math.round(card.left))).size,
      pageOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      cards,
      connectors: Array.from(
        document.querySelectorAll(".vcv-connector"),
        (connector) => ({
          kind: connector.getAttribute("data-kind"),
          line: part(connector, ".vcv-connector__line"),
          head: part(connector, ".vcv-connector__head"),
        }),
      ),
    };
  });
}

// Connector i runs from card i to card i + 1.
function expectArrowsOnEdges({ cards, connectors }: Measured): void {
  expect(connectors).toHaveLength(cards.length - 1);
  connectors.forEach(({ kind, line, head }, i) => {
    const from = cards[i];
    const to = cards[i + 1];
    if (!from || !to) throw new Error(`no cards for connector ${i}`);
    const where = `connector ${i} (${kind})`;

    if (kind === "across") {
      // Tip on the next card's left edge, within that card's height.
      expect(Math.abs(head.right - to.left), where).toBeLessThanOrEqual(
        TOLERANCE,
      );
      const tipY = (head.top + head.bottom) / 2;
      expect(tipY, where).toBeGreaterThan(to.top);
      expect(tipY, where).toBeLessThan(to.bottom);
      // Leaves from the previous card's right edge, within its height.
      expect(line.left - from.right, where).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(line.left - from.right, where).toBeLessThanOrEqual(4);
      expect(tipY, where).toBeGreaterThan(from.top);
      expect(tipY, where).toBeLessThan(from.bottom);
    } else {
      // Tip on the next card's top edge, within that card's width.
      expect(Math.abs(head.bottom - to.top), where).toBeLessThanOrEqual(
        TOLERANCE,
      );
      const tipX = (head.left + head.right) / 2;
      expect(tipX, where).toBeGreaterThan(to.left);
      expect(tipX, where).toBeLessThan(to.right);
      // Leaves from the previous card's bottom edge, at its centre.
      expect(line.top - from.bottom, where).toBeGreaterThanOrEqual(-TOLERANCE);
      expect(line.top - from.bottom, where).toBeLessThanOrEqual(4);
      const startX = kind === "down" ? tipX : (from.left + from.right) / 2;
      expect(startX, where).toBeGreaterThan(from.left);
      expect(startX, where).toBeLessThan(from.right);
    }
  });
}

for (const layout of LAYOUTS) {
  test.describe(`${layout.width}px wide`, () => {
    test("matches the screenshot", async ({ page }) => {
      await openChain(page, layout.width);
      await expect(page).toHaveScreenshot(`chain-${layout.width}.png`, {
        fullPage: true,
      });
    });

    test(`lays the cards out in ${layout.columns} column(s) without overflowing`, async ({
      page,
    }) => {
      await openChain(page, layout.width);
      const measured = await measure(page);
      expect(measured.cards).toHaveLength(8);
      expect(measured.columns).toBe(layout.columns);
      expect(measured.pageOverflow).toBe(0);
    });

    test("ends every arrow on a card edge", async ({ page }) => {
      await openChain(page, layout.width);
      const measured = await measure(page);
      expect(measured.connectors.map((connector) => connector.kind)).toEqual(
        layout.kinds,
      );
      expectArrowsOnEdges(measured);
    });
  });
}

test("re-measures the arrows when the container is resized", async ({
  page,
}) => {
  await openChain(page, 1440);
  for (const layout of [LAYOUTS[2], LAYOUTS[1], LAYOUTS[0]]) {
    if (!layout) throw new Error("missing layout");
    await page.setViewportSize({ width: layout.width, height: 900 });
    await expect
      .poll(async () =>
        (await measure(page)).connectors.map((connector) => connector.kind),
      )
      .toEqual(layout.kinds);
    expectArrowsOnEdges(await measure(page));
  }
});

test("re-measures the arrows when a card is added or removed", async ({
  page,
}) => {
  await openChain(page, 1440);
  await page.evaluate(() => document.querySelector(".vcv-card")?.remove());
  await expect(page.locator(".vcv-connector")).toHaveCount(6);
  expectArrowsOnEdges(await measure(page));
});

test("animates the flow, and stops it under reduced motion", async ({
  page,
}) => {
  const animation = () =>
    page
      .locator(".vcv-connector__line")
      .first()
      .evaluate((line) => getComputedStyle(line).animationName);

  await openChain(page, 1440);
  expect(await animation()).toBe("vcv-flow");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await animation()).toBe("none");
});
