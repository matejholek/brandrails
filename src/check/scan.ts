export interface Finding {
  file: string;
  line: number;
  rule: "hex-colour" | "colour-function" | "px-spacing" | "stale-rules";
  message: string;
}

const STYLE_FILE = /\.(css|scss|sass|less|html?|[cm]?[jt]sx?|vue|svelte|astro)$/;
const IGNORE_COMMENT = /brandrails-ignore/;

// Hex colours, but not URL fragments (href="#main"), entities (&#123;) or HTML text (<br>#212121).
const HEX = /(?<![\w&/="'>-]|href=["']|url\(["']?)#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
// rgb(12 34 56) / hsla(…) with literal numbers; rgb(var(--x)) is fine.
const COLOUR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(\s*-?\d[^()]*\)?/g;
// px on spacing and radius: CSS declarations and Tailwind arbitrary values like p-[13px].
const PX_DECL =
  /(?<![\w-])(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|border-radius|(?:margin|padding|inset|scroll-margin|scroll-padding)-[a-z-]+|border-[a-z-]*radius)\s*:[^;{}]*?(?<![\w.])(?!0px)\d*\.?\d+px/g;
// Angular unit bindings: [style.padding.px]="12", [style.border-radius.px]="radius".
const PX_ANGULAR = /\[style\.(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|border-radius|(?:margin|padding|inset)-[a-z-]+|border-[a-z-]*radius)\.px\]/g;
const PX_TAILWIND = /(?<![\w-])(?:-?(?:[mp][trblxyse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|rounded(?:-[a-z]{1,2})?))-\[(?!0px)\d*\.?\d+px\]/g;

/** A custom property or SCSS variable declaration (`--name: value`, `$name: value`) defines a token; it is never drift. */
const TOKEN_DEFINITION = /^\s*(?:--|\$)[\w-]+\s*:/;
/** An SCSS map entry on its own line (`primary: #fff,`, no `;`), e.g. in `$colors: (…)` or `mat.theme-overrides((…))`. */
const SCSS_MAP_ENTRY = /^\s*["']?[\w-]+["']?\s*:[^;{}]+$/;

export interface AddedLine {
  file: string;
  line: number;
  text: string;
}

/** Added lines from `git diff --unified=0` output. */
export function addedLines(diff: string): AddedLine[] {
  const out: AddedLine[] = [];
  let file = "";
  let line = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw.startsWith("+++ b/") ? raw.slice(6) : "";
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("+")) out.push({ file, line: line++, text: raw.slice(1) });
    else if (!raw.startsWith("-") && !raw.startsWith("\\")) line++;
  }
  return out;
}

/**
 * `nearest` names the token closest to a hard-coded colour (see nearestColourToken), so the
 * message can say which token to use instead of only that one is missing.
 */
export function scanLines(
  lines: AddedLine[],
  skip: (file: string) => boolean = () => false,
  nearest: (colour: string) => string | undefined = () => undefined,
): Finding[] {
  const findings: Finding[] = [];
  for (const { file, line, text } of lines) {
    if (!STYLE_FILE.test(file) || skip(file)) continue;
    if (IGNORE_COMMENT.test(text) || TOKEN_DEFINITION.test(text)) continue;
    if (/\.s[ac]ss$/.test(file) && SCSS_MAP_ENTRY.test(text)) continue;
    const report = (rule: Finding["rule"], value: string, hint: string) =>
      findings.push({ file, line, rule, message: `Hard-coded ${value}: ${hint}` });
    const colourHint = (colour: string) => {
      const token = nearest(colour);
      return token ? `use \`${token}\`, the closest colour token` : "use a colour token";
    };
    for (const m of text.matchAll(HEX)) report("hex-colour", m[0], colourHint(m[0]));
    for (const m of text.matchAll(COLOUR_FN)) report("colour-function", `${m[0].replace(/\(.*/s, "")}() colour`, colourHint(m[0]));
    for (const m of text.matchAll(PX_DECL)) report("px-spacing", m[0].match(/[\d.]+px/)![0], "use a spacing or radius token");
    for (const m of text.matchAll(PX_TAILWIND)) report("px-spacing", m[0], "use a spacing or radius token");
    for (const m of text.matchAll(PX_ANGULAR)) report("px-spacing", m[0], "bind a spacing or radius token instead of px");
  }
  return findings;
}

/** Build output and vendored files are never scanned. */
export const DEFAULT_IGNORE = ["node_modules/**", "dist/**", "build/**", "out/**", ".next/**", "**/*.min.*", "**/*.bundle.*", "**/vendor/**"];

/** Minimal glob: `**` spans directories, `*` stays inside one. */
export function globToRegExp(glob: string): RegExp {
  const source = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000")
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, "(?:.*/)?")
    .replace(/\u0001/g, ".*");
  return new RegExp(`^${source}$`);
}
