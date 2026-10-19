---
"@appswyldesolutions/vcv-renderer": minor
---

Renderer: add `ocean.opacity` (default `"1"`), which fades the whole ocean background (base colour, gradient, rays, waves and bubbles) without fading the cards, and `OCEAN_PRESETS` (`ocean`, `deep`, `lagoon`, `none`), background looks for `theme.ocean` that restyle a drawn visual in place. The ocean's base colour is now painted on the ocean layer rather than the root.
