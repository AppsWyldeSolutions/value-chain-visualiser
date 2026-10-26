# Shaping KPI data for the Tableau extension

The Value Chain Visualiser for Tableau draws the dashboard's first worksheet.
That worksheet must have **one mark per KPI per period**, with a field named
after each of the visual's fields: the same table the Power BI visual takes
(see [powerbi-data-shaping.md](powerbi-data-shaping.md)). The KPI API
returns **one record per KPI with a column per month** instead. This page
shows how to get from either to the worksheet.

## The convention

| Field       | Required | What it holds                                              |
| ----------- | -------- | ---------------------------------------------------------- |
| `node`      | yes      | the process or link the KPI belongs to (the API's `link`)  |
| `nodeOrder` | no       | the card's position, 0 first                               |
| `group`     | yes      | `Primary`, `Satellite` or `Transfer Points`                |
| `subGroup`  | no       | the KPI's sub-group, if it has one                         |
| `metric`    | yes      | the KPI's name                                             |
| `operator`  | no       | `Equal` (on target when actual ≥ budget) or `LessThan` (≤) |
| `valueType` | no       | `Number`, `Percentage`, … (the API's `metricValueType`)    |
| `symbol`    | no       | the unit symbol, such as `%` (the API's `kpiSymbol`)       |
| `year`      | yes      | the year, a whole number                                   |
| `period`    | yes      | the month, as the visual shows it: `January` … `December`  |
| `actual`    | yes      | the period's actual; blank (null) is no data               |
| `budget`    | yes      | the period's budget; blank (null) is no data               |

- **Names are exact**, case and all: `subGroup`, not `Sub Group` or
  `subgroup`. The extension reads Tableau's summary data, which names a
  measure after its aggregation, so `SUM(actual)` or `AVG(budget)` also
  match. Anything else on the worksheet is ignored.
- **Missing fields:** until every required field is on the worksheet the
  extension draws nothing and says which to add, for example
  `"KPIs" needs fields named metric and budget.` Optional fields left out
  read as their defaults: `operator` `Equal`, `valueType` `Number`,
  `nodeOrder` 0, `subGroup` and `symbol` blank.
- **One mark per KPI per period.** Put every field except `actual` and
  `budget` on **Detail** as a dimension, and `actual` and `budget` on
  Detail as `SUM`. Each KPI has one value per period, so the sum is the
  value itself.
- **`year` and `nodeOrder` must be dimensions.** Tableau makes number
  columns measures; as measures they would be summed across the KPIs.
  Right-click each in the Data pane → **Convert to Dimension**.
- **Card order.** Cards are ordered by `nodeOrder`. Without it every card
  is 0, and the cards keep the order Tableau returns the marks in, which
  follows the worksheet's sort.

## From the shaped table

The Power BI sample's query (`samples/powerbi/shape-kpis.pq`) already makes
this table, and
[`samples/powerbi/shaped-table.tsv`](../samples/powerbi/shaped-table.tsv) is
its result for `fixtures/bobos-big-block.json`. Any source shaped the same
way (a database view, a Tableau Prep flow, a Power Query export) works:

1. **Connect → To a File → Text file**, and choose the file.
2. In the Data pane, convert `year` and `nodeOrder` to dimensions.
3. On a new worksheet, drag `node`, `nodeOrder`, `group`, `subGroup`,
   `metric`, `operator`, `valueType`, `symbol`, `year` and `period` to
   **Detail**, then `actual` and `budget` (as `SUM`).
4. Add the worksheet to a dashboard, then the extension (see
   [packages/tableau-extension/README.md](../packages/tableau-extension/README.md#develop-in-tableau-desktop)).

Filters on `year` and `period` choose what the visual shows. With several
periods let through, it opens on the latest period with actuals; its header
controls pick another.

## From the API's records

The API's records have a column per month: `january` … `december` for
actuals and `januaryBudget` … `decemberBudget` for budgets, beside `link`,
`group`, `subGroup`, `metric`, `kpiOperator`, `metricValueType`,
`kpiSymbol` and `year`. In Tableau Desktop:

1. **Pivot the 24 month columns.** On the Data Source page, select the
   twelve month columns and the twelve `…Budget` columns, right-click →
   **Pivot**. Each record becomes 24 rows, with the column's name in
   **Pivot Field Names** and its value in **Pivot Field Values**.
2. **Rename the fields** whose names differ (right-click → **Rename**):
   `link` → `node`, `kpiOperator` → `operator`, `metricValueType` →
   `valueType`, `kpiSymbol` → `symbol`.
3. **Add calculated fields** for the period and the two figures. A month's
   actual and budget come from two pivoted rows; on the worksheet, `SUM`
   adds each one to the null of the other, giving one mark per period.

   `period`:

   ```
   PROPER(REPLACE([Pivot Field Names], "Budget", ""))
   ```

   `actual`:

   ```
   IF NOT ENDSWITH([Pivot Field Names], "Budget") THEN [Pivot Field Values] END
   ```

   `budget`:

   ```
   IF ENDSWITH([Pivot Field Names], "Budget") THEN [Pivot Field Values] END
   ```

   If Tableau reads the month columns as text (thousands separators such as
   `604,000` make it), wrap the value:
   `FLOAT(REPLACE([Pivot Field Values], ",", ""))`.

4. Optionally, `nodeOrder`: a calculated field giving each node's position,
   for example `CASE [node] WHEN "BU1 - P2: Product Development" THEN 0 WHEN
… END`, converted to a dimension. Without it, sort `node` on the
   worksheet into the order the cards should take.
5. Build the worksheet as in [From the shaped table](#from-the-shaped-table),
   steps 2–4.

## Checking the result

The extension's tests read the fixture shaped this way and expect exactly
the rows the web component reads from the API's records
(`packages/tableau-extension/src/rows.test.ts`). In Tableau, **Worksheet →
View Data** on the worksheet shows its summary data: one row per KPI per
period, with the column names above.
