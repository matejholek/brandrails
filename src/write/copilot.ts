import type { TokenGroup } from "../dtcg.js";
import { renderRules, upsertSection, type RenderOptions } from "./rules.js";

export function writeCopilot(existing: string, tokens: TokenGroup, { full }: RenderOptions = {}): string {
  return upsertSection(existing, renderRules(tokens, 2, full ? "table" : "index"));
}
