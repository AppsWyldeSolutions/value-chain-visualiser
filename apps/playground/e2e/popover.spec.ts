import { expect, test, type Locator, type Page } from "@playwright/test";

// The chain view has 8 process cards, so 7 arrows, each with transfer points.
const ARROWS = 7;
const WIDTHS = [1440, 900, 480];

async function openChain(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/?view=chain");
  await expect(page.locator(".vcv-card").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".vcv-transfer")).toHaveCount(ARROWS);
}

async function expectInsideViewport(popover: Locator): Promise<void> {
  const { box, viewport } = await popover.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      box: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
    };
  });
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.top).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(viewport.width);
  expect(box.bottom).toBeLessThanOrEqual(viewport.height);
}

for (const width of WIDTHS) {
  test(`${width}px: hovering each arrow shows its four transfer points, inside the viewport, until Escape`, async ({
    page,
  }) => {
    await openChain(page, width);
    const triggers = page.locator(".vcv-transfer");
    const open = page.locator(".vcv-popover:visible");
    await expect(open).toHaveCount(0);

    for (let i = 0; i < ARROWS; i++) {
      const trigger = triggers.nth(i);
      const panel = trigger.locator(".vcv-popover__panel");

      await trigger.hover();
      await expect(panel).toBeVisible();
      await expect(open).toHaveCount(1);
      await expect(panel.locator(".vcv-sphere")).toHaveCount(4);
      await expect(panel.locator(".vcv-kpi__tag")).toHaveText([
        "CornerStones",
        "Unit Rate",
        "Contractual Compliance",
        "Labour Management",
      ]);
      await expectInsideViewport(panel);

      await page.keyboard.press("Escape");
      await expect(open).toHaveCount(0);
    }
  });
}

test("stays inside the viewport wherever the arrow is on screen", async ({
  page,
}) => {
  await openChain(page, 1440);
  const trigger = page.locator(".vcv-transfer").nth(2);
  const panel = trigger.locator(".vcv-popover__panel");

  // Put the arrow at the very top, then at the very bottom, of the window.
  for (const block of ["start", "end"] as const) {
    await trigger.evaluate(
      (element, block) => element.scrollIntoView({ block }),
      block,
    );
    await trigger.hover();
    await expect(panel).toBeVisible();
    await expectInsideViewport(panel);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  }
});

test("opens on keyboard focus, in chain order, and Escape closes it", async ({
  page,
}) => {
  await openChain(page, 1440);
  const triggers = page.locator(".vcv-transfer");
  const open = page.locator(".vcv-popover:visible");

  await page.keyboard.press("Tab");
  await expect(triggers.nth(0)).toBeFocused();
  await expect(triggers.nth(0).locator(".vcv-popover")).toBeVisible();
  await expect(open.locator(".vcv-popover__title")).toHaveText(
    "BU1 · P2 → BU2 · P3",
  );
  await expectInsideViewport(open.locator(".vcv-popover__panel"));

  await page.keyboard.press("Escape");
  await expect(open).toHaveCount(0);
  await expect(triggers.nth(0)).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(triggers.nth(1)).toBeFocused();
  await expect(open).toHaveCount(1);
  await expect(open.locator(".vcv-popover__title")).toHaveText(
    "BU2 · P3 → BU3 · P1",
  );

  // Tabbing away closes it.
  await page.keyboard.press("Shift+Tab");
  await expect(triggers.nth(1).locator(".vcv-popover")).toBeHidden();
});

test("stays open while the pointer moves from the arrow onto the popover", async ({
  page,
}) => {
  await openChain(page, 1440);
  const trigger = page.locator(".vcv-transfer").first();
  const panel = trigger.locator(".vcv-popover__panel");

  await trigger.hover();
  await expect(panel).toBeVisible();
  await panel.locator(".vcv-sphere").first().hover();
  await expect(panel).toBeVisible();

  await page.locator(".vcv-header__title").hover();
  await expect(panel).toBeHidden();
});

test("popover screenshot", async ({ page }) => {
  await openChain(page, 1440);
  const trigger = page.locator(".vcv-transfer").first();
  await trigger.hover();
  const panel = trigger.locator(".vcv-popover__panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveScreenshot("popover-bu1-p2.png");
});
