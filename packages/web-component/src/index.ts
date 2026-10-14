// Side-effect free: importing this registers nothing. Import "./define" (the
// package's "./define" entry) or call defineValueChainVisualiser() for that.
export {
  defineValueChainVisualiser,
  rowsFromJson,
  TAG_NAME,
  ValueChainVisualiserElement,
} from "./element.js";
export type { VcvChangeDetail, VcvSelectDetail } from "./element.js";
// So hosts and wrappers can type the rows property without installing core.
export type { KpiRow } from "@appswyldesolutions/vcv-core";
