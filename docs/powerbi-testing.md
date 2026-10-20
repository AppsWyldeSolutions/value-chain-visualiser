# Testing the packaged Power BI visual

What to check, by hand, in Power BI Desktop before a `.pbiviz` goes to
anyone else. The automated tests cover the code (`npm run verify`) and the
packaged bundle in a browser (`npm run e2e`, project `powerbi-visual`); this
list covers what only Power BI itself shows: its tooltips, high-contrast
mode, the format pane and export.

Work through the sections in order. Each step says what to do and, after
**Expect**, what should happen. Note anything else as a failure, with the
step number.

## 0. Build and open

1. From the repo root: `npm run build`. The visual's build runs Power BI's
   certification audit and fails if the bundle makes external requests
   (`fetch`, `XMLHttpRequest`, `eval`). **Expect** `No external requests
found in the visual.` and `Package created!` in the output, and a file in
   `packages/powerbi-visual/dist/`.
2. Open `samples/powerbi/value-chain-sample.pbix` in Power BI Desktop.
3. **Visualizations → … (Get more visuals) → Import a visual from a file**,
   and choose the `.pbiviz` from step 1. If Desktop asks, replace the
   version already in the report. **Expect** the report's value chain
   visual to redraw with the new build, with no error icon on it.

## 1. First render

1. Set the Year slicer to 2026 and the Period slicer to August.
2. **Expect** 9 cards with arrows between them, the Score Card last, and the
   subtitle `August 2026 · 53 KPIs measured against budget`. No Year,
   Period or colour controls inside the visual (Power BI's slicers and
   format pane own those).
3. Pick July in the Period slicer. **Expect** the spheres and subtitle to
   change to July 2026.
4. Clear the Period slicer. **Expect** August 2026 shown, with the notice
   `Showing August 2026, the latest with actuals of 12 periods in the data.
Use the Year and Period slicers to pick one.` above the cards. Pick a
   period again: **expect** the notice gone.
5. **Expect** no Power BI title above the visual ("Sum of actual and Sum of
   budget by …"), only the visual's own heading. (A visual added before this
   build keeps its title setting: turn it off in **General → Title**.)

## 2. Fields and the empty state

1. Add a new page, and on it the Value Chain Visualiser with no fields.
   **Expect** `Add Node, Group, Metric, Year, Period, Actual and Budget`,
   not an error or a blank visual.
2. From the `Kpis` table drag in `node`, `metric`, `group`, `year` and
   `period` to their wells. **Expect** `Add Actual and Budget`.
3. Add `actual` and `budget` (Sum). **Expect** the chain to draw.
4. Remove `budget` from its well. **Expect** `Add Budget`. Put it back.
5. Remove `symbol` (Unit symbol, optional). **Expect** the chain still
   draws. Put it back.

## 3. Format pane

With the visual on page 1 selected, open **Format visual**:

1. **Colours**: change Fill colour, then Shortfall colour. **Expect** the
   spheres on target, then the missed ones, to recolour at once.
2. **Background → Ocean**: try Deep, Lagoon and None. **Expect** the
   background to change each time; with None, the report page shows
   through behind the cards.
3. **Background → Opacity**: drag to 30%. **Expect** the ocean to fade, not
   the cards.
4. **Display → Transfer Points**: off. **Expect** hovering an arrow between
   cards to show no Transfer Points panel. Turn it back on.
5. **Display → Sphere size**: 50%, then 150%. **Expect** every sphere to
   shrink, then grow, with no overlap.
6. **Display → Card display**: the visual opens Compact, one small bar per
   link in a single row. Click a bar: **expect** its full card in a popup
   below it (above if there is no room), closing on a second click, Escape
   or a click elsewhere. Pick Full: **expect** the full cards. Back to
   Compact, and narrow the visual: **expect** the bars to shrink in one row,
   never wrapping.
7. **Header**: change Eyebrow and Title. **Expect** the heading to change
   at once. Turn off Show subtitle, then Show header. **Expect** the
   subtitle, then the whole heading, to disappear.
8. **Reset to default** on each card. **Expect** the original look.

## 4. Selection and cross-filtering

Page 1 has the Year and Period slicers; add a Table visual with
`Kpis[metric]` and `Kpis[actual]` next to the chain for this section.

1. Click a sphere. **Expect** the other cards to dim and the table to
   filter to that KPI.
2. Ctrl-click (cmd-click on a Mac) a sphere on another card. **Expect** that
   card to brighten too, and the table to show both KPIs.
3. Click the chain's background. **Expect** every card at full opacity and
   the table unfiltered.
4. Select a row in the table. Power BI filters the chain's data to it, so
   **expect** only that KPI's card to be drawn. Clear the selection in the
   table and **expect** the whole chain back.

## 5. Tooltips

1. Hover a sphere. **Expect** Power BI's own tooltip (in the report's
   theme, not a plain browser tooltip) with KPI, Period, Actual, Budget,
   Rule and Status. Move along the sphere: **expect** the tooltip to follow.
2. Hover a card's title. **Expect** Link and On target ("3 of 5").
3. Drag a field (for example `subGroup`, as Count) into the **Tooltips**
   well. **Expect** it as an extra line in a KPI's tooltip.
4. Optional: make a report page a tooltip page (**Page information →
   Allow use as tooltip**), and choose it in **Format visual → General →
   Tooltips**. **Expect** that page as the tooltip, filtered to the KPI.

## 6. High contrast

1. In Windows, **Settings → Accessibility → Contrast themes**, apply one
   (for example Desert or Night sky); Power BI Desktop follows it.
2. **Expect** the visual flat: no ocean, no glass or glow on the cards,
   spheres in solid colours (on target in the foreground colour, missed in
   the link colour), solid borders and arrows, text readable.
3. Click a sphere, and hover one. **Expect** selection and tooltips still
   work.
4. Turn contrast themes off. **Expect** the glass look back, with the format
   pane's colours.

## 7. Size, focus mode and export

1. Resize the visual small, then large. **Expect** the cards to reflow and
   the arrows to follow; at small sizes the visual scrolls.
2. **Focus mode** on the visual, and back. **Expect** it to redraw both
   times.
3. **File → Export → Export to PDF**. **Expect** the chain in the PDF as on
   screen. (This relies on the visual reporting when it has finished
   rendering.)

## 8. Done

Close Desktop without saving unless the sample is meant to change (it is
committed in `samples/powerbi/`; see `docs/powerbi-data-shaping.md`).
Record the result, the Power BI Desktop version (**Help → About**) and any
failures by step number, for example in the pull request.
