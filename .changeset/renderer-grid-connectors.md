---
"@AppsWyldeSolutions/vcv-renderer": minor
---

Renderer: the card grid is now responsive (as many columns as fit `layout.cardMinWidth`, up to `layout.columns`), and `createConnectors` draws the value chain's arrows between consecutive cards, measured from their actual positions and redrawn on resize. Adds `connectorShape`, a `connector` token group, `layout.cardMinWidth` and `card.satelliteMinSlot`; a crowded satellite row now wraps instead of overlapping.
