import { findBlocks, parseDeclarations, type CustomProperties } from "./blocks.js";

/** Custom properties declared in Tailwind v4 `@theme` blocks (including `@theme inline`). */
export function readTailwindTheme(css: string): CustomProperties {
  return Object.assign({}, ...findBlocks(css, /@theme(?:\s+[\w-]+)*/).map(parseDeclarations));
}
