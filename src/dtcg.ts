import type { CustomProperties } from "./read/blocks.js";

export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "shadow"
  | "duration"
  | "cubicBezier";

export interface Token {
  $value: string;
  $type: TokenType;
}

export interface TokenGroup {
  [name: string]: Token | TokenGroup;
}

// Tailwind v4 namespace (or common custom-property prefix) → DTCG group and type.
const NAMESPACES: [prefix: string, group: string, type: TokenType][] = [
  ["color", "color", "color"],
  ["font", "font", "fontFamily"],
  ["spacing", "spacing", "dimension"],
  ["space", "spacing", "dimension"],
  ["radius", "radius", "dimension"],
  ["shadow", "shadow", "shadow"],
  ["duration", "duration", "duration"],
  ["ease", "easing", "cubicBezier"],
];

/** Builds a DTCG token tree. Properties outside known namespaces are skipped. */
export function toDtcg(props: CustomProperties): TokenGroup {
  const tree: TokenGroup = {};
  for (const [prop, value] of Object.entries(props)) {
    const name = prop.slice(2);
    const ns = NAMESPACES.find(([prefix]) => name.startsWith(`${prefix}-`));
    if (!ns) continue;
    const [prefix, group, type] = ns;
    const key = name.slice(prefix.length + 1);
    const bucket = (tree[group] ??= {}) as TokenGroup;
    bucket[key] = { $value: value, $type: type };
  }
  return tree;
}

export function isToken(node: Token | TokenGroup): node is Token {
  return "$value" in node;
}
