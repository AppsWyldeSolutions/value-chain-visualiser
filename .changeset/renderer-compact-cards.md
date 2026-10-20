---
"@appswyldesolutions/vcv-renderer": major
"@appswyldesolutions/vcv-web-component": major
"@appswyldesolutions/vcv-react": minor
---

Compact card display, now the default.

**Breaking (default output changes):** without a `cardDisplay`, `createVisual` now draws one compact bar per link in a single row that scales with the visual (CSS container queries) and never wraps; clicking a bar (or Enter/Space on it) opens the link's full card in a popup anchored to it, closed by a second click, Escape or a click elsewhere. Arrows join the bars at their primary spheres; hovering one previews its Transfer Points and a click pins them, one popup at a time. To keep the previous look, pass `cardDisplay: "full"` (renderer), set `data-card-display="full"` (web component) or `cardDisplay="full"` (React).

Renderer: `cardDisplay` option and `Visual.setCardDisplay(mode)`; `createBar` and `sphereLabel`; a `compact` token group and `motion.popupDuration`; Transfer Points popovers pin on click (`vcv-transfer-pin`, `unpin`). Web component: `data-card-display` attribute. React: `cardDisplay` prop.
