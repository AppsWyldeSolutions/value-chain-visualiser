import { expect, test } from "@playwright/test";

// <ValueChainVisualiser> from vcv-react, mounted with React in the playground.
test("the React wrapper draws the chain and calls onSelect on a sphere click", async ({
  page,
}) => {
  await page.goto("/?view=react&display=full");
  const host = page.locator("value-chain-visualiser");
  await expect(host.locator(".vcv-card")).toHaveCount(9);
  await expect(host).toHaveAttribute("data-period", "July");
  await expect(host.locator(".vcv-header__subtitle")).toHaveText(
    /^July 2026 · /,
  );

  await host.locator(".vcv-kpi--primary .vcv-sphere").first().click();
  await expect(page.getByTestId("selected")).toHaveText(
    "BU1 - P2: Product Development › Product Launch Milestones Delivered > RF Plan",
  );
});
