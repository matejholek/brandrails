import type { TokenGroup } from "../dtcg.js";
import { renderRules, type RenderOptions } from "./rules.js";

/** Brandrails owns this whole file. Cursor attaches it only when a matching UI file is in play. */
export function writeCursorMdc(tokens: TokenGroup, { full }: RenderOptions = {}): string {
  return [
    "---",
    "description: Design system tokens. Use them for all UI styling.",
    "globs: \"**/*.{css,scss,html,jsx,tsx,vue,svelte}\"",
    "alwaysApply: false",
    "---",
    "",
    renderRules(tokens, 1, full ? "table" : "list"),
    "",
  ].join("\n");
}
