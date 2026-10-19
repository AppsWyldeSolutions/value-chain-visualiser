---
"@appswyldesolutions/vcv-renderer": minor
---

Renderer: `createVisual`'s `onSelect` gets a second argument, `{ multi }`, true for a ctrl-click or cmd-click; a new `onDeselect()` is called for a click away from every sphere; and `Visual.setSelectedKpis(isSelected | null)` dims the cards with no selected KPI to the new `card.dimOpacity` token, kept across redraws. For hosts that keep a selection, such as the Power BI visual. Existing `onSelect(kpi)` callers are unaffected.
