import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { flatten } from "../src/dtcg.js";
import { tokensFromFiles } from "../src/generate.js";
import { scssDependencies } from "../src/read/scss.js";

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "brandrails-sass-"));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(root, name), body);
  return root;
}

describe("partials in indented .sass", () => {
  const root = project({
    "_colors.sass": "$brand: #0a66ff\n",
    "_spacing.sass": "$space-sm: 8px\n",
    "_radius.sass": "$radius-md: 6px\n",
    "styles.sass": [
      '@use "colors"',
      "@import 'spacing'",
      '  @forward "radius"',
      '@use "sass:math"',
      "$primary: $brand",
      "",
    ].join("\n"),
  });

  it("follows @use, @import and @forward without semicolons", () => {
    const source = "@use \"colors\"\n@import 'spacing'\n  @forward \"radius\"\n@use \"sass:math\"\n";
    expect(scssDependencies(join(root, "styles.sass"), source)).toEqual([
      join(root, "_colors.sass"),
      join(root, "_spacing.sass"),
      join(root, "_radius.sass"),
    ]);
  });

  it("does not match across lines when a later line has a semicolon", () => {
    const source = '@use "colors"\n$label: "spacing"\n.icon\n  background: url("data:image/svg+xml;utf8,<svg></svg>")\n';
    expect(scssDependencies(join(root, "styles.sass"), source)).toEqual([join(root, "_colors.sass")]);
  });

  it("reads the partials' variables so aliases resolve", () => {
    const { tokens } = tokensFromFiles([join(root, "styles.sass")]);
    const values = Object.fromEntries(flatten(tokens).map((t) => [t.path, t.value]));
    expect(values).toMatchObject({
      "color.brand": "#0a66ff",
      "color.primary": "{color.brand}",
      "space.sm": "8px",
      "radius.md": "6px",
    });
  });
});

describe("partials in .scss", () => {
  it("still uses semicolon-terminated statements, including multi-line @use", () => {
    const root = project({ "_colors.scss": "$brand: #0a66ff;\n", "_spacing.scss": "$space-sm: 8px;\n" });
    const source = '@use "colors";\n@import\n  "spacing";\n';
    expect(scssDependencies(join(root, "styles.scss"), source)).toEqual([
      join(root, "_colors.scss"),
      join(root, "_spacing.scss"),
    ]);
  });
});
