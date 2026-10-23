export type CustomProperties = Record<string, string>;

// Strips comments, then returns the body of every top-level block (not nested in
// @media, @supports, …) whose prelude matches exactly.
export function findBlocks(css: string, prelude: RegExp): string[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const exact = new RegExp(`^(?:${prelude.source})$`);
  const bodies: string[] = [];
  let depth = 0;
  let preludeStart = 0;
  let bodyStart = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      if (depth === 0 && exact.test(source.slice(preludeStart, i).trim())) bodyStart = i + 1;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        if (bodyStart !== -1) bodies.push(source.slice(bodyStart, i));
        bodyStart = -1;
        preludeStart = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      preludeStart = i + 1; // e.g. after @import "tailwindcss";
    }
  }
  return bodies;
}

export function parseDeclarations(body: string): CustomProperties {
  const props: CustomProperties = {};
  for (const decl of body.split(";")) {
    const m = decl.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m) props[m[1]] = m[2];
  }
  return props;
}
