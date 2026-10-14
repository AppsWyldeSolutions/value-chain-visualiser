---
"@AppsWyldeSolutions/vcv-renderer": minor
---

Renderer: arrows drawn by `createConnectors` now show a Transfer Points popover on hover and keyboard focus, for cards built by `createCard` whose node has transfer points. Escape closes it and it is kept inside the viewport. Adds `popoverPosition`, `nodeShortName`, a `popover` token group and `connector.hitPadding`; `ConnectorShape` gains `hit` and `ConnectorMetrics` gains `hitPadding`.
