import type { TokenGroup } from "../dtcg.js";
import { renderRules, upsertSection } from "./rules.js";

export function renderDesignSection(tokens: TokenGroup): string {
  return upsertSection("", renderRules(tokens)).trimEnd();
}

export function writeAgentsMd(existing: string, tokens: TokenGroup): string {
  return upsertSection(existing, renderRules(tokens));
}
