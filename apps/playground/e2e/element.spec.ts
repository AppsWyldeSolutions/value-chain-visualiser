import { expect, test, type Page } from "@playwright/test";

interface Selected {
  node: string;
  group: string;
  subGroup: string;
  metric: string;
  period: string;
  label: string;
  met: boolean;
  hasData: boolean;
}

// The playground serves fixtures/ as static files, so data-src is a real URL.
async function openElement(page: Page, src: string): Promise<string[]> {
  const requested: string[] = [];
  page.on("request", (request) =>
    requested.push(new URL(request.url()).pathname),
  );
  await page.goto(`/?view=element&src=${src}`);
  await expect(page.locator("value-chain-visualiser .vcv-card")).toHaveCount(9);
  await page.evaluate(() => document.fonts.ready);
  return requested;
}

/** Starts recording vcv-select events where the page would hear them. */
async function recordSelections(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = window as unknown as { selected: unknown[] };
    store.selected = [];
    document.addEventListener("vcv-select", (event) =>
      store.selected.push((event as CustomEvent).detail),
    );
  });
}

function selections(page: Page): Promise<Selected[]> {
  return page.evaluate(
    () => (window as unknown as { selected: Selected[] }).selected,
  );
}

for (const fixture of ["bobos-big-block.json", "main-dc-prototype.json"]) {
  test(`loads ${fixture} through data-src`, async ({ page }) => {
    const requested = await openElement(page, fixture);
    expect(requested).toContain(`/${fixture}`);
    const host = page.locator("value-chain-visualiser");
    await expect(host).toHaveAttribute("data-src", `/${fixture}`);
    await expect(host.locator(".vcv-header__subtitle")).toHaveText(
      "August 2026 · 53 KPIs measured against budget",
    );
    await expect(host.locator(".vcv-card--score")).toHaveCount(1);
    await expect(host.locator(".vcv-connector")).toHaveCount(8);
    // Rendered inside the element's shadow root, not into the page.
    expect(
      await page.evaluate(() => document.querySelectorAll(".vcv-card").length),
    ).toBe(0);
  });
}

test("matches the screenshot", async ({ page }) => {
  await openElement(page, "bobos-big-block.json");
  await expect(page).toHaveScreenshot("element-1440.png");
});

test("fires vcv-select on sphere click", async ({ page }) => {
  await openElement(page, "bobos-big-block.json");
  await recordSelections(page);
  const host = page.locator("value-chain-visualiser");

  // A primary KPI on the first card.
  await host.locator(".vcv-kpi--primary .vcv-sphere").first().click();
  // A satellite KPI that missed its target.
  await host.locator(".vcv-kpi--satellite .vcv-sphere").nth(1).click();
  // A panel KPI on the Score Card.
  const score = host.locator(".vcv-card--score");
  await score.scrollIntoViewIfNeeded();
  await score.locator(".vcv-kpi--panel .vcv-sphere").first().click();

  expect(await selections(page)).toMatchObject([
    {
      node: "BU1 - P2: Product Development",
      group: "Primary",
      metric: "Product Launch Milestones Delivered > RF Plan",
      period: "August",
      label: "100%",
      met: true,
      hasData: true,
    },
    {
      node: "BU1 - P2: Product Development",
      group: "Satellite",
      metric: "New Funds Launched > RF Plan",
      label: "0%",
      met: false,
    },
    {
      node: "Score Card",
      group: "Satellite",
      subGroup: "Financial Scorecard",
      metric: "Management Fee Revenue > RF Plan ($M)",
      met: false,
    },
  ]);
});

test("fires vcv-select for a transfer point clicked in its popover", async ({
  page,
}) => {
  await openElement(page, "bobos-big-block.json");
  await recordSelections(page);
  const trigger = page.locator("value-chain-visualiser .vcv-transfer").first();
  await trigger.hover();
  await trigger.locator(".vcv-popover .vcv-sphere").nth(1).click();
  expect(await selections(page)).toMatchObject([
    {
      node: "BU1 - P2: Product Development",
      group: "Transfer Points",
      subGroup: "Unit Rate",
      metric: "< Budget Cost per Fund Launch ($k)",
    },
  ]);
});

test("fires no vcv-select for clicks away from the spheres", async ({
  page,
}) => {
  await openElement(page, "bobos-big-block.json");
  await recordSelections(page);
  const host = page.locator("value-chain-visualiser");
  await host.locator(".vcv-kpi__label").first().click();
  await host.locator(".vcv-card__title").first().click();
  expect(await selections(page)).toEqual([]);
});

test("shows a pointer over the spheres it reports", async ({ page }) => {
  await openElement(page, "bobos-big-block.json");
  const cursor = await page
    .locator("value-chain-visualiser .vcv-sphere")
    .first()
    .evaluate((sphere) => getComputedStyle(sphere).cursor);
  expect(cursor).toBe("pointer");
});
