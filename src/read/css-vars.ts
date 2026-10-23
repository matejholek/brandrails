import { findBlocks, parseDeclarations, type CustomProperties } from "./blocks.js";

/** Custom properties declared on `:root`. Theme overrides such as `.dark` are ignored in v0.1. */
export function readCssVars(css: string): CustomProperties {
  return Object.assign({}, ...findBlocks(css, /(?<![\w-]):root/).map(parseDeclarations));
}
