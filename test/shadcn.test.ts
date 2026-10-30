import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toDtcg } from "../src/dtcg.js";
import { generate } from "../src/generate.js";
import { readCssVars, readScopedThemes } from "../src/read/css-vars.js";
import { renderRules } from "../src/write/rules.js";

// The shadcn/ui + Tailwind v3 layout that Lovable, v0 and most shadcn projects ship.
const css = `
@tailwind base;
@layer base {
  :root { --ignored-inside-layer: 1px; }
}
:root {
  --background: 40 30% 96%;
  --primary: 72 80% 55%;
  --primary-foreground: 240 10% 10%;
  --sidebar-ring: 72 80% 55%;
  --brand: #c3e830;
  --ring: var(--brand);
  --radius: 1rem;
  --gradient-lime: linear-gradient(135deg, hsl(72, 80%, 55%), hsl(72, 85%, 65%));
  --header-height: 64px;
}
.dark { --background: 240 10% 4%; --primary: 72 80% 60%; }
.landing-page { --bg: #F2F0EA; --ink: #0E0E10; --lime: #C6F54E; }
*, ::before, ::after { --tw-ring-offset-width: 0px; --tw-ring-color: rgb(59 130 246 / .5); --tw-shadow: 0 0 #0000; }
`;

describe("shadcn/ui themes", () => {
  const { tokens, skipped } = toDtcg(readCssVars(css));

  it("reads bare HSL channels and role names as colours", () => {
    expect(tokens.color).toMatchObject({
      background: { $value: "hsl(40 30% 96%)", $type: "color" },
      primary: { $value: "hsl(72 80% 55%)" },
      "primary-foreground": { $value: "hsl(240 10% 10%)" },
      "sidebar-ring": { $value: "hsl(72 80% 55%)" },
      brand: { $value: "#c3e830" },
      ring: { $value: "{color.brand}" },
    });
  });

  it("maps a bare --radius to radius.base and keeps gradients", () => {
    expect(tokens.radius).toEqual({ base: { $value: "1rem", $type: "dimension" } });
    expect(tokens.gradient).toMatchObject({ lime: { $type: "gradient" } });
    expect(skipped).toEqual(["--header-height"]);
  });

  it("lists every role name in the index instead of collapsing it like a numeric scale", () => {
    const index = renderRules(tokens, 2, "index");
    expect(index).toContain("`color.{background,primary,primary-foreground,sidebar-ring,brand,ring}`");
    const steps = Object.fromEntries([50, 100, 200, 300, 400, 500, 900].map((n) => [n, { $value: "#888", $type: "color" }]));
    expect(renderRules({ color: { gray: steps } }, 2, "index")).toContain("`color.gray.{50,…,900}`");
  });

  it("finds page-scoped palettes but not Tailwind internals or dark overrides", () => {
    expect(readScopedThemes(css)).toEqual([".landing-page"]);
  });

  it("reports dark overrides and scoped palettes as notes", () => {
    const root = mkdtempSync(join(tmpdir(), "brandrails-"));
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/index.css"), css);
    const { notes } = generate({ root, tokens: "tokens.json", from: ["src/index.css"] });
    expect(notes).toEqual([
      "2 dark-theme overrides in index.css were not read; tokens.json holds the default (light) values.",
      "Custom properties outside :root in index.css were not read: .landing-page. If these are separate palettes, fold them into :root or tokens.json.",
    ]);
  });

  it("reads the Tailwind v4 layout, where @theme inline points at :root roles", () => {
    const v4 = `
      @theme inline { --color-primary: var(--primary); --color-background: var(--background); --radius-lg: var(--radius); }
      :root { --primary: oklch(0.205 0 0); --background: oklch(1 0 0); --radius: 0.625rem; }
    `;
    const root = mkdtempSync(join(tmpdir(), "brandrails-"));
    writeFileSync(join(root, "app.css"), v4);
    generate({ root, tokens: "tokens.json", from: ["app.css"] });
    const written = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
    expect(written.color).toEqual({
      primary: { $value: "oklch(0.205 0 0)", $type: "color" },
      background: { $value: "oklch(1 0 0)", $type: "color" },
    });
    expect(written.radius).toEqual({ lg: { $value: "{radius.base}", $type: "dimension" }, base: { $value: "0.625rem", $type: "dimension" } });
  });
});
