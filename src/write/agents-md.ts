import type { TokenGroup } from "../dtcg.js";
import { renderRules, upsertSection, type RenderOptions } from "./rules.js";

export function renderDesignSection(tokens: TokenGroup, { full }: RenderOptions = {}): string {
  return upsertSection("", renderRules(tokens, 2, full ? "table" : "index")).trimEnd();
}

export function writeAgentsMd(existing: string, tokens: TokenGroup, { full }: RenderOptions = {}): string {
  return upsertSection(existing, renderRules(tokens, 2, full ? "table" : "index"));
}
