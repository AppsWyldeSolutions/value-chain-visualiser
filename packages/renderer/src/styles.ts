/**
 * Custom properties set on individual elements (one ray, one wave, one bubble,
 * one sphere) rather than on the root. Everything else the stylesheet reads
 * comes from `themeToCssVars`.
 */
export const ELEMENT_CSS_VARS = [
  "--vcv-ray-left",
  "--vcv-ray-width",
  "--vcv-ray-height",
  "--vcv-ray-opacity",
  "--vcv-ray-blur",
  "--vcv-wave-opacity",
  "--vcv-bubble-left",
  "--vcv-bubble-top",
  "--vcv-bubble-size",
  "--vcv-bubble-delay",
  "--vcv-sphere-color",
  "--vcv-sphere-level",
] as const;

/**
 * The renderer's stylesheet. It is a string so hosts can drop it into a
 * document or a shadow root without a CSS loader. No colour, size or font is
 * written here: they all arrive as `--vcv-*` custom properties from the theme.
 */
export const stylesText = `
.vcv-root {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  overflow: hidden;
  font-family: var(--vcv-fonts-body);
  color: var(--vcv-colors-text);
}
.vcv-root *,
.vcv-root *::before,
.vcv-root *::after {
  box-sizing: border-box;
}
.vcv-root :focus-visible {
  outline: 2px solid var(--vcv-colors-focus-ring);
  outline-offset: 2px;
}

.vcv-ocean {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  /* The base colour is here, not on the root, so opacity fades it too. */
  background: var(--vcv-ocean-gradient), var(--vcv-ocean-base);
  opacity: var(--vcv-ocean-opacity);
}
.vcv-ocean__ray {
  position: absolute;
  top: var(--vcv-ocean-ray-top);
  left: var(--vcv-ray-left);
  width: var(--vcv-ray-width);
  height: var(--vcv-ray-height);
  transform: rotate(var(--vcv-ocean-ray-angle));
  transform-origin: top center;
  background: linear-gradient(180deg, var(--vcv-ocean-ray-color), transparent);
  opacity: var(--vcv-ray-opacity);
  filter: blur(var(--vcv-ray-blur));
}
.vcv-ocean__waves {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: var(--vcv-ocean-wave-height);
}
.vcv-ocean__wave {
  fill: var(--vcv-ocean-wave-color);
  fill-opacity: var(--vcv-wave-opacity);
}
.vcv-ocean__bubble {
  position: absolute;
  left: var(--vcv-bubble-left);
  top: var(--vcv-bubble-top);
  width: var(--vcv-bubble-size);
  height: var(--vcv-bubble-size);
  border-radius: 50%;
  border: var(--vcv-ocean-bubble-border-width) solid var(--vcv-ocean-bubble-border);
  background: var(--vcv-ocean-bubble-fill);
  animation: vcv-rise var(--vcv-motion-bubble-duration) ease-in infinite;
  animation-delay: var(--vcv-bubble-delay);
}
@keyframes vcv-rise {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(calc(-1 * var(--vcv-motion-bubble-rise)));
    opacity: 0;
  }
}

@keyframes vcv-flow {
  to {
    stroke-dashoffset: -28;
  }
}
.vcv-flow {
  animation: vcv-flow var(--vcv-motion-flow-duration) linear infinite;
}

.vcv-content {
  position: relative;
  width: min(
    var(--vcv-layout-content-width),
    calc(100% - 2 * var(--vcv-layout-gutter))
  );
  margin: 0 auto;
  padding: var(--vcv-layout-padding-top) 0 var(--vcv-layout-padding-bottom);
}
.vcv-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--vcv-layout-controls-gap) 32px;
  min-height: var(--vcv-layout-header-height);
  margin-bottom: var(--vcv-layout-header-gap);
}
.vcv-header__eyebrow {
  font-size: var(--vcv-type-eyebrow-size);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vcv-colors-text-muted);
}
.vcv-header__title {
  margin: 4px 0 6px;
  font-family: var(--vcv-fonts-display);
  font-size: var(--vcv-type-title-size);
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--vcv-colors-text);
}
.vcv-header__subtitle {
  font-size: var(--vcv-type-subtitle-size);
  color: var(--vcv-colors-text-soft);
}
.vcv-header__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--vcv-layout-controls-gap);
}
.vcv-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--vcv-layout-controls-gap);
}
.vcv-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--vcv-control-label-size);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vcv-colors-text-muted);
}
.vcv-control__input {
  box-sizing: border-box;
  height: var(--vcv-control-height);
  border: 1px solid var(--vcv-glass-control-border);
  border-radius: var(--vcv-radii-control);
  background: var(--vcv-glass-control-background);
  color: var(--vcv-colors-text);
  font-family: var(--vcv-fonts-body);
  font-size: var(--vcv-control-font-size);
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  cursor: pointer;
}
select.vcv-control__input {
  padding: 0 12px;
  color-scheme: dark;
}
.vcv-control__input option {
  color: var(--vcv-control-option-color);
  background: var(--vcv-control-option-background);
}
.vcv-control--year select {
  min-width: var(--vcv-control-year-min-width);
}
.vcv-control--period select {
  min-width: var(--vcv-control-period-min-width);
}
/* The View switch: two options side by side, the chosen one filled. */
.vcv-segments {
  display: inline-flex;
  box-sizing: border-box;
  height: var(--vcv-control-height);
  overflow: hidden;
  border: var(--vcv-compact-border-width) solid var(--vcv-glass-control-border);
  border-radius: var(--vcv-radii-control);
  background: var(--vcv-glass-control-background);
}
.vcv-segment {
  padding: var(--vcv-control-segment-padding);
  border: 0;
  background: transparent;
  color: var(--vcv-colors-text-muted);
  font-family: var(--vcv-fonts-body);
  font-size: var(--vcv-control-font-size);
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  cursor: pointer;
}
.vcv-segment[aria-checked="true"] {
  background: var(--vcv-control-selected-background);
  color: var(--vcv-control-selected-color);
}
.vcv-segment:focus-visible {
  outline-offset: calc(-1 * var(--vcv-compact-border-width));
}
input[type="color"].vcv-control__input {
  width: var(--vcv-control-swatch-width);
  padding: 4px;
}

.vcv-grid {
  position: relative;
  display: grid;
  /* As many columns as fit cards of at least card-min-width, up to
     layout-columns of them. The 0.1px keeps rounding from dropping one. */
  grid-template-columns: repeat(
    auto-fill,
    minmax(
      min(
        100%,
        max(
          var(--vcv-layout-card-min-width),
          calc(
            (
                100% - (var(--vcv-layout-columns) - 1) *
                  var(--vcv-layout-column-gap)
              ) /
              var(--vcv-layout-columns) - 0.1px
          )
        )
      ),
      1fr
    )
  );
  column-gap: var(--vcv-layout-column-gap);
  row-gap: var(--vcv-layout-row-gap);
}

.vcv-sphere {
  --vcv-sphere-color: var(--vcv-fill-color);
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  width: var(--vcv-sphere-size);
  height: var(--vcv-sphere-size);
  overflow: hidden;
  border-radius: 50%;
  border: var(--vcv-sphere-ring-width) solid
    color-mix(
      in srgb,
      var(--vcv-sphere-color) var(--vcv-sphere-ring-opacity),
      transparent
    );
  background: var(--vcv-sphere-glass);
  box-shadow:
    var(--vcv-sphere-shadow),
    0 0 calc(var(--vcv-sphere-size) * var(--vcv-sphere-glow-scale))
      color-mix(
        in srgb,
        var(--vcv-sphere-color) var(--vcv-sphere-glow-opacity),
        transparent
      );
}
.vcv-root--selectable .vcv-kpi .vcv-sphere {
  cursor: pointer;
}
.vcv-sphere--missed {
  --vcv-sphere-color: var(--vcv-shortfall-color);
}
.vcv-sphere--no-data {
  border-style: dashed;
  border-color: var(--vcv-sphere-empty-ring);
  box-shadow: var(--vcv-sphere-shadow);
}
.vcv-sphere__liquid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--vcv-sphere-level);
  background: linear-gradient(
    180deg,
    color-mix(
      in srgb,
      color-mix(
          in srgb,
          var(--vcv-sphere-tint) var(--vcv-sphere-liquid-tint),
          var(--vcv-sphere-color)
        )
        var(--vcv-sphere-liquid-top-opacity),
      transparent
    ),
    color-mix(
      in srgb,
      var(--vcv-sphere-color) var(--vcv-sphere-liquid-bottom-opacity),
      transparent
    )
  );
}
.vcv-sphere--no-data .vcv-sphere__liquid {
  display: none;
}
.vcv-sphere__meniscus {
  display: none;
  position: absolute;
  left: -8%;
  width: 116%;
  top: calc(var(--vcv-sphere-size) * var(--vcv-sphere-meniscus-scale) / -2);
  height: calc(var(--vcv-sphere-size) * var(--vcv-sphere-meniscus-scale));
  border-radius: 50%;
  background: color-mix(
    in srgb,
    color-mix(
        in srgb,
        var(--vcv-sphere-tint) var(--vcv-sphere-meniscus-tint),
        var(--vcv-sphere-color)
      )
      var(--vcv-sphere-meniscus-opacity),
    transparent
  );
}
.vcv-sphere--partial .vcv-sphere__meniscus {
  display: block;
}
.vcv-sphere__highlight {
  position: absolute;
  left: 15%;
  top: 9%;
  width: 36%;
  height: 22%;
  border-radius: 50%;
  transform: rotate(-32deg);
  background: radial-gradient(
    ellipse at 50% 45%,
    var(--vcv-sphere-highlight),
    transparent 72%
  );
}
.vcv-sphere__highlight--low {
  left: auto;
  top: auto;
  right: 10%;
  bottom: 9%;
  width: 26%;
  height: 11%;
  transform: rotate(-38deg);
  background: radial-gradient(
    ellipse at 50% 50%,
    var(--vcv-sphere-highlight-low),
    transparent 72%
  );
}

.vcv-card {
  display: flex;
  flex-direction: column;
  gap: var(--vcv-card-gap);
  box-sizing: border-box;
  min-height: var(--vcv-card-min-height);
  padding: var(--vcv-card-padding);
  border: 1px solid var(--vcv-glass-card-border);
  border-radius: var(--vcv-radii-card);
  color: var(--vcv-colors-text);
  background: var(--vcv-glass-card-background);
  -webkit-backdrop-filter: blur(var(--vcv-glass-blur))
    saturate(var(--vcv-glass-saturate));
  backdrop-filter: blur(var(--vcv-glass-blur))
    saturate(var(--vcv-glass-saturate));
  box-shadow: var(--vcv-glass-card-shadow);
}
.vcv-card--dimmed {
  opacity: var(--vcv-card-dim-opacity);
}
.vcv-card__header {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  min-height: var(--vcv-card-header-height);
}
.vcv-card__heading {
  min-width: 0;
}
.vcv-card__eyebrow,
.vcv-popover__eyebrow {
  font-size: var(--vcv-card-eyebrow-size);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vcv-colors-text-label);
}
.vcv-card__title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 4px 0 0;
  font-family: var(--vcv-fonts-display);
  font-size: var(--vcv-card-title-size);
  line-height: 1.15;
  font-weight: 700;
}
.vcv-card__pill,
.vcv-popover__pill {
  flex-shrink: 0;
  padding: 5px 11px;
  border: 1px solid var(--vcv-glass-pill-border);
  border-radius: var(--vcv-radii-pill);
  background: var(--vcv-glass-pill-background);
  font-size: var(--vcv-card-pill-size);
  font-weight: 500;
  white-space: nowrap;
}
.vcv-card__rows {
  display: flex;
  flex-direction: column;
  gap: var(--vcv-card-gap);
}

.vcv-kpi-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vcv-kpi-row--satellite {
  padding-top: 16px;
  border-top: 1px solid var(--vcv-glass-line);
}
.vcv-kpi-row__label {
  text-align: center;
  font-size: var(--vcv-card-row-label-size);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vcv-colors-text-label);
}
.vcv-kpi-row__items {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.vcv-kpi-row--satellite .vcv-kpi-row__items {
  flex-wrap: wrap;
  gap: var(--vcv-card-gap) var(--vcv-card-satellite-gap);
}

.vcv-kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  text-align: center;
}
.vcv-kpi--primary {
  --vcv-sphere-size: var(--vcv-card-primary-sphere-size);
  flex: 0 1 var(--vcv-card-primary-slot);
}
.vcv-kpi--satellite {
  --vcv-sphere-size: var(--vcv-card-satellite-sphere-size);
  flex: 1 1 var(--vcv-card-satellite-min-slot);
  max-width: var(--vcv-card-satellite-slot);
}
.vcv-kpi__percent {
  margin-top: 4px;
  font-family: var(--vcv-fonts-display);
  line-height: 1.1;
  font-weight: 700;
}
.vcv-kpi__label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
  overflow-wrap: break-word;
  line-height: 1.25;
}
.vcv-kpi__value {
  line-height: 1.25;
  color: var(--vcv-colors-text-muted);
}
.vcv-kpi--primary .vcv-kpi__percent {
  font-size: var(--vcv-card-primary-percent-size);
}
.vcv-kpi--primary .vcv-kpi__label {
  -webkit-line-clamp: 2;
  font-size: var(--vcv-card-primary-label-size);
  font-weight: 700;
}
.vcv-kpi--primary .vcv-kpi__value {
  font-size: var(--vcv-card-primary-value-size);
}
.vcv-kpi--satellite .vcv-kpi__percent {
  font-size: var(--vcv-card-satellite-percent-size);
}
.vcv-kpi--satellite .vcv-kpi__label {
  -webkit-line-clamp: 4;
  font-size: var(--vcv-card-satellite-label-size);
  font-weight: 400;
}
.vcv-kpi--satellite .vcv-kpi__value {
  font-size: var(--vcv-card-satellite-value-size);
}

.vcv-card--score {
  grid-column: 1 / -1;
  gap: var(--vcv-score-gap);
  min-height: var(--vcv-score-min-height);
  padding: var(--vcv-score-padding);
}
.vcv-card--score .vcv-card__rows {
  gap: var(--vcv-score-gap);
}
.vcv-card--score .vcv-kpi-row--primary .vcv-kpi-row__items {
  flex-wrap: wrap;
  gap: var(--vcv-card-gap) var(--vcv-score-primary-gap);
}
.vcv-card--score .vcv-kpi--primary {
  flex: 1 1 var(--vcv-score-primary-min-slot);
  max-width: var(--vcv-score-primary-slot);
}
.vcv-card__panels {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--vcv-score-panel-min-width)), 1fr)
  );
  gap: var(--vcv-score-gap);
}
.vcv-kpi-row--panel {
  padding: var(--vcv-score-panel-padding);
  border: 1px solid var(--vcv-glass-line);
  border-radius: var(--vcv-radii-panel);
  background: var(--vcv-score-panel-background);
}
.vcv-kpi-row--panel .vcv-kpi-row__items {
  flex-wrap: wrap;
  gap: var(--vcv-card-gap) var(--vcv-score-panel-gap);
}
.vcv-kpi--panel {
  --vcv-sphere-size: var(--vcv-score-panel-sphere-size);
  flex: 1 1 var(--vcv-score-panel-min-slot);
  max-width: var(--vcv-score-panel-slot);
}
.vcv-kpi--panel .vcv-kpi__percent {
  font-size: var(--vcv-score-panel-percent-size);
}
.vcv-kpi--panel .vcv-kpi__label {
  -webkit-line-clamp: 3;
  font-size: var(--vcv-score-panel-label-size);
  font-weight: 400;
}
.vcv-kpi--panel .vcv-kpi__value {
  font-size: var(--vcv-score-panel-value-size);
}

.vcv-connectors {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.vcv-connector__line {
  fill: none;
  stroke: var(--vcv-connector-stroke);
  stroke-width: var(--vcv-connector-stroke-width);
  stroke-linecap: round;
  stroke-dasharray: var(--vcv-connector-dash);
}
.vcv-connector__head {
  fill: var(--vcv-connector-head);
}

.vcv-transfers {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.vcv-transfer {
  position: absolute;
  border-radius: 8px;
  cursor: help;
  pointer-events: auto;
}
.vcv-transfer--open {
  z-index: 1;
}
.vcv-popover {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  width: var(--vcv-popover-width);
  max-width: calc(100vw - 2 * var(--vcv-popover-margin));
  padding: var(--vcv-popover-offset) 0;
  cursor: default;
}
.vcv-popover[hidden] {
  display: none;
}
.vcv-popover__panel {
  box-sizing: border-box;
  padding: var(--vcv-popover-padding);
  border: 1px solid var(--vcv-popover-border);
  border-radius: var(--vcv-radii-popover);
  color: var(--vcv-colors-text);
  background: var(--vcv-popover-background);
  -webkit-backdrop-filter: blur(var(--vcv-popover-blur))
    saturate(var(--vcv-glass-saturate));
  backdrop-filter: blur(var(--vcv-popover-blur))
    saturate(var(--vcv-glass-saturate));
  box-shadow: var(--vcv-popover-shadow);
}
.vcv-popover__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.vcv-popover__heading {
  min-width: 0;
}
.vcv-popover__title {
  margin-top: 4px;
  font-family: var(--vcv-fonts-display);
  font-size: var(--vcv-popover-title-size);
  line-height: 1.15;
  font-weight: 700;
}
.vcv-popover__items {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: var(--vcv-card-gap) var(--vcv-card-satellite-gap);
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--vcv-glass-line);
}
.vcv-kpi__tag {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  width: 100%;
  /* Two lines, so the spheres line up whether a tag wraps or not. */
  min-height: 2.5em;
  font-size: var(--vcv-popover-tag-size);
  line-height: 1.25;
  font-weight: 700;
  color: var(--vcv-colors-text-label);
}

@media (prefers-reduced-motion: reduce) {
  .vcv-ocean__bubble,
  .vcv-flow {
    animation: none;
  }
}

/* Flat: a high-contrast mode (Visual.setHighContrast). Solid colours only:
   no ocean, glass, glow, gradient or highlights. */
.vcv-root--flat {
  background: var(--vcv-ocean-base);
}
.vcv-root--flat .vcv-ocean {
  display: none;
}
.vcv-root--flat .vcv-card,
.vcv-root--flat .vcv-popover {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: none;
}
.vcv-root--flat .vcv-sphere {
  box-shadow: none;
}
.vcv-root--flat .vcv-sphere__liquid {
  background: var(--vcv-sphere-color);
}
.vcv-root--flat .vcv-sphere__meniscus,
.vcv-root--flat .vcv-sphere__highlight {
  display: none;
}

/* Empty: a host with no data to draw yet (Visual.setEmpty). */
.vcv-empty {
  margin: 0;
  padding: var(--vcv-layout-gutter);
  font-family: var(--vcv-fonts-display);
  font-size: var(--vcv-type-subtitle-size);
  color: var(--vcv-colors-text-soft);
  text-align: center;
}
.vcv-root--empty .vcv-grid,
.vcv-root--empty .vcv-header__subtitle {
  display: none;
}

/* Notice: why this period is the one shown (Visual.setNotice). */
.vcv-notice {
  width: fit-content;
  max-width: 100%;
  margin: 0 0 var(--vcv-layout-header-gap);
  padding: var(--vcv-notice-padding);
  border: var(--vcv-notice-border-width) solid var(--vcv-notice-border);
  border-radius: var(--vcv-radii-pill);
  background: var(--vcv-notice-background);
  color: var(--vcv-notice-color);
  font-family: var(--vcv-fonts-body);
  font-size: var(--vcv-notice-size);
}

/* Header visibility (Visual.setHeader). */
.vcv-root--no-heading .vcv-header__heading,
.vcv-root--no-subtitle .vcv-header__subtitle {
  display: none;
}

/* Compact display (cardDisplay "compact"): one bar per link, in a single
   row that never wraps. Each bar sits in a slot that is a size container,
   so everything in it scales with the slot's width (the cqw in the compact
   tokens) as the visual narrows. */
.vcv-root--compact .vcv-grid {
  grid-template-columns: none;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  align-items: start;
  column-gap: var(--vcv-compact-gap);
  row-gap: 0;
}
.vcv-slot {
  position: relative;
  min-width: 0;
  container-type: inline-size;
}
.vcv-bar {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
  padding: var(--vcv-compact-padding);
  border: var(--vcv-compact-border-width) solid var(--vcv-glass-card-border);
  border-radius: var(--vcv-compact-radius);
  background: var(--vcv-glass-card-background);
  box-shadow: var(--vcv-glass-card-shadow);
  -webkit-backdrop-filter: blur(var(--vcv-glass-blur))
    saturate(var(--vcv-glass-saturate));
  backdrop-filter: blur(var(--vcv-glass-blur))
    saturate(var(--vcv-glass-saturate));
  color: var(--vcv-colors-text);
  cursor: pointer;
}
.vcv-bar:hover,
.vcv-bar[aria-expanded="true"] {
  border-color: var(--vcv-colors-focus-ring);
}
.vcv-bar__code {
  max-width: 100%;
  margin-bottom: var(--vcv-compact-inner-gap);
  overflow: hidden;
  font-family: var(--vcv-fonts-body);
  font-size: var(--vcv-compact-code-size);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--vcv-colors-text-label);
}
.vcv-bar__primary {
  --vcv-sphere-size: var(--vcv-compact-primary-sphere-size);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vcv-compact-inner-gap);
}
.vcv-bar__primary .vcv-bar__kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vcv-compact-row-gap);
}
.vcv-bar__primary .vcv-bar__pct {
  font-family: var(--vcv-fonts-display);
  font-size: var(--vcv-compact-primary-pct-size);
  font-weight: 700;
}
.vcv-bar__divider {
  align-self: stretch;
  height: var(--vcv-compact-border-width);
  margin: var(--vcv-compact-inner-gap) 0;
  background: var(--vcv-glass-line);
}
/* One grid for all of a bar's satellites, so the sphere column and the
   percentage column each size to their widest item and stay aligned. */
.vcv-bar__list {
  --vcv-sphere-size: var(--vcv-compact-sphere-size);
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  column-gap: var(--vcv-compact-inner-gap);
  row-gap: var(--vcv-compact-row-gap);
  width: fit-content;
}
.vcv-bar__list .vcv-bar__kpi {
  display: contents;
}
.vcv-bar__list .vcv-bar__pct {
  font-family: var(--vcv-fonts-body);
  font-size: var(--vcv-compact-pct-size);
  font-variant-numeric: tabular-nums;
  color: var(--vcv-colors-text-muted);
  text-align: left;
}

/* A bar's full card, in a popup anchored to the bar. */
.vcv-detail {
  position: absolute;
  z-index: 30;
  box-sizing: border-box;
  width: min(var(--vcv-compact-detail-width), 100%);
  overflow: auto;
  padding: var(--vcv-popover-padding);
  border: var(--vcv-compact-border-width) solid var(--vcv-popover-border);
  border-radius: var(--vcv-radii-popover);
  background: var(--vcv-popover-background);
  box-shadow: var(--vcv-popover-shadow);
  -webkit-backdrop-filter: blur(var(--vcv-popover-blur));
  backdrop-filter: blur(var(--vcv-popover-blur));
  animation: vcv-fade-in var(--vcv-motion-popup-duration) ease;
}
.vcv-detail[hidden] {
  display: none;
}
.vcv-detail .vcv-card {
  min-height: 0;
}
.vcv-detail__close {
  position: absolute;
  z-index: 1;
  top: var(--vcv-compact-row-gap);
  right: var(--vcv-compact-row-gap);
  width: var(--vcv-compact-close-size);
  height: var(--vcv-compact-close-size);
  padding: 0;
  border: var(--vcv-compact-border-width) solid var(--vcv-glass-pill-border);
  border-radius: var(--vcv-radii-pill);
  background: var(--vcv-glass-pill-background);
  color: var(--vcv-colors-text);
  font: inherit;
  cursor: pointer;
}

/* A sphere's name and figures, over a compact bar. */
.vcv-tip {
  position: absolute;
  z-index: 40;
  box-sizing: border-box;
  max-width: var(--vcv-compact-tip-width);
  padding: var(--vcv-compact-tip-padding);
  border: var(--vcv-compact-border-width) solid var(--vcv-popover-border);
  border-radius: var(--vcv-radii-control);
  background: var(--vcv-popover-background);
  color: var(--vcv-colors-text);
  font-family: var(--vcv-fonts-body);
  font-size: var(--vcv-compact-tip-size);
  pointer-events: none;
  animation: vcv-fade-in var(--vcv-motion-popup-duration) ease;
}
.vcv-tip[hidden] {
  display: none;
}
@keyframes vcv-fade-in {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .vcv-detail,
  .vcv-tip {
    animation: none;
  }
}
.vcv-root--flat .vcv-bar,
.vcv-root--flat .vcv-detail {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: none;
}
`;
