"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
// Types only: the element's code defines a class extending HTMLElement, so it
// is loaded in an effect (browser only), never when this module is imported.
import type {
  KpiRow,
  ValueChainVisualiserElement,
  VcvChangeDetail,
  VcvSelectDetail,
} from "@AppsWyldeSolutions/vcv-web-component";

// Not TAG_NAME from the web component: importing it would load the element.
const TAG = "value-chain-visualiser";

/** The two colours the element takes as `data-*` attributes. */
export interface ValueChainVisualiserTheme {
  /** Sphere colour when a KPI is on target. */
  fillColor?: string;
  /** Sphere colour when a KPI misses its target. */
  shortfallColor?: string;
}

export interface ValueChainVisualiserProps {
  /** The KPI data, set on the element as its `rows` property. */
  rows: KpiRow[];
  /** Year to show. Defaults to the data's latest year. */
  year?: number;
  /** Month to show (`"July"`). Defaults to the latest month with actuals. */
  period?: string;
  theme?: ValueChainVisualiserTheme;
  /** A sphere was clicked (`vcv-select`). */
  onSelect?: (detail: VcvSelectDetail) => void;
  /** The viewer changed Year, Period or a colour (`vcv-change`). */
  onChange?: (detail: VcvChangeDetail) => void;
  /** The element could not be loaded or could not read its data (`vcv-error`). */
  onError?: (error: Error) => void;
  className?: string;
  style?: CSSProperties;
}

type Handlers = Pick<
  ValueChainVisualiserProps,
  "onSelect" | "onChange" | "onError"
>;

/**
 * `<value-chain-visualiser>` for React. Safe to render on the server: there it
 * is the bare tag, and the element is registered and drawn in the browser.
 */
export function ValueChainVisualiser({
  rows,
  year,
  period,
  theme,
  onSelect,
  onChange,
  onError,
  className,
  style,
}: ValueChainVisualiserProps): ReactElement {
  const ref = useRef<ValueChainVisualiserElement>(null);
  const [defined, setDefined] = useState(false);
  // The latest callbacks, so changing one does not re-subscribe.
  const handlers = useRef<Handlers>({ onSelect, onChange, onError });
  useEffect(() => {
    handlers.current = { onSelect, onChange, onError };
  });

  useEffect(() => {
    let mounted = true;
    import("@AppsWyldeSolutions/vcv-web-component/define").then(
      () => {
        if (mounted) setDefined(true);
      },
      (error: unknown) => {
        if (mounted) {
          handlers.current.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  // Only once the element is upgraded: before that, setting rows would make
  // an own property that hides the element's setter.
  useEffect(() => {
    if (defined && ref.current) ref.current.rows = rows;
  }, [defined, rows]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const select = (event: Event): void =>
      handlers.current.onSelect?.(
        (event as CustomEvent<VcvSelectDetail>).detail,
      );
    const change = (event: Event): void =>
      handlers.current.onChange?.(
        (event as CustomEvent<VcvChangeDetail>).detail,
      );
    const error = (event: Event): void =>
      handlers.current.onError?.((event as CustomEvent<Error>).detail);
    element.addEventListener("vcv-select", select);
    element.addEventListener("vcv-change", change);
    element.addEventListener("vcv-error", error);
    return () => {
      element.removeEventListener("vcv-select", select);
      element.removeEventListener("vcv-change", change);
      element.removeEventListener("vcv-error", error);
    };
  }, []);

  return createElement(TAG, {
    ref,
    className,
    style,
    "data-year": year,
    "data-period": period,
    "data-fill-color": theme?.fillColor,
    "data-shortfall-color": theme?.shortfallColor,
  });
}
