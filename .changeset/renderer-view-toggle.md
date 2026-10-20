---
"@appswyldesolutions/vcv-renderer": minor
"@appswyldesolutions/vcv-web-component": minor
"@appswyldesolutions/vcv-react": minor
---

A **View** switch (Compact | Full card) in the visual's header controls lets viewers change the card display at runtime. It starts at the `cardDisplay` given, follows `setCardDisplay` and `data-card-display` without reporting them, and is not shown with `showControls: false`. The change state (`onChange`, `vcv-change`, React's `onChange`) gains `cardDisplay`. New theme tokens: `control.segmentPadding`, `control.selectedBackground`, `control.selectedColor`.
