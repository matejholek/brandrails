import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_SOURCE = fileURLToPath(new URL("../skill/brandrails-skill.md", import.meta.url));

// Agent tools only discover a skill as <skills dir>/<name>/SKILL.md.
const TARGETS: Record<string, string> = {
  claude: ".claude/skills/brandrails/SKILL.md",
  codex: ".codex/skills/brandrails/SKILL.md",
  cursor: ".cursor/skills/brandrails/SKILL.md",
};

/** Copies the bundled skill into a project so the agent picks it up. Returns the written path. */
export function installSkill(root: string, agent = "claude"): string {
  const target = TARGETS[agent];
  if (!target) throw new Error(`Unknown agent "${agent}". Use one of: ${Object.keys(TARGETS).join(", ")}`);
  const dest = join(root, target);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(SKILL_SOURCE, dest);
  return target;
}
