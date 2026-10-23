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

/** Parses tokens.json and checks that every leaf has `$value` and `$type`. */
export function parseDtcg(json: string): TokenGroup {
  const tree = JSON.parse(json) as TokenGroup;
  const walk = (node: Token | TokenGroup, path: string) => {
    if (typeof node !== "object" || node === null) throw new Error(`tokens.json: ${path} is not an object`);
    if ("$value" in node) {
      if (!("$type" in node)) throw new Error(`tokens.json: ${path} has $value but no $type`);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith("$")) walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(tree, "");
  return tree;
}
