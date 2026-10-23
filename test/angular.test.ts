import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanLines } from "../src/check/scan.js";
import { flatten } from "../src/dtcg.js";
import { generate, tokensFromFiles } from "../src/generate.js";
import { readMaterialTheme } from "../src/read/material.js";
import { readScssVariables } from "../src/read/scss.js";

const example = new URL("../examples/angular-material", import.meta.url);

function sampleProject(): string {
  const root = mkdtempSync(join(tmpdir(), "brandrails-ng-"));
  cpSync(example, root, { recursive: true });
  return root;
}

describe("SCSS reader", () => {
  it("reads top-level variables and maps, not variables inside rules", () => {
    const props = readScssVariables(`
      // line comment with $color-x: red;
      $colors: ("primary": #2563eb, text: (base: #111, muted: #666));
      $radius-md: 8px !default;
      $color-link: $color-primary;
      $space-gap: #{$radius-md};
      .btn { $color-local: #000; }
      $shadows: (card: 0 1px 2px rgba(0, 0, 0, 0.1));
    `);
    expect(props).toEqual({
      "--color-primary": "#2563eb",
      "--color-text-base": "#111",
      "--color-text-muted": "#666",
      "--radius-md": "8px",
      "--color-link": "var(--color-primary)",
      "--space-gap": "#{$radius-md}",
      "--shadow-card": "0 1px 2px rgba(0, 0, 0, 0.1)",
    });
  });
});

describe("Angular Material", () => {
  it("reads typography, overrides and --mat-sys-* values, and names the palettes", () => {
    const { props, palettes } = readMaterialTheme(`
      html {
        @include mat.theme((color: (primary: mat.$violet-palette, tertiary: mat.$rose-palette), typography: Roboto));
        @include mat.theme-overrides((primary: #6750a4, corner-full: 9999px, body-large-size: 16px));
        --mat-sys-on-primary: #ffffff;
      }
    `);
    expect(palettes).toEqual(["mat.$violet-palette", "mat.$rose-palette"]);
    expect(props).toEqual({
      "--font-family-plain": "Roboto",
      "--color-primary": "#6750a4",
      "--radius-full": "9999px",
      "--mat-sys-body-large-size": "16px",
      "--color-on-primary": "#ffffff",
    });
  });
});

describe("angular.json", () => {
  it("reads global styles and their partials into tokens", () => {
    const { tokens, notes, skipped } = tokensFromFiles([join(example.pathname, "angular.json")]);
    const values = Object.fromEntries(flatten(tokens).map((t) => [t.path, t.value]));
    expect(values).toMatchObject({
      "color.ink": "#1c1917",
      "color.accent": "{color.ink}",
      "color.primary": "#4f46e5",
      "color.surface": "#ffffff",
      "spacing.4": "1rem",
      "radius.sm": "4px",
      "radius.medium": "12px",
      "shadow.level1": "0 1px 2px rgb(0 0 0 / 0.06)",
      "font.family.plain": "Roboto",
      "font.family.brand": "Inter",
      "font.family.mono": '"JetBrains Mono", ui-monospace, monospace',
      "duration.fast": "120ms",
    });
    expect(skipped).toEqual([]);
    expect(notes).toEqual([
      "@angular/material/prebuilt-themes/azure-blue.css is a package stylesheet and was not read.",
      "Angular Material colours come from mat.$azure-palette at build time; add mat.theme-overrides() or --mat-sys-* values to capture them as tokens.",
    ]);
  });

  it("is picked up by generate when there is no tokens.json yet", () => {
    const root = sampleProject();
    const { changed } = generate({ root, tokens: "tokens.json" });
    expect(changed[0]).toBe("tokens.json");
    expect(readFileSync(join(root, "design/tokens.md"), "utf8")).toContain("primary=#4f46e5");
    expect(generate({ root, tokens: "tokens.json" }).changed).toEqual([]);
  });
});

describe("check on Angular files", () => {
  const scan = (file: string, ...lines: string[]) => scanLines(lines.map((text, i) => ({ file, line: i + 1, text })));

  it("allows SCSS token definitions and map entries", () => {
    expect(scan("src/styles/_tokens.scss", "$color-ink: #1c1917;", "  primary: #4f46e5,", "  corner-medium: 12px")).toEqual([]);
  });

  it("still flags hard-coded values in component styles and templates", () => {
    const found = scan(
      "src/app/card.component.scss",
      "  padding: 12px;",
      "  color: #3b82f6;",
    ).concat(scan("src/app/card.component.html", '<div [style.padding.px]="12">'));
    expect(found.map((f) => f.rule)).toEqual(["px-spacing", "hex-colour", "px-spacing"]);
  });
});
