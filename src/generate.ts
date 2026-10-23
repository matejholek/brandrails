import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseDtcg, toDtcg, type TokenGroup } from "./dtcg.js";
import { readCssVars } from "./read/css-vars.js";
import { readTailwindTheme } from "./read/tailwind-theme.js";
import { writeAgentsMd } from "./write/agents-md.js";
import { writeClaudeMd } from "./write/claude-md.js";
import { writeCopilot } from "./write/copilot.js";
import { writeCursorMdc } from "./write/cursor-mdc.js";
import { writeFigmaMake } from "./write/figma-make.js";

export interface GenerateOptions {
  root: string;
  tokens: string;
  /** CSS files to read tokens from; when given, tokens.json is (re)written from them. */
  from?: string[];
}

export const RULES_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/design.mdc",
  ".github/copilot-instructions.md",
  "design/figma-make-guidelines.md",
] as const;

export function tokensFromCss(files: string[]): TokenGroup {
  const props = {};
  for (const file of files) {
    const css = readFileSync(file, "utf8");
    Object.assign(props, readTailwindTheme(css), readCssVars(css));
  }
  return toDtcg(props);
}

export function renderAll(tokens: TokenGroup, read: (path: string) => string): Record<string, string> {
  return {
    "AGENTS.md": writeAgentsMd(read("AGENTS.md"), tokens),
    "CLAUDE.md": writeClaudeMd(read("CLAUDE.md")),
    ".cursor/rules/design.mdc": writeCursorMdc(tokens),
    ".github/copilot-instructions.md": writeCopilot(read(".github/copilot-instructions.md"), tokens),
    "design/figma-make-guidelines.md": writeFigmaMake(tokens),
  };
}

/** Writes tokens.json (with --from) and the rules files. Returns the paths that changed. */
export function generate({ root, tokens: tokensPath, from }: GenerateOptions): string[] {
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
  if (from?.length) {
    tokens = tokensFromCss(from.map(abs));
    put(tokensPath, JSON.stringify(tokens, null, 2) + "\n");
  } else {
    if (!existsSync(abs(tokensPath))) {
      throw new Error(`${tokensPath} not found. Run with --from <css files> to create it.`);
    }
    tokens = parseDtcg(read(tokensPath));
  }

  for (const [path, content] of Object.entries(renderAll(tokens, read))) put(path, content);
  return changed;
}
