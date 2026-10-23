import type { TokenGroup } from "../dtcg.js";
import { renderRules } from "./rules.js";

/** Markdown to paste into Figma Make's guidelines. Brandrails owns this whole file. */
export function writeFigmaMake(tokens: TokenGroup): string {
  return [
    "# Figma Make guidelines",
    "",
    "Paste this into your Figma Make project guidelines so generated screens use the same tokens as the code.",
    "",
    renderRules(tokens, 2),
    "",
  ].join("\n");
}
