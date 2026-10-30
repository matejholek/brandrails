import type { CustomProperties } from "./read/blocks.js";

export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "number"
  | "shadow"
  | "duration"
  | "cubicBezier"
  | "gradient";

export interface Token {
  $value: unknown;
  $type?: string;
  $description?: string;
}

export interface TokenGroup {
  [name: string]: Token | TokenGroup | string | undefined;
}

// Custom-property prefix → DTCG group and type. Longer prefixes first.
const NAMESPACES: [prefix: string, group: string, type: TokenType][] = [
  ["color", "color", "color"],
  ["font-family", "font.family", "fontFamily"],
  ["font-weight", "font.weight", "fontWeight"],
  ["font", "font", "fontFamily"],
  ["spacing", "spacing", "dimension"],
  ["space", "space", "dimension"],
  ["radius", "radius", "dimension"],
  ["shadow", "shadow", "shadow"],
  ["duration", "duration", "duration"],
  ["ease", "easing", "cubicBezier"],
  ["gradient", "gradient", "gradient"],
];

// shadcn/ui and Tailwind v3 setups store colours as bare HSL channels (`--primary: 221 83% 53%`)
// and wrap them in hsl() at the point of use.
const HSL_CHANNELS = /^-?\d*\.?\d+(?:deg)?\s+\d*\.?\d+%\s+\d*\.?\d+%$/;
const COLOUR_LITERAL = /^(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\(.*\))$/;

function lookup(name: string, value?: string): { path: string[]; type: TokenType } | undefined {
  const ns = NAMESPACES.find(([prefix]) => name === prefix || name.startsWith(`${prefix}-`));
  if (ns) {
    const [prefix, group, type] = ns;
    // A bare `--radius` or `--spacing` is the base step the scale is computed from.
    return { path: [...group.split("."), name === prefix ? "base" : name.slice(prefix.length + 1)], type };
  }
  // Role names with no prefix (`--primary`, `--sidebar-border`) are colours when their value is one.
  if (value !== undefined && isColour(value)) return { path: ["color", name], type: "color" };
  return undefined;
}

function isColour(value: string): boolean {
  return HSL_CHANNELS.test(value) || COLOUR_LITERAL.test(value);
}

export interface DtcgResult {
  tokens: TokenGroup;
  /** Custom properties outside the known namespaces, left out of tokens.json. */
  skipped: string[];
}

/** Builds a DTCG token tree. `var(--x)` becomes a `{group.x}` alias when --x is a token too. */
export function toDtcg(props: CustomProperties): DtcgResult {
  const tokens: TokenGroup = {};
  const skipped: string[] = [];
  // Follows `var(--x)` chains so `--ring: var(--brand)` is typed by what --brand holds.
  const resolve = (value: string, depth = 0): string => {
    const ref = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
    return ref && props[ref] !== undefined && depth < 10 ? resolve(props[ref], depth + 1) : value;
  };
  const alias = (value: string) =>
    value.replace(/^var\(\s*--([\w-]+)\s*\)$/, (whole, name) => {
      const target = props[`--${name}`] !== undefined && lookup(name, resolve(props[`--${name}`]));
      return target ? `{${target.path.join(".")}}` : whole;
    });
  for (const [prop, value] of Object.entries(props)) {
    const found = lookup(prop.slice(2), resolve(value));
    if (!found) {
      skipped.push(prop);
      continue;
    }
    let node = tokens;
    for (const key of found.path.slice(0, -1)) node = (node[key] ??= {}) as TokenGroup;
    // shadcn on Tailwind v4 writes `--color-primary: var(--primary)`; both land on color.primary, so keep the value, not a self-alias.
    const aliased = alias(value);
    const literal = aliased === `{${found.path.join(".")}}` ? resolve(value) : aliased;
    const v = found.type === "color" && HSL_CHANNELS.test(literal) ? `hsl(${literal})` : literal;
    node[found.path.at(-1)!] = { $value: v, $type: found.type };
  }
  return { tokens, skipped };
}

export function isToken(node: unknown): node is Token {
  return typeof node === "object" && node !== null && "$value" in node;
}

export interface FlatToken {
  path: string;
  value: unknown;
  type?: string;
  description?: string;
}

/** Depth-first list of tokens with dotted paths; `$type` is inherited from the nearest group. */
export function flatten(tree: TokenGroup, prefix = "", inherited?: string): FlatToken[] {
  const type = typeof tree.$type === "string" ? tree.$type : inherited;
  const out: FlatToken[] = [];
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith("$") || typeof node !== "object" || node === null) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isToken(node)) out.push({ path, value: node.$value, type: node.$type ?? type, description: node.$description });
    else out.push(...flatten(node, path, type));
  }
  return out;
}

/** Parses tokens.json and lists tokens with no `$type` of their own or from a parent group. */
export function parseDtcg(json: string): { tokens: TokenGroup; untyped: string[] } {
  const tokens = JSON.parse(json) as TokenGroup;
  const untyped = flatten(tokens).filter((t) => !t.type).map((t) => t.path);
  return { tokens, untyped };
}
