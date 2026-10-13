/**
 * Custom properties the shell sets on individual elements (one ray, one wave,
 * one bubble) rather than on the root. Everything else the stylesheet reads
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
  background: var(--vcv-ocean-base);
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
  background: var(--vcv-ocean-gradient);
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
.vcv-grid {
  display: grid;
  grid-template-columns: repeat(var(--vcv-layout-columns), minmax(0, 1fr));
  column-gap: var(--vcv-layout-column-gap);
  row-gap: var(--vcv-layout-row-gap);
}

@media (prefers-reduced-motion: reduce) {
  .vcv-ocean__bubble,
  .vcv-flow {
    animation: none;
  }
}
`;
