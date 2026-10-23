import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate, RULES_FILES } from "../src/generate.js";

function sampleProject(): string {
  const root = mkdtempSync(join(tmpdir(), "brandrails-"));
  cpSync(new URL("../examples/react-tailwind", import.meta.url), root, { recursive: true });
  return root;
}

describe("generate", () => {
  it("creates tokens.json and all rules files from CSS", () => {
    const root = sampleProject();
    const { changed } = generate({ root, tokens: "tokens.json", from: ["src/index.css"] });
    expect(changed).toEqual(["tokens.json", ...RULES_FILES]);
    for (const file of RULES_FILES) {
      expect(readFileSync(join(root, file), "utf8")).toMatchSnapshot(file);
    }
  });

  it("makes no changes on a second run from tokens.json", () => {
    const root = sampleProject();
    generate({ root, tokens: "tokens.json", from: ["src/index.css"] });
    expect(generate({ root, tokens: "tokens.json" }).changed).toEqual([]);
  });

  it("keeps hand-written CLAUDE.md and AGENTS.md content", () => {
    const root = sampleProject();
    writeFileSync(join(root, "CLAUDE.md"), "Prefer small PRs.\n");
    writeFileSync(join(root, "AGENTS.md"), "# Agents\n\nRun tests first.\n");
    generate({ root, tokens: "tokens.json", from: ["src/index.css"] });
    expect(readFileSync(join(root, "CLAUDE.md"), "utf8")).toBe("Prefer small PRs.\n\n@AGENTS.md\n");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toMatch(/^# Agents\n\nRun tests first\.\n\n<!-- brandrails:start -->/);
  });

  it("explains how to start when tokens.json is missing", () => {
    expect(() => generate({ root: sampleProject(), tokens: "tokens.json" })).toThrow(/--from/);
  });
});
