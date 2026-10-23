import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { check } from "../src/check/index.js";
import { addedLines, globToRegExp, scanLines } from "../src/check/scan.js";
import { generate } from "../src/generate.js";

const scan = (file: string, ...lines: string[]) =>
  scanLines(lines.map((text, i) => ({ file, line: i + 1, text })));

describe("scanner", () => {
  it("flags hard-coded colours and px spacing", () => {
    const found = scan(
      "src/Card.css",
      "  color: #3b82f6;",
      "  background: rgb(12 34 56 / 0.5);",
      "  padding: 12px 0;",
      "  border-radius: 6px;",
    );
    expect(found.map((f) => f.rule)).toEqual(["hex-colour", "colour-function", "px-spacing", "px-spacing"]);
  });

  it("flags Tailwind arbitrary values in components", () => {
    const found = scan("src/App.tsx", '<div className="bg-[#fafafa] p-[13px] rounded-[6px]">');
    expect(found.map((f) => f.message)).toEqual([
      "Hard-coded #fafafa: use a colour token",
      "Hard-coded p-[13px]: use a spacing or radius token",
      "Hard-coded rounded-[6px]: use a spacing or radius token",
    ]);
  });

  it("allows tokens, token definitions, anchors, 0px, border widths and ignore comments", () => {
    expect(
      scan(
        "src/site.css",
        "  color: var(--color-accent);",
        "  --color-accent: #4f46e5;",
        "  background: rgb(var(--rgb-ink) / 0.1);",
        "  margin: 0px;",
        "  border-width: 6px;",
        "  outline: 1px solid red; /* brandrails-ignore */",
        "  color: #bada55; /* brandrails-ignore: brand partner logo */",
      ),
    ).toEqual([]);
    expect(scan("src/Nav.tsx", '<a href="#main">Skip</a>', "<p>&#123;</p>", "<span>white<br>#ffffff</span>")).toEqual([]);
    expect(scan("src/a.css", ".x { border-bottom: 3px solid; border-top: 3px solid var(--c); }")).toEqual([]);
  });

  it("matches ignore globs", () => {
    expect(globToRegExp("public/**").test("public/styles/site.css")).toBe(true);
    expect(globToRegExp("**/*.bundle.*").test("public/styles/site.bundle.css")).toBe(true);
    expect(globToRegExp("**/*.bundle.*").test("site.bundle.css")).toBe(true);
    expect(globToRegExp("src/*.css").test("src/a/b.css")).toBe(false);
  });

  it("ignores non-style files", () => {
    expect(scan("README.md", "color: #3b82f6")).toEqual([]);
  });

  it("maps added lines to new-file line numbers", () => {
    const diff = [
      "diff --git a/a.css b/a.css",
      "--- a/a.css",
      "+++ b/a.css",
      "@@ -3,0 +4,2 @@",
      "+.a { color: #fff; }",
      "+.b { color: var(--x); }",
    ].join("\n");
    expect(addedLines(diff)).toEqual([
      { file: "a.css", line: 4, text: ".a { color: #fff; }" },
      { file: "a.css", line: 5, text: ".b { color: var(--x); }" },
    ]);
  });
});

describe("check on a git repo", () => {
  const sh = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, stdio: "pipe" });

  function repo(): string {
    const root = mkdtempSync(join(tmpdir(), "brandrails-check-"));
    cpSync(new URL("../examples/react-tailwind", import.meta.url), root, { recursive: true });
    generate({ root, tokens: "tokens.json", from: ["src/index.css"] });
    sh(root, "init", "-q", "-b", "main");
    sh(root, "-c", "user.email=t@t", "-c", "user.name=t", "add", "-A");
    sh(root, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "base");
    sh(root, "checkout", "-q", "-b", "feature");
    return root;
  }
  const commit = (root: string) => {
    sh(root, "add", "-A");
    sh(root, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "change");
  };

  it("fails a branch that adds color: #3b82f6", () => {
    const root = repo();
    writeFileSync(join(root, "src/button.css"), ".button {\n  color: #3b82f6;\n}\n");
    commit(root);
    expect(check({ root, tokens: "tokens.json", base: "main" })).toEqual([
      { file: "src/button.css", line: 2, rule: "hex-colour", message: "Hard-coded #3b82f6: use a colour token" },
    ]);
  });

  it("passes when the change uses a token", () => {
    const root = repo();
    writeFileSync(join(root, "src/button.css"), ".button {\n  color: var(--color-accent);\n}\n");
    commit(root);
    expect(check({ root, tokens: "tokens.json", base: "main" })).toEqual([]);
  });

  it("flags rules files left stale after tokens.json changes", () => {
    const root = repo();
    const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
    tokens.color.accent.$value = "#7c3aed";
    writeFileSync(join(root, "tokens.json"), JSON.stringify(tokens, null, 2));
    commit(root);
    const stale = check({ root, tokens: "tokens.json", base: "main" }).map((f) => f.file);
    expect(stale).toEqual([".cursor/rules/design.mdc", "design/figma-make-guidelines.md", "design/tokens.md"]);
  });
});
