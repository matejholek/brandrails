import { describe, expect, it } from "vitest";
import { nearestColourToken, parseColour } from "../src/check/nearest.js";
import { scanLines } from "../src/check/scan.js";

const tokens = {
  color: {
    $type: "color",
    primary: { $value: "hsl(72 80% 55%)" },
    ring: { $value: "{color.primary}" },
    foreground: { $value: "#1a1a1f" },
    accent: { $value: "rgb(153 82 224)" },
    brand: { $value: "oklch(0.7 0.2 120)" },
  },
};

describe("nearest colour token", () => {
  it("parses hex, rgb() and hsl() in both syntaxes", () => {
    expect(parseColour("#fff")).toEqual([1, 1, 1]);
    expect(parseColour("#00000080")).toEqual([0, 0, 0]);
    expect(parseColour("rgba(255, 0, 0, .5)")).toEqual([1, 0, 0]);
    expect(parseColour("hsl(0 100% 50%)")).toEqual([1, 0, 0]);
    expect(parseColour("hsl(120, 100%, 25% / .4)")?.map((c) => Math.round(c * 255))).toEqual([0, 128, 0]);
    expect(parseColour("oklch(0.7 0.2 120)")).toBeUndefined();
  });

  it("names the closest token, preferring a base name over its aliases", () => {
    const nearest = nearestColourToken(tokens);
    expect(nearest("#c8ff00")).toBe("color.primary");
    expect(nearest("#C8F135")).toBe("color.primary");
    expect(nearest("#0a0a0a")).toBe("color.foreground");
    expect(nearest("hsl(270, 70%, 60%)")).toBe("color.accent");
  });

  it("says nothing when no token is close", () => {
    expect(nearestColourToken(tokens)("#e1523f")).toBeUndefined();
    expect(nearestColourToken({})("#000")).toBeUndefined();
  });

  it("puts the suggestion in the check message", () => {
    const findings = scanLines(
      [{ file: "src/Hero.tsx", line: 3, text: `<a className="bg-[#c8ff00] text-[#e1523f]" style={{ color: "rgb(150, 80, 220)" }}>` }],
      () => false,
      nearestColourToken(tokens),
    );
    expect(findings.map((f) => f.message)).toEqual([
      "Hard-coded #c8ff00: use `color.primary`, the closest colour token",
      "Hard-coded #e1523f: use a colour token",
      "Hard-coded rgb() colour: use `color.accent`, the closest colour token",
    ]);
  });
});
