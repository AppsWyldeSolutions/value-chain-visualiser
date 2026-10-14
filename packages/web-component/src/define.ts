// Through the root entry, not ./element.js: the build keeps this import, so
// "." and "./define" share one element class.
import { defineValueChainVisualiser } from "./index.js";

export * from "./index.js";

// Importing this entry is enough to use <value-chain-visualiser>. It is the
// only module in the package listed under "sideEffects".
defineValueChainVisualiser();
