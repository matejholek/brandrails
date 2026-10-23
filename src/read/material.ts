import type { CustomProperties } from "./blocks.js";
import { parseMap, stripScssComments } from "./scss.js";

const TYPE_SCALE = /^(?:display|headline|title|body|label)-/;

/**
 * Angular Material 3 system tokens (`--mat-sys-<name>`) as Brandrails properties:
 * colour roles → `--color-<name>`, `corner-*` → `--radius-*`, `level0…5` → `--shadow-level*`.
 * Type scale and state-layer opacities stay under their own name and are reported as skipped.
 */
export function fromMaterialSys(name: string, value: string): [string, string] {
  if (name.startsWith("corner-")) return [`--radius-${name.slice(7)}`, value];
  if (/^level\d$/.test(name)) return [`--shadow-${name}`, value];
  if (TYPE_SCALE.test(name) || name.endsWith("-opacity")) return [`--mat-sys-${name}`, value];
  return [`--color-${name}`, value];
}

/** Arguments of every `prefix(…)` call, with balanced parentheses. */
function callArguments(source: string, prefix: RegExp): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(new RegExp(`${prefix.source}\\(`, "g"))) {
    const start = m.index! + m[0].length;
    let depth = 1;
    let i = start;
    for (; i < source.length && depth; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
    }
    out.push(source.slice(start, i - 1).trim());
  }
  return out;
}

const unquote = (v: string) => v.trim().replace(/^["']|["']$/g, "");

export interface MaterialTheme {
  props: CustomProperties;
  /** Palettes passed to `mat.theme()`; their tones are computed by Angular Material at build time. */
  palettes: string[];
}

/**
 * Reads Angular Material theming from SCSS: `mat.theme((…))` typography and palettes,
 * `mat.theme-overrides((…))` and `--mat-sys-*` declarations.
 */
export function readMaterialTheme(scss: string): MaterialTheme {
  const source = stripScssComments(scss);
  const props: CustomProperties = {};
  const palettes: string[] = [];

  for (const arg of callArguments(source, /\bmat\.theme/)) {
    const config = parseMap(arg);
    if (!config) continue;
    if (config.color) {
      const color = parseMap(config.color);
      for (const v of color ? [color.primary, color.tertiary] : [config.color]) {
        const palette = v?.match(/\$([\w-]+)/);
        if (palette) palettes.push(`mat.$${palette[1]}`);
      }
    }
    if (config.typography) {
      const type = parseMap(config.typography);
      if (!type) props["--font-family-plain"] = unquote(config.typography);
      else {
        if (type["plain-family"]) props["--font-family-plain"] = unquote(type["plain-family"]);
        if (type["brand-family"]) props["--font-family-brand"] = unquote(type["brand-family"]);
        for (const w of ["bold", "medium", "regular"]) {
          if (type[`${w}-weight`]) props[`--font-weight-${w}`] = type[`${w}-weight`];
        }
      }
    }
  }

  for (const arg of callArguments(source, /\bmat\.theme-overrides/)) {
    for (const [name, value] of Object.entries(parseMap(arg) ?? {})) {
      const [prop, v] = fromMaterialSys(name, value);
      props[prop] = v;
    }
  }

  for (const m of source.matchAll(/--mat-sys-([\w-]+)\s*:\s*([^;{}]+);/g)) {
    const [prop, v] = fromMaterialSys(m[1], m[2].trim());
    props[prop] = v;
  }
  return { props, palettes };
}
