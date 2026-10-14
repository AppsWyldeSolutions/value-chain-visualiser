import { defineValueChainVisualiser } from "./element.js";

export {
  defineValueChainVisualiser,
  rowsFromJson,
  TAG_NAME,
  ValueChainVisualiserElement,
} from "./element.js";
export type { VcvChangeDetail, VcvSelectDetail } from "./element.js";

// Importing the package is enough to use <value-chain-visualiser>.
defineValueChainVisualiser();
