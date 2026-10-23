import { findBlocks, parseDeclarations, type CustomProperties } from "./blocks.js";

/** Custom properties declared on `:root`. Theme overrides (`.dark`, `[data-theme]`) and `@media` blocks are ignored in v0.1. */
export function readCssVars(css: string): CustomProperties {
  return Object.assign({}, ...findBlocks(css, /:root/).map(parseDeclarations));
}
