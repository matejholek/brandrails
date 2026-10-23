import { findBlocks, parseDeclarations, type CustomProperties } from "./blocks.js";

/** Custom properties declared on `:root` or `html` (where Angular Material themes usually live). Theme overrides (`.dark`, `[data-theme]`) and `@media` blocks are ignored. */
export function readCssVars(css: string): CustomProperties {
  return Object.assign({}, ...findBlocks(css, /:root|html/).map(parseDeclarations));
}
