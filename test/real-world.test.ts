import { describe, expect, it } from "vitest";
import { flatten, parseDtcg, toDtcg } from "../src/dtcg.js";
import { readCssVars } from "../src/read/css-vars.js";
import { renderRules } from "../src/write/rules.js";

// Shapes seen in a production tokens.json and its generated CSS.
describe("real-world token files", () => {
  const json = JSON.stringify({
    $description: "Site tokens",
    color: {
      $type: "color",
      black: { 900: { $value: "#212121" }, 0: { $value: "{color.white}" } },
      white: { $value: "#ffffff" },
      text: { primary: { $value: "{color.black.900}", $description: "Body copy | headings" } },
    },
    shadow: {
      hard: { $type: "shadow", $value: { color: "{color.black.900}", offsetX: "8px", offsetY: "8px", blur: "0px" } },
    },
    aspect: { square: { $value: "1" } },
  });

  it("inherits $type from groups and reports tokens without one", () => {
    const { tokens, untyped } = parseDtcg(json);
    expect(untyped).toEqual(["aspect.square"]);
    expect(flatten(tokens).find((t) => t.path === "color.black.900")?.type).toBe("color");
  });

  it("renders nested paths, composite values and descriptions", () => {
    const rules = renderRules(parseDtcg(json).tokens);
    expect(rules).toContain("| `color.text.primary` | `{color.black.900}` | Body copy \\| headings |");
    expect(rules).toContain('| `shadow.hard` | `{"color":"{color.black.900}","offsetX":"8px","offsetY":"8px","blur":"0px"}` |  |');
  });

  it("reads only the base :root, not media queries or theme overrides", () => {
    const css = `
      :root { --radius-default: 10px; --color-white: #fff; --color-text: var(--color-white); }
      @media (min-width: 768px) { :root { --radius-default: 15px; } }
      :root[data-theme="dark"] { --color-text: #000; }
      @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --color-text: #000; } }
    `;
    const props = readCssVars(css);
    expect(props["--radius-default"]).toBe("10px");
    const { tokens } = toDtcg(props);
    expect(tokens.color).toMatchObject({ text: { $value: "{color.white}" } });
  });

  it("splits font family and weight and lists skipped properties", () => {
    const { tokens, skipped } = toDtcg({ "--font-family-text": "Aleo, serif", "--font-weight-bold": "700", "--layout-gutter": "24px" });
    expect(tokens.font).toMatchObject({ family: { text: { $type: "fontFamily" } }, weight: { bold: { $type: "fontWeight" } } });
    expect(skipped).toEqual(["--layout-gutter"]);
  });
});
