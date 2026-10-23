import type { CustomProperties } from "./read/blocks.js";

export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "number"
  | "shadow"
  | "duration"
  | "cubicBezier";

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
];

function lookup(name: string): { path: string[]; type: TokenType } | undefined {
  const ns = NAMESPACES.find(([prefix]) => name.startsWith(`${prefix}-`));
  if (!ns) return undefined;
  const [prefix, group, type] = ns;
  return { path: [...group.split("."), name.slice(prefix.length + 1)], type };
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
  const alias = (value: string) =>
    value.replace(/^var\(\s*--([\w-]+)\s*\)$/, (whole, name) => {
      const target = props[`--${name}`] !== undefined && lookup(name);
      return target ? `{${target.path.join(".")}}` : whole;
    });
  for (const [prop, value] of Object.entries(props)) {
    const found = lookup(prop.slice(2));
    if (!found) {
      skipped.push(prop);
      continue;
    }
    let node = tokens;
    for (const key of found.path.slice(0, -1)) node = (node[key] ??= {}) as TokenGroup;
    node[found.path.at(-1)!] = { $value: alias(value), $type: found.type };
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
