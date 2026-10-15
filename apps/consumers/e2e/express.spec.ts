import { expect, test } from "@playwright/test";
import { expectInstalledAsPublished, SOURCE } from "./installed.js";
import { EXPRESS_URL } from "./urls.js";

test.describe("Express consumer", () => {
  test(`installs the web component from the ${SOURCE}, not workspace source`, () => {
    expectInstalledAsPublished("express", [
      "@appswyldesolutions/vcv-web-component",
    ]);
  });

  test("loads the fixture from /api/kpis and renders the Score Card", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const requested: string[] = [];
    page.on("request", (request) =>
      requested.push(new URL(request.url()).pathname),
    );

    await page.goto(EXPRESS_URL);
    const host = page.locator("value-chain-visualiser");
    const score = host.locator(".vcv-card--score");
    await expect(score).toHaveCount(1);
    await expect(
      score.locator(".vcv-kpi--panel .vcv-sphere").first(),
    ).toBeVisible();
    await expect(host.locator(".vcv-card")).toHaveCount(9);

    expect(requested).toContain("/vcv/vcv.iife.js");
    expect(requested).toContain("/api/kpis");
    expect(errors).toEqual([]);
  });
});
