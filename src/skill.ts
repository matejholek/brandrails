import { cpSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The skill ships ready to copy: a folder named after the skill with SKILL.md inside. */
export const SKILL_SOURCE = fileURLToPath(new URL("../skill/brandrails", import.meta.url));

// Agent tools discover a skill as <skills dir>/<name>/SKILL.md and expose it as /<name>.
const TARGETS: Record<string, string> = {
  claude: ".claude/skills",
  codex: ".codex/skills",
  cursor: ".cursor/skills",
};

/** Copies the bundled skill folder into a project so the agent picks it up. Returns the written SKILL.md path. */
export function installSkill(root: string, agent = "claude"): string {
  const dir = TARGETS[agent];
  if (!dir) throw new Error(`Unknown agent "${agent}". Use one of: ${Object.keys(TARGETS).join(", ")}`);
  cpSync(SKILL_SOURCE, join(root, dir, "brandrails"), { recursive: true });
  return `${dir}/brandrails/SKILL.md`;
}
