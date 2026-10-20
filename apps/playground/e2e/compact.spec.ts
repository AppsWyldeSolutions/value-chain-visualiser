import { expect, test, type Page } from "@playwright/test";

// The compact display, the default: one bar per link in a single row that
// scales with the visual, each opening its full card in a popup.

async function open(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/?view=visual");
  await expect(page.locator(".vcv-grid .vcv-bar")).toHaveCount(9);
  // The arrows are drawn once the bars have their size.
  await expect(page.locator(".vcv-connector")).toHaveCount(8);
}

const bars = (page: Page) => page.locator(".vcv-grid .vcv-bar");
const detail = (page: Page) => page.locator(".vcv-detail:not([hidden])");

test("draws one bar per link, all in one row", async ({ page }) => {
  await open(page);
  const tops = await bars(page).evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top)),
  );
  expect(new Set(tops).size).toBe(1);
  await expect(bars(page).last()).toHaveClass(/vcv-bar--score/);
  await expect(page.locator(".vcv-connector--across")).toHaveCount(8);
  await expect(page).toHaveScreenshot("compact-1440.png", { fullPage: true });
});

test("scales down with the visual instead of wrapping or overflowing", async ({
  page,
}) => {
  await open(page);
  const sphere = page.locator(".vcv-bar__primary .vcv-sphere").first();
  const wide = (await sphere.boundingBox())!.width;

  await open(page, 640);
  const tops = await bars(page).evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top)),
  );
  expect(new Set(tops).size).toBe(1);
  expect((await sphere.boundingBox())!.width).toBeLessThan(wide);
  const overflow = await page.evaluate(() => {
    const grid = document.querySelector(".vcv-grid")!.getBoundingClientRect();
    const right = Math.max(
      ...Array.from(document.querySelectorAll(".vcv-grid .vcv-bar")).map(
        (bar) => bar.getBoundingClientRect().right,
      ),
    );
    return {
      page:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      bars: right - grid.right,
    };
  });
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.bars).toBeLessThanOrEqual(1);
  await expect(page).toHaveScreenshot("compact-640.png", { fullPage: true });
});

test("joins the bars at their primary spheres", async ({ page }) => {
  await open(page);
  const offset = await page.evaluate(() => {
    const sphere = document
      .querySelector(".vcv-bar__primary .vcv-sphere")!
      .getBoundingClientRect();
    const line = document
      .querySelector(".vcv-connector__line")!
      .getBoundingClientRect();
    return Math.abs(
      line.top + line.height / 2 - (sphere.top + sphere.height / 2),
    );
  });
  expect(offset).toBeLessThan(3);
});

test("shows a sphere's name and figures on hover", async ({ page }) => {
  await open(page);
  const sphere = page.locator(".vcv-bar__primary .vcv-sphere").first();
  await sphere.hover();
  const tip = page.locator(".vcv-tip");
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(
    "Product Launch Milestones Delivered > RF Plan — 10 / 10 (100%)",
  );
  await page.mouse.move(5, 5);
  await expect(tip).toBeHidden();
});

test("a bar opens its full card below it, inside the visual", async ({
  page,
}) => {
  await open(page);
  const bar = bars(page).nth(1);
  await bar.click();
  await expect(detail(page)).toBeVisible();
  await expect(detail(page).locator(".vcv-card__title")).toHaveText(
    "Placement & Allocation",
  );
  await expect(bar).toHaveAttribute("aria-expanded", "true");
  await expect(detail(page)).toHaveAttribute("data-placement", "below");
  const [barBox, popupBox, rootBox] = await Promise.all([
    bar.boundingBox(),
    detail(page).boundingBox(),
    page.locator(".vcv-root").boundingBox(),
  ]);
  expect(popupBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height);
  expect(popupBox!.x).toBeGreaterThanOrEqual(rootBox!.x);
  expect(popupBox!.x + popupBox!.width).toBeLessThanOrEqual(
    rootBox!.x + rootBox!.width,
  );
  await expect(page).toHaveScreenshot("compact-detail.png");

  await bar.click();
  await expect(detail(page)).toHaveCount(0);
});

test("flips the popup above its bar when there is no room below", async ({
  page,
}) => {
  await open(page);
  // Push the bars down to the visual's bottom edge: no room below them.
  await page.addStyleTag({ content: ".vcv-header { min-height: 640px; }" });
  await page.waitForTimeout(100);
  await bars(page).first().click();
  await expect(detail(page)).toBeVisible();
  await expect(detail(page)).toHaveAttribute("data-placement", "above");
  const [barBox, popupBox] = await Promise.all([
    bars(page).first().boundingBox(),
    detail(page).boundingBox(),
  ]);
  expect(popupBox!.y + popupBox!.height).toBeLessThanOrEqual(barBox!.y);
});

test("keeps the popup inside the visual at the far right", async ({ page }) => {
  await open(page);
  await bars(page).last().click();
  const [popupBox, rootBox] = await Promise.all([
    detail(page).boundingBox(),
    page.locator(".vcv-root").boundingBox(),
  ]);
  expect(popupBox!.x + popupBox!.width).toBeLessThanOrEqual(
    rootBox!.x + rootBox!.width,
  );
  await expect(detail(page).locator(".vcv-card--score")).toBeVisible();
});

test("closes the popup on its button, a click elsewhere or Escape", async ({
  page,
}) => {
  await open(page);
  await bars(page).first().click();
  await detail(page).locator(".vcv-detail__close").click();
  await expect(detail(page)).toHaveCount(0);

  await bars(page).first().click();
  await page.mouse.click(5, 5);
  await expect(detail(page)).toHaveCount(0);

  await bars(page).first().click();
  await page.keyboard.press("Escape");
  await expect(detail(page)).toHaveCount(0);
});

test("opens and closes from the keyboard, giving focus back", async ({
  page,
}) => {
  await open(page);
  const bar = bars(page).nth(2);
  await bar.focus();
  await page.keyboard.press("Enter");
  await expect(detail(page)).toBeVisible();
  await expect(detail(page).locator(".vcv-detail__close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(detail(page)).toHaveCount(0);
  await expect(bar).toBeFocused();
  await page.keyboard.press(" ");
  await expect(detail(page)).toBeVisible();
});

test("an arrow previews its transfer points on hover and pins them on click", async ({
  page,
}) => {
  await open(page);
  const trigger = page.locator(".vcv-transfer").first();
  const popover = trigger.locator(".vcv-popover");
  await trigger.hover();
  await expect(popover).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(popover).toBeHidden();

  await trigger.click();
  await page.mouse.move(5, 5);
  await expect(popover).toBeVisible();
  await trigger.click();
  await expect(popover).toBeHidden();
});

test("only one popup is open at a time", async ({ page }) => {
  await open(page);
  const trigger = page.locator(".vcv-transfer").first();
  const popover = trigger.locator(".vcv-popover");

  await trigger.click();
  await expect(popover).toBeVisible();
  await bars(page).nth(3).click();
  await expect(detail(page)).toBeVisible();
  await expect(popover).toBeHidden();

  await trigger.click();
  await expect(popover).toBeVisible();
  await expect(detail(page)).toHaveCount(0);
});

test("fades the popup in, except for reduced motion", async ({ page }) => {
  const animation = () =>
    detail(page).evaluate((element) => getComputedStyle(element).animationName);
  await open(page);
  await bars(page).first().click();
  expect(await animation()).toBe("vcv-fade-in");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await bars(page).first().click();
  expect(await animation()).toBe("none");
});

test("the web component draws compact bars by default too", async ({
  page,
}) => {
  await page.goto("/?view=element");
  const host = page.locator("value-chain-visualiser");
  await expect(host.locator(".vcv-grid .vcv-bar")).toHaveCount(9);
  await host.locator(".vcv-bar").first().click();
  await expect(host.locator(".vcv-detail:not([hidden])")).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(host.locator(".vcv-detail:not([hidden])")).toHaveCount(0);
});

test("the header's View switch changes the display, both ways", async ({
  page,
}) => {
  await open(page);
  const view = page.getByRole("radiogroup", { name: "View" });
  await expect(view.getByRole("radio", { name: "Compact" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await view.getByRole("radio", { name: "Full card" }).click();
  await expect(page.locator(".vcv-grid > .vcv-card")).toHaveCount(9);
  await expect(bars(page)).toHaveCount(0);

  // From the keyboard: the arrow keys move between the two options.
  await view.getByRole("radio", { name: "Full card" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(bars(page)).toHaveCount(9);
  await expect(view.getByRole("radio", { name: "Compact" })).toBeFocused();
});

test("the web component's cardDisplay property switches and reflects", async ({
  page,
}) => {
  await page.goto("/?view=element");
  const host = page.locator("value-chain-visualiser");
  await expect(host.locator(".vcv-grid .vcv-bar")).toHaveCount(9);
  await host.evaluate((element) => {
    (element as unknown as { cardDisplay: string }).cardDisplay = "full";
  });
  await expect(host.locator(".vcv-grid > .vcv-card")).toHaveCount(9);
  await expect(host).toHaveAttribute("data-card-display", "full");
  await expect(host.getByRole("radio", { name: "Full card" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
