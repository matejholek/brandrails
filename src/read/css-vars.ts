import { findBlocks, parseDeclarations, topLevelBlocks, type CustomProperties } from "./blocks.js";

/** Custom properties declared on `:root` or `html` (where Angular Material themes usually live). Theme overrides (`.dark`, `[data-theme]`) and `@media` blocks are ignored. */
export function readCssVars(css: string): CustomProperties {
  return Object.assign({}, ...findBlocks(css, /:root|html/).map(parseDeclarations));
}

/** Custom properties a dark theme overrides (`.dark`, `[data-theme="dark"]`), which tokens.json does not hold yet. */
export function readDarkOverrides(css: string): CustomProperties {
  return Object.assign({}, ...findBlocks(css, /(?::root|html)?(?:\.dark|\[data-theme=["']?dark["']?\])/).map(parseDeclarations));
}

/**
 * Selectors outside `:root` that define their own set of custom properties, such as a page with its
 * own palette (`.landing-page { --bg: #F2F0EA; … }`). Tailwind's `--tw-*` internals don't count.
 */
export function readScopedThemes(css: string, min = 3): string[] {
  const out = new Set<string>();
  for (const { prelude, body } of topLevelBlocks(css)) {
    if (prelude.startsWith("@") || /^(?::root|html)$/.test(prelude) || /\.dark|data-theme/.test(prelude)) continue;
    const own = Object.keys(parseDeclarations(body)).filter((p) => !p.startsWith("--tw-"));
    if (own.length >= min) out.add(prelude);
  }
  return [...out];
}
