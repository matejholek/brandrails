export type CustomProperties = Record<string, string>;

// Strips comments, then returns the body of every top-level block whose prelude matches.
export function findBlocks(css: string, prelude: RegExp): string[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bodies: string[] = [];
  const opener = new RegExp(`(${prelude.source})\\s*\\{`, "g");
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source))) {
    let depth = 1;
    let i = opener.lastIndex;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    bodies.push(source.slice(start, i - 1));
    opener.lastIndex = i;
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
