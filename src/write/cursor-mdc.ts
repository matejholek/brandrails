import type { TokenGroup } from "../dtcg.js";
import { renderRules } from "./rules.js";

/** Brandrails owns this whole file. */
export function writeCursorMdc(tokens: TokenGroup): string {
  return [
    "---",
    "description: Design system tokens. Use them for all UI styling.",
    "globs: \"**/*.{css,scss,html,jsx,tsx,vue,svelte}\"",
    "alwaysApply: true",
    "---",
    "",
    renderRules(tokens, 1),
    "",
  ].join("\n");
}
