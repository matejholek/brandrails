import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDtcg } from "../dtcg.js";
import { RULES_FILES, renderAll } from "../generate.js";
import { nearestColourToken } from "./nearest.js";
import { addedLines, DEFAULT_IGNORE, globToRegExp, scanLines, type Finding } from "./scan.js";

export interface CheckOptions {
  root: string;
  tokens: string;
  /** Branch or commit to compare against; added lines since the merge base are scanned. */
  base: string;
  /** Extra globs to skip, on top of build output. */
  ignore?: string[];
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

/** `main` locally, or `origin/main` in a CI checkout that only has remote branches. */
function resolveBase(root: string, base: string): string {
  for (const ref of [base, `origin/${base}`]) {
    try {
      git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
      return ref;
    } catch {}
  }
  throw new Error(`Base "${base}" not found. In GitHub Actions, check out with fetch-depth: 0.`);
}

/** Rules files that differ from what `brandrails generate` would write now. */
export function staleFiles(root: string, tokensPath: string): string[] {
  const abs = (p: string) => join(root, p);
  if (!existsSync(abs(tokensPath))) return [];
  const read = (p: string) => (existsSync(abs(p)) ? readFileSync(abs(p), "utf8") : "");
  const { tokens } = parseDtcg(read(tokensPath));
  // Match whichever layout the repo was generated with.
  const full = read("AGENTS.md").includes("| Token | Value | Notes |");
  return Object.entries(renderAll(tokens, read, { full }))
    .filter(([path, content]) => read(path) !== content)
    .map(([path]) => path);
}

export function check({ root, tokens, base, ignore = [] }: CheckOptions): Finding[] {
  const ref = resolveBase(root, base);
  const diff = git(root, ["diff", "--relative", "--unified=0", "--no-color", "--no-ext-diff", "--diff-filter=AM", `${ref}...HEAD`]);
  const generated = new Set<string>([...RULES_FILES, tokens]);
  const ignored = [...DEFAULT_IGNORE, ...ignore].map(globToRegExp);
  const nearest = existsSync(join(root, tokens)) ? nearestColourToken(parseDtcg(readFileSync(join(root, tokens), "utf8")).tokens) : undefined;
  const findings = scanLines(addedLines(diff), (file) => generated.has(file) || ignored.some((re) => re.test(file)), nearest);
  for (const path of staleFiles(root, tokens)) {
    findings.push({ file: path, line: 1, rule: "stale-rules", message: `Out of date with ${tokens}: run brandrails generate` });
  }
  return findings;
}
