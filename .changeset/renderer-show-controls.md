---
"@appswyldesolutions/vcv-renderer": minor
---

Renderer: `createVisual` takes `showControls` (default `true`). With `false` it draws no Year, Period or colour controls, for a host that sets those itself through `setSelection` and `setTheme`, such as the Power BI visual. Everything else draws unchanged.
