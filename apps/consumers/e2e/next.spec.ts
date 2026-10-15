import { expect, test } from "@playwright/test";
import { expectInstalledAsPublished, SOURCE } from "./installed.js";
import { NEXT_URL } from "./urls.js";

test.describe("Next.js consumer", () => {
  test(`installs the packages from the ${SOURCE}, not workspace source`, () => {
    expectInstalledAsPublished("next", [
      "@appswyldesolutions/vcv-react",
      "@appswyldesolutions/vcv-web-component",
    ]);
  });

  test("server-renders the tag, then renders the Score Card in the browser", async ({
    page,
    request,
  }) => {
    // The server HTML holds the bare element: nothing of the visual yet.
    const html = await (await request.get(NEXT_URL)).text();
    expect(html).toMatch(/<value-chain-visualiser[\s>]/);
    expect(html).not.toContain("vcv-card");

    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat/i.test(message.text())) {
        problems.push(message.text());
      }
    });

    await page.goto(NEXT_URL);
    const host = page.locator("value-chain-visualiser");
    const score = host.locator(".vcv-card--score");
    await expect(score).toHaveCount(1);
    await expect(
      score.locator(".vcv-kpi--panel .vcv-sphere").first(),
    ).toBeVisible();
    await expect(host.locator(".vcv-card")).toHaveCount(9);

    // onSelect reaches the client component through the wrapper.
    await host.locator(".vcv-kpi--primary .vcv-sphere").first().click();
    await expect(page.getByTestId("selected")).toHaveText(
      "BU1 - P2: Product Development › Product Launch Milestones Delivered > RF Plan",
    );
    expect(problems).toEqual([]);
  });
});
