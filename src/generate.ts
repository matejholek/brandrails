import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseDtcg, toDtcg, type DtcgResult, type TokenGroup } from "./dtcg.js";
import { readCssVars } from "./read/css-vars.js";
import { readTailwindTheme } from "./read/tailwind-theme.js";
import { writeAgentsMd } from "./write/agents-md.js";
import { writeClaudeMd } from "./write/claude-md.js";
import { writeCopilot } from "./write/copilot.js";
import { writeCursorMdc } from "./write/cursor-mdc.js";
import { writeFigmaMake } from "./write/figma-make.js";
import { writeReference } from "./write/reference.js";
import { REFERENCE_PATH, type RenderOptions } from "./write/rules.js";

export interface GenerateOptions {
  root: string;
  tokens: string;
  /** CSS files to read tokens from; when given, tokens.json is (re)written from them. */
  from?: string[];
  /** Full token tables instead of the compact list. */
  full?: boolean;
}

export const RULES_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/design.mdc",
  ".github/copilot-instructions.md",
  "design/figma-make-guidelines.md",
  REFERENCE_PATH,
] as const;

export function tokensFromCss(files: string[]): DtcgResult {
  const props = {};
  for (const file of files) {
    const css = readFileSync(file, "utf8");
    Object.assign(props, readTailwindTheme(css), readCssVars(css));
  }
  return toDtcg(props);
}

export function renderAll(tokens: TokenGroup, read: (path: string) => string, options: RenderOptions = {}): Record<string, string> {
  return {
    "AGENTS.md": writeAgentsMd(read("AGENTS.md"), tokens, options),
    "CLAUDE.md": writeClaudeMd(read("CLAUDE.md")),
    ".cursor/rules/design.mdc": writeCursorMdc(tokens, options),
    ".github/copilot-instructions.md": writeCopilot(read(".github/copilot-instructions.md"), tokens, options),
    "design/figma-make-guidelines.md": writeFigmaMake(tokens, options),
    [REFERENCE_PATH]: writeReference(tokens, options),
  };
}

export interface GenerateResult {
  changed: string[];
  /** CSS custom properties left out of tokens.json (with --from). */
  skipped: string[];
  /** Tokens in tokens.json with no $type. */
  untyped: string[];
}

/** Writes tokens.json (with --from) and the rules files. */
export function generate({ root, tokens: tokensPath, from, full }: GenerateOptions): GenerateResult {
  const abs = (p: string) => join(root, p);
  const read = (p: string) => (existsSync(abs(p)) ? readFileSync(abs(p), "utf8") : "");
  const changed: string[] = [];
  const put = (p: string, content: string) => {
    if (read(p) === content) return;
    mkdirSync(dirname(abs(p)), { recursive: true });
    writeFileSync(abs(p), content);
    changed.push(p);
  };

  let tokens: TokenGroup;
  let skipped: string[] = [];
  let untyped: string[] = [];
  if (from?.length) {
    ({ tokens, skipped } = tokensFromCss(from.map(abs)));
    put(tokensPath, JSON.stringify(tokens, null, 2) + "\n");
  } else {
    if (!existsSync(abs(tokensPath))) {
      throw new Error(`${tokensPath} not found. Run with --from <css files> to create it.`);
    }
    ({ tokens, untyped } = parseDtcg(read(tokensPath)));
  }

  for (const [path, content] of Object.entries(renderAll(tokens, read, { full }))) put(path, content);
  return { changed, skipped, untyped };
}
