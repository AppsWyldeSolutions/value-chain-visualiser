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
