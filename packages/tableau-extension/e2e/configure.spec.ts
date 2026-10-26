import { expect, test } from "@playwright/test";
import {
  lines,
  open,
  recorded,
  rowCount,
  tableOf,
  visual,
  type Table,
} from "./fakeTableau";

// The v2 field mapping (#62), in the browser: the extension with a saved
// mapping, opening its Configure dialog, and the dialog page (config.html)
// itself. Tableau's library is the fake (fakeTableau.ts).

/** The shaped table, with three fields under the author's own names. */
const RENAMED: Record<string, string> = {
  node: "Process",
  metric: "KPI Name",
  "SUM(actual)": "SUM(Actual $)",
};
function ownNames(): Table {
  const table = tableOf(lines);
  return {
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      fieldName: RENAMED[column.fieldName] ?? column.fieldName,
    })),
  };
}

const MAPPING = {
  version: 1,
  worksheet: "KPIs",
  fields: { node: "Process", metric: "KPI Name", actual: "SUM(Actual $)" },
};

test("draws a worksheet with its own field names, once mapped", async ({
  page,
}) => {
  const errors = await open(page, ownNames(), {
    settings: { "vcv.mapping": JSON.stringify(MAPPING) },
  });
  await expect(visual(page).locator("svg").first()).toBeVisible();
  expect(await rowCount(page)).toBe(lines.length);
  await expect(page.locator("#status")).toBeHidden();
  expect(errors).toEqual([]);
});

test("opens the Configure dialog for an author whose worksheet lacks the names", async ({
  page,
}) => {
  const errors = await open(page, ownNames(), { mode: "authoring" });
  await expect(page.locator("#status")).toHaveText(
    '"KPIs" needs fields named node, metric and actual.',
  );
  await expect.poll(async () => (await recorded(page)).dialogs).toHaveLength(1);
  const [dialog] = (await recorded(page)).dialogs;
  expect(new URL(dialog!.url).pathname).toMatch(/\/config\.html$/);
  expect(errors).toEqual([]);
});

test("does not open it for a viewer", async ({ page }) => {
  await open(page, ownNames(), { mode: "viewing" });
  await expect(page.locator("#status")).toContainText("needs fields named");
  expect((await recorded(page)).dialogs).toEqual([]);
});

test("the Configure dialog saves the mapping and closes", async ({ page }) => {
  const errors = await open(page, ownNames(), {}, "config.html");
  const save = page.getByRole("button", { name: "Save" });
  await expect(page.locator('select[name="worksheet"]')).toHaveValue("KPIs");
  // The convention's names are filled in; the renamed fields are not.
  await expect(page.locator('select[name="group"]')).toHaveValue("group");
  await expect(page.locator('select[name="node"]')).toHaveValue("");
  await expect(save).toBeDisabled();
  await page.locator('select[name="node"]').selectOption("Process");
  await page.locator('select[name="metric"]').selectOption("KPI Name");
  await page.locator('select[name="actual"]').selectOption("SUM(Actual $)");
  await expect(save).toBeEnabled();
  await save.click();
  await expect
    .poll(async () => (await recorded(page)).closed)
    .toEqual(["saved"]);
  const { settings, saves } = await recorded(page);
  expect(saves).toBe(1);
  expect(JSON.parse(settings["vcv.mapping"]!)).toMatchObject(MAPPING);
  expect(errors).toEqual([]);
});

test("the Configure dialog closes without saving on Cancel", async ({
  page,
}) => {
  await open(page, ownNames(), {}, "config.html");
  await page.getByRole("button", { name: "Cancel" }).click();
  const { closed, saves } = await recorded(page);
  expect(closed).toEqual(["cancelled"]);
  expect(saves).toBe(0);
});
