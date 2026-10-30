import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseDtcg, toDtcg, type DtcgResult, type TokenGroup } from "./dtcg.js";
import { readAngularJson } from "./read/angular.js";
import type { CustomProperties } from "./read/blocks.js";
import { readCssVars, readDarkOverrides, readScopedThemes } from "./read/css-vars.js";
import { fromMaterialSys, readMaterialTheme } from "./read/material.js";
import { readSassVariables, readScssVariables, scssDependencies, stripScssComments } from "./read/scss.js";
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
  /** CSS, SCSS or angular.json files to read tokens from; when given, tokens.json is (re)written from them. */
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

export interface ReadResult extends DtcgResult {
  /** Things the reader found but could not turn into tokens, for the user to act on. */
  notes: string[];
}

/**
 * Reads tokens from stylesheets. An `angular.json` expands to the workspace's global styles;
 * SCSS files pull in their local `@use` / `@import` partials first. Later files win.
 */
export function tokensFromFiles(files: string[]): ReadResult {
  const props: CustomProperties = {};
  const notes = new Set<string>();
  const seen = new Set<string>();
  const readStyles = (file: string, includePaths: string[]) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    if (/\.s[ac]ss$/.test(file)) {
      for (const dep of scssDependencies(file, source, includePaths)) readStyles(dep, includePaths);
      const theme = readMaterialTheme(source);
      for (const palette of theme.palettes) {
        notes.add(`Angular Material colours come from ${palette} at build time; add mat.theme-overrides() or --mat-sys-* values to capture them as tokens.`);
      }
      Object.assign(props, file.endsWith(".sass") ? readSassVariables(source) : readScssVariables(source), theme.props);
    }
    const css = /\.scss$/.test(file) ? stripScssComments(source) : source;
    const vars: CustomProperties = { ...readTailwindTheme(css), ...readCssVars(css) };
    const dark = Object.keys(readDarkOverrides(css)).length;
    if (dark) notes.add(`${dark} dark-theme overrides in ${basename(file)} were not read; tokens.json holds the default (light) values.`);
    const scoped = readScopedThemes(css);
    if (scoped.length) {
      const shown = scoped.slice(0, 4).join(", ") + (scoped.length > 4 ? ", …" : "");
      notes.add(`Custom properties outside :root in ${basename(file)} were not read: ${shown}. If these are separate palettes, fold them into :root or tokens.json.`);
    }
    for (const [prop, value] of Object.entries(vars)) {
      const [name, v] = prop.startsWith("--mat-sys-") ? fromMaterialSys(prop.slice(10), value) : [prop, value];
      props[name] = v;
    }
  };
  for (const file of files) {
    if (file.endsWith("angular.json")) {
      const angular = readAngularJson(file);
      for (const pkg of angular.packages) notes.add(`${pkg} is a package stylesheet and was not read.`);
      for (const style of angular.files) readStyles(style, angular.includePaths);
    } else readStyles(file, []);
  }
  return { ...toDtcg(props), notes: [...notes] };
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
  /** Reader notes (with --from). */
  notes: string[];
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
  let notes: string[] = [];
  // An Angular workspace with no tokens.json yet: read its global styles.
  if (!from?.length && !existsSync(abs(tokensPath)) && existsSync(abs("angular.json"))) from = ["angular.json"];
  if (from?.length) {
    ({ tokens, skipped, notes } = tokensFromFiles(from.map(abs)));
    put(tokensPath, JSON.stringify(tokens, null, 2) + "\n");
  } else {
    if (!existsSync(abs(tokensPath))) {
      throw new Error(`${tokensPath} not found. Run with --from <css, scss or angular.json> to create it.`);
    }
    ({ tokens, untyped } = parseDtcg(read(tokensPath)));
  }

  for (const [path, content] of Object.entries(renderAll(tokens, read, { full }))) put(path, content);
  return { changed, skipped, untyped, notes };
}
