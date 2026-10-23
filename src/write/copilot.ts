import type { TokenGroup } from "../dtcg.js";
import { renderRules, upsertSection } from "./rules.js";

export function writeCopilot(existing: string, tokens: TokenGroup): string {
  return upsertSection(existing, renderRules(tokens));
}
