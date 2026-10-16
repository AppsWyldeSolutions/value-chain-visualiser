# Shaping KPI data for the Power BI visual

The Value Chain Visualiser for Power BI takes **one row per KPI per period**:
a node, its KPI and the period's actual and budget, in the columns its data
roles expect (see [packages/powerbi-visual/README.md](../packages/powerbi-visual/README.md#data)).
The KPI API returns **one record per KPI with a column per month** instead.
This page reshapes the second into the first in Power Query (M).

[`samples/powerbi/value-chain-sample.pbix`](../samples/powerbi/value-chain-sample.pbix)
does exactly this on `fixtures/bobos-big-block.json` and draws the visual
from the result, with Year and Period slicers.

## The source

```json
{
  "records": [
    {
      "id": "metric-1790035200000-1",
      "link": "BU1 - P2: Product Development",
      "group": "Primary",
      "subGroup": "",
      "metric": "Product Launch Milestones Delivered > RF Plan",
      "kpiOperator": "Equal",
      "metricValueType": "Number",
      "kpiSymbol": "",
      "year": "2026",
      "january": "6",
      "february": "6",
      "…": "…",
      "december": "",
      "januaryBudget": "6",
      "februaryBudget": "7",
      "…": "…",
      "decemberBudget": "7"
    }
  ]
}
```

Each record also carries fields the visual does not use (`level`,
`proRata`, `companyId` and so on, and `period`, the period the API was
asked for). The query leaves them out.

## The result

| node                          | nodeOrder | group   | subGroup | metric                                        | operator | valueType | symbol | year | period   | actual | budget |
| ----------------------------- | --------- | ------- | -------- | --------------------------------------------- | -------- | --------- | ------ | ---- | -------- | ------ | ------ |
| BU1 - P2: Product Development | 0         | Primary |          | Product Launch Milestones Delivered > RF Plan | Equal    | Number    |        | 2026 | January  | 6      | 6      |
| BU1 - P2: Product Development | 0         | Primary |          | Product Launch Milestones Delivered > RF Plan | Equal    | Number    |        | 2026 | February | 6      | 7      |

Twelve rows per record (1,020 for the fixture's 85), one per month. A month
with no figure has a blank (null) `actual` or `budget`, which the visual
draws as no data.

## The query

1. In Power BI Desktop, **Home → Transform data** to open Power Query.
2. **Home → Manage Parameters → New parameter**: name `KpiSourceUrl`, type
   Text, current value the API's URL. The sample uses the fixture in this
   repo:
   `https://raw.githubusercontent.com/AppsWyldeSolutions/value-chain-visualiser/main/fixtures/bobos-big-block.json`.
   For a file on disk, change `Web.Contents(KpiSourceUrl)` in the query to
   `File.Contents(KpiSourceUrl)` and give the parameter the file's path.
3. **Home → New source → Blank query**, then **Advanced editor**, and paste
   the query below (it is also in
   [`samples/powerbi/shape-kpis.pq`](../samples/powerbi/shape-kpis.pq)).
   Name the query `Kpis`.
4. **Close & Apply**. The first refresh asks how to connect to the URL:
   **Anonymous** for the public fixture.

```m
let
    // The API's response: { "records": [ { id, link, group, subGroup, metric,
    // kpiOperator, metricValueType, kpiSymbol, year, january … december,
    // januaryBudget … decemberBudget, … } ] }. KpiSourceUrl is a parameter.
    Source = Json.Document(Web.Contents(KpiSourceUrl)),
    Months = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"},
    BudgetColumns = List.Transform(Months, each _ & "Budget"),
    KeyColumns = {"id", "link", "group", "subGroup", "metric", "kpiOperator", "metricValueType", "kpiSymbol", "year"},

    // 1. Expand the records list into columns. Only the columns the visual
    //    needs; each record's own "period" field is left out, as the unpivots
    //    below make a period column of their own. A month with no value is
    //    kept as "", since Table.Unpivot drops nulls.
    Records = Table.FromList(Source[records], Splitter.SplitByNothing(), {"record"}),
    Expanded = Table.ExpandRecordColumn(Records, "record", KeyColumns & Months & BudgetColumns),
    Indexed = Table.AddIndexColumn(Expanded, "recordIndex", 0, 1, Int64.Type),
    Filled = Table.ReplaceValue(Indexed, null, "", Replacer.ReplaceValue, Months & BudgetColumns),

    // 2. Unpivot the twelve actual-value columns into period and actual.
    Actuals = Table.Unpivot(Table.RemoveColumns(Filled, BudgetColumns), Months, "period", "actual"),

    // 3. Unpivot the twelve ...Budget columns into period and budget,
    //    stripping the suffix from the month name ("januaryBudget" -> "january").
    BudgetsLong = Table.Unpivot(Table.SelectColumns(Filled, {"id"} & BudgetColumns), BudgetColumns, "period", "budget"),
    Budgets = Table.TransformColumns(BudgetsLong, {{"period", each Text.Replace(_, "Budget", ""), type text}}),

    // 4. Merge the two unpivoted results on record id and period.
    Merged = Table.NestedJoin(Actuals, {"id", "period"}, Budgets, {"id", "period"}, "budgets", JoinKind.LeftOuter),
    WithBudget = Table.ExpandTableColumn(Merged, "budgets", {"budget"}),

    // 5. Add nodeOrder from each node's first position in the source.
    Nodes = List.Distinct(Expanded[link]),
    WithOrder = Table.AddColumn(WithBudget, "nodeOrder", each List.PositionOf(Nodes, [link]), Int64.Type),

    // 6. Coerce actual and budget to decimal numbers ("604,000" -> 604000;
    //    blank -> null, which the visual shows as no data). Year too.
    ToNumber = (value) =>
        let text = Text.Trim(Text.From(value ?? ""))
        in if text = "" then null else Number.FromText(Text.Remove(text, ","), "en-US"),
    Numbers = Table.TransformColumns(WithOrder, {
        {"actual", ToNumber, type number},
        {"budget", ToNumber, type number},
        {"year", each Number.FromText(Text.From(_), "en-US"), Int64.Type}
    }),

    // Month names as the visual shows them, in the source's order.
    Periods = Table.TransformColumns(Numbers, {{"period", Text.Proper, type text}}),
    WithMonth = Table.AddColumn(Periods, "monthIndex", each List.PositionOf(Months, Text.Lower([period])), Int64.Type),
    Sorted = Table.Sort(WithMonth, {{"recordIndex", Order.Ascending}, {"monthIndex", Order.Ascending}}),

    // The visual's data roles, by name.
    Renamed = Table.RenameColumns(Sorted, {
        {"link", "node"},
        {"kpiOperator", "operator"},
        {"metricValueType", "valueType"},
        {"kpiSymbol", "symbol"}
    }),
    Shaped = Table.SelectColumns(Renamed, {"node", "nodeOrder", "group", "subGroup", "metric", "operator", "valueType", "symbol", "year", "period", "actual", "budget"}),
    Typed = Table.TransformColumnTypes(Shaped, {
        {"node", type text},
        {"group", type text},
        {"subGroup", type text},
        {"metric", type text},
        {"operator", type text},
        {"valueType", type text},
        {"symbol", type text}
    })
in
    Typed
```

### The steps

The comments number the six steps. Each one also has a Power Query editor
equivalent, for building or checking the query by hand:

1. **Expand the `records` list into columns.** `Source[records]` is a list
   of records: **To Table**, then the expand button on the column, ticking
   the key columns and the 24 month columns. Each record's own `period` is
   not expanded, as the unpivots make the `period` column. Blank months are
   set to `""` before unpivoting, because **Unpivot** drops nulls, and a
   dropped month would lose its row.
2. **Unpivot the twelve actual-value columns** (`january` … `december`)
   into `period` and `actual`: select them, **Transform → Unpivot
   Columns** (`Table.Unpivot` names exactly these columns, so new fields in
   the API do not get unpivoted by accident).
3. **Unpivot the twelve `…Budget` columns** into `period` and `budget`
   the same way, from a copy holding only `id` and those columns, then
   **Replace Values** `Budget` with nothing in `period`
   (`januaryBudget` → `january`).
4. **Merge the two** on `id` and `period` (**Home → Merge Queries**, left
   outer, both columns selected on each side), and expand `budget`.
5. **Add `nodeOrder`**: each node's position in the list of distinct
   `link`s, in the order the API returns them, so the cards keep the API's
   order (0 for the first node).
6. **Coerce `actual` and `budget` to decimal numbers.** The API sends
   text, sometimes with thousands separators (`"604,000"`), so the
   separators are removed and the text read as a number in `en-US`, which
   does not depend on the report's locale. Blank text becomes null. `year`
   becomes a whole number.

The last steps title-case the month names (`January`, as the visual shows
them), sort the rows into the source's order, and rename the columns after
the visual's data roles.

## Using the result in the visual

1. Import the visual: **Visualizations → … → Import a visual from a file**,
   choosing `packages/powerbi-visual/dist/*.pbiviz` (`npm run build`), or
   use the Developer Visual while `npm start -w packages/powerbi-visual`
   runs.
2. Bind each column of `Kpis` to the data role of the same name: Node,
   Node order, Group, Sub-group, Metric, Operator, Value type, Unit symbol,
   Year, Period, Actual and Budget. Set Actual and Budget to **Sum** (each
   KPI has one row per period, so the sum is the value itself), and Node
   order and Year to **Don't summarize** if Power BI offers to sum them.
3. Add two native **Slicer** visuals, on `Kpis[year]` and `Kpis[period]`,
   set to single select. Sort the Period slicer by month (sort `period` by
   a month-number column, or use a list slicer in the order the data
   loads).

The visual draws the rows it is given. With the slicers set to one year and
one period it shows that period. Picking the latest period itself when the
slicers let several through, with a notice saying so, is a separate change.

## Checking the result

The sample's shaped table is checked against the fixture by
`test/powerbi-shaping.test.ts`: in Power BI Desktop, **Table view**, right-click
the `Kpis` table in the Data pane → **Copy table**, and paste into
[`samples/powerbi/shaped-table.tsv`](../samples/powerbi/shaped-table.tsv).
The test reads it and expects exactly the rows core reads from
`fixtures/bobos-big-block.json` (in any order).
