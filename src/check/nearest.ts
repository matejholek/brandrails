import { flatten, type TokenGroup } from "../dtcg.js";

type Rgb = [number, number, number];

/** sRGB 0–1 from #hex, rgb() or hsl() (comma or space syntax, alpha ignored). Other formats return undefined. */
export function parseColour(text: string): Rgb | undefined {
  const value = text.trim();
  const hex = value.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    if (hex.length === 5 || hex.length === 7) return undefined;
    const full = hex.length <= 4 ? [...hex.slice(0, 3)].map((c) => c + c).join("") : hex.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb;
  }
  const fn = value.match(/^(rgba?|hsla?)\(\s*([^)]*)\)$/i);
  if (!fn) return undefined;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
  if (parts.length < 3) return undefined;
  const num = (p: string) => parseFloat(p);
  if (fn[1].toLowerCase().startsWith("rgb")) {
    return parts.map((p) => (p.endsWith("%") ? num(p) / 100 : num(p) / 255)) as Rgb;
  }
  const [h, s, l] = [num(parts[0]), num(parts[1]) / 100, num(parts[2]) / 100];
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) as Rgb;
}

function toOklab([r, g, b]: Rgb): Rgb {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Distance in OKLab; about 0.02 is a just-noticeable difference. */
function distance(a: Rgb, b: Rgb): number {
  const [x, y] = [toOklab(a), toOklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Close enough that the hard-coded value is very likely meant to be the token. */
const MAX_DISTANCE = 0.1;

/** Returns a finder for the colour token closest to a hard-coded colour, if one is close. */
export function nearestColourToken(tokens: TokenGroup): (colour: string) => string | undefined {
  const all = flatten(tokens);
  const byPath = new Map(all.map((t) => [t.path, t.value]));
  // Follow {aliases} to a literal value.
  const literal = (value: unknown, depth = 0): unknown =>
    typeof value === "string" && /^\{.+\}$/.test(value) && depth < 10 ? literal(byPath.get(value.slice(1, -1)), depth + 1) : value;
  const palette: { path: string; rgb: Rgb }[] = [];
  for (const t of all) {
    const value = literal(t.value);
    const rgb = t.type === "color" && typeof value === "string" ? parseColour(value) : undefined;
    // Aliases point at the same colour as their target; prefer the first (base) name.
    if (rgb && typeof t.value === "string" && !t.value.startsWith("{")) palette.push({ path: t.path, rgb });
  }
  return (colour) => {
    const rgb = parseColour(colour);
    if (!rgb || !palette.length) return undefined;
    let best: { path: string; d: number } | undefined;
    for (const p of palette) {
      const d = distance(rgb, p.rgb);
      if (!best || d < best.d) best = { path: p.path, d };
    }
    return best && best.d <= MAX_DISTANCE ? best.path : undefined;
  };
}
