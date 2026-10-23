import type { TokenGroup } from "../dtcg.js";
import { renderRules, type RenderOptions } from "./rules.js";

/** design/tokens.md: every token with its value and usage note. Brandrails owns this whole file. */
export function writeReference(tokens: TokenGroup, { full }: RenderOptions = {}): string {
  return renderRules(tokens, 1, full ? "table" : "list") + "\n";
}
