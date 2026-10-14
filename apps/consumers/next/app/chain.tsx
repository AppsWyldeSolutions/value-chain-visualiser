"use client";

import { useEffect, useState } from "react";
import {
  ValueChainVisualiser,
  type KpiRow,
} from "@appswyldesolutions/vcv-react";

// The data arrives as the API sends it (long rows under "records"). Turning
// it into KpiRow[] uses rowsFromJson from the web component, which can only
// load in the browser, so it is imported in an effect. Until then the
// wrapper renders the empty element, which the server HTML already holds.
export function Chain({ data }: { data: unknown }) {
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let mounted = true;
    void import("@appswyldesolutions/vcv-web-component").then(
      ({ rowsFromJson }) => {
        if (mounted) setRows(rowsFromJson(data));
      },
    );
    return () => {
      mounted = false;
    };
  }, [data]);

  return (
    <>
      <output data-testid="selected">{selected}</output>
      <ValueChainVisualiser
        rows={rows}
        theme={{ fillColor: "#2f9e44", shortfallColor: "#e03131" }}
        onSelect={(kpi) => setSelected(`${kpi.node} › ${kpi.metric}`)}
      />
    </>
  );
}
