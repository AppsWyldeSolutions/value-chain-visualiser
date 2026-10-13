import { expect, test, type Page } from "@playwright/test";

async function openShell(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator(".vcv-root")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function bubbleAnimations(page: Page): Promise<string[]> {
  return page
    .locator(".vcv-ocean__bubble")
    .evaluateAll((bubbles) =>
      bubbles.map((bubble) => getComputedStyle(bubble).animationName),
    );
}

test.describe("empty shell, light mode", () => {
  test.use({ colorScheme: "light" });

  test("matches the screenshot", async ({ page }) => {
    await openShell(page);
    await expect(page).toHaveScreenshot("shell-light.png");
  });

  test("animates the bubbles", async ({ page }) => {
    await openShell(page);
    const animations = await bubbleAnimations(page);
    expect(animations.length).toBeGreaterThan(0);
    expect(new Set(animations)).toEqual(new Set(["vcv-rise"]));
  });

  test("renders with the bundled fonts and makes no external requests", async ({
    page,
    baseURL,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("data:") && !url.startsWith(baseURL ?? "")) {
        external.push(url);
      }
    });
    await openShell(page);

    const loaded = await page.evaluate(() =>
      Array.from(document.fonts)
        .filter((face) => face.status === "loaded")
        .map((face) => `${face.family.replace(/['"]/g, "")} ${face.weight}`)
        .sort(),
    );
    // The shell uses DM Sans 400 (subtitle), DM Sans 700 (eyebrow) and
    // Bricolage Grotesque 700 (title). DM Sans 500 loads once controls exist.
    expect(loaded).toEqual([
      "Bricolage Grotesque 700",
      "DM Sans 400",
      "DM Sans 700",
    ]);
    expect(external).toEqual([]);
  });
});

test.describe("empty shell, reduced motion", () => {
  test.use({ colorScheme: "light", reducedMotion: "reduce" });

  test("matches the screenshot", async ({ page }) => {
    await openShell(page);
    await expect(page).toHaveScreenshot("shell-reduced-motion.png");
  });

  test("stops the bubble animation", async ({ page }) => {
    await openShell(page);
    const animations = await bubbleAnimations(page);
    expect(animations.length).toBeGreaterThan(0);
    expect(new Set(animations)).toEqual(new Set(["none"]));
  });
});
