/** CLAUDE.md only needs to import AGENTS.md; existing content is kept. */
export function writeClaudeMd(existing: string): string {
  if (/^@AGENTS\.md\s*$/m.test(existing)) return existing;
  const base = existing.trimEnd();
  return (base ? `${base}\n\n` : "") + "@AGENTS.md\n";
}
