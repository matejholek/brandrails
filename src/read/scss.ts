import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CustomProperties } from "./blocks.js";

/** Removes block comments and `//` line comments, leaving `url(http://…)` alone. */
export function stripScssComments(scss: string): string {
  return scss.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}])\/\/.*$/gm, "$1");
}

/** Top-level statements, i.e. text between `;` outside any `{}` or `()`. Block bodies are dropped. */
function topLevelStatements(source: string): string[] {
  const out: string[] = [];
  let braces = 0;
  let parens = 0;
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "#" && source[i + 1] === "{") {
      i = source.indexOf("}", i); // #{…} interpolation
      if (i === -1) break;
    } else if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (ch === "{") {
      if (braces === 0) start = -1; // a rule or mixin body, not a statement
      braces++;
    } else if (ch === "}") {
      braces--;
      if (braces === 0) start = i + 1;
    } else if (ch === ";" && braces === 0 && parens === 0) {
      if (start !== -1) out.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  return out;
}

/** Splits on commas that are not nested inside parentheses. */
export function splitTopCommas(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** `(a: 1, b: (c: 2))` → `{ a: "1", b: "(c: 2)" }`, or undefined when the value is not a map. */
export function parseMap(value: string): Record<string, string> | undefined {
  const m = value.trim().match(/^\(([\s\S]*)\)$/);
  if (!m) return undefined;
  const entries = splitTopCommas(m[1]).map((entry) => entry.match(/^["']?([\w-]+)["']?\s*:\s*([\s\S]+)$/));
  if (!entries.length || entries.some((e) => !e)) return undefined;
  return Object.fromEntries(entries.map((e) => [e![1], e![2].trim()]));
}

// Plural and alternative group names used in SCSS maps and variables → Brandrails prefixes.
const GROUP_ALIASES: Record<string, string> = {
  colors: "color",
  colour: "color",
  colours: "color",
  spacer: "spacing",
  spacers: "spacing",
  spaces: "space",
  radii: "radius",
  radiuses: "radius",
  shadows: "shadow",
  durations: "duration",
  easing: "ease",
  easings: "ease",
  fonts: "font",
};

export function normaliseName(name: string): string {
  const name2 = name.replace(/^font-families\b/, "font-family").replace(/^font-weights\b/, "font-weight");
  const [first, ...rest] = name2.split("-");
  return [GROUP_ALIASES[first] ?? first, ...rest].join("-");
}

/** `$x`, `ns.$x` and `map.get($m, k)` / `map-get($m, k)` become `var(--x)` so they turn into token aliases. */
function scssValue(value: string): string {
  const v = value.replace(/\s*!(?:default|global)\s*/g, "").trim();
  const variable = v.match(/^(?:[\w-]+\.)?\$([\w-]+)$/);
  if (variable) return `var(--${normaliseName(variable[1])})`;
  const get = v.match(/^(?:map\.get|map-get)\(\s*(?:[\w-]+\.)?\$([\w-]+)\s*,\s*["']?([\w-]+)["']?\s*\)$/);
  if (get) return `var(--${normaliseName(`${get[1]}-${get[2]}`)})`;
  return v;
}

function addVariable(props: CustomProperties, name: string, value: string): void {
  const map = parseMap(value.replace(/\s*!(?:default|global)\s*$/, ""));
  if (!map) {
    props[`--${normaliseName(name)}`] = scssValue(value);
    return;
  }
  for (const [key, entry] of Object.entries(map)) addVariable(props, `${name}-${key}`, entry);
}

/** Top-level SCSS variables and maps as custom properties: `$colors: (primary: #fff)` → `--color-primary`. */
export function readScssVariables(scss: string): CustomProperties {
  const props: CustomProperties = {};
  for (const statement of topLevelStatements(stripScssComments(scss))) {
    const m = statement.match(/^\$([\w-]+)\s*:\s*([\s\S]+)$/);
    if (m) addVariable(props, m[1], m[2]);
  }
  return props;
}

/** Indented `.sass` syntax: one `$name: value` per unindented line. */
export function readSassVariables(sass: string): CustomProperties {
  const props: CustomProperties = {};
  for (const m of stripScssComments(sass).matchAll(/^\$([\w-]+)\s*:\s*(.+?)\s*$/gm)) addVariable(props, m[1], m[2]);
  return props;
}

/** Local partials pulled in with `@use`, `@forward` or `@import`. Packages and `sass:` modules are skipped. */
export function scssDependencies(file: string, scss: string, includePaths: string[] = []): string[] {
  const deps: string[] = [];
  const source = stripScssComments(scss);
  for (const m of source.matchAll(/@(?:use|forward|import)\s+([^;]+);/g)) {
    for (const spec of m[1].matchAll(/["']([^"']+)["']/g)) {
      const found = resolvePartial(spec[1], [dirname(file), ...includePaths]);
      if (found) deps.push(found);
    }
  }
  return deps;
}

function resolvePartial(spec: string, dirs: string[]): string | undefined {
  if (/^(sass:|~|@|https?:)/.test(spec) || spec.endsWith(".css")) return undefined;
  const base = spec.replace(/\.s[ac]ss$/, "");
  const slash = base.lastIndexOf("/");
  const head = base.slice(0, slash + 1);
  const name = base.slice(slash + 1);
  const candidates = ["scss", "sass"].flatMap((ext) => [
    `${head}${name}.${ext}`,
    `${head}_${name}.${ext}`,
    `${base}/_index.${ext}`,
    `${base}/index.${ext}`,
  ]);
  for (const dir of dirs) {
    for (const candidate of candidates) {
      const path = join(dir, candidate);
      if (existsSync(path)) return path;
    }
  }
  return undefined;
}
