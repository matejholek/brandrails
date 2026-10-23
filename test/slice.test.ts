import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readCssVars } from "../src/read/css-vars.js";
import { readTailwindTheme } from "../src/read/tailwind-theme.js";
import { toDtcg } from "../src/dtcg.js";
import { writeAgentsMd } from "../src/write/agents-md.js";

const css = readFileSync(new URL("../examples/react-tailwind/src/index.css", import.meta.url), "utf8");

describe("react-tailwind example", () => {
  const props = { ...readTailwindTheme(css), ...readCssVars(css) };
  const tokens = toDtcg(props);

  it("reads @theme and :root but not theme overrides", () => {
    expect(props["--color-ink"]).toBe("#1c1917");
    expect(props["--ease-standard"]).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(Object.keys(props)).toHaveLength(20);
  });

  it("builds a DTCG tokens.json", () => {
    expect(tokens).toMatchSnapshot();
  });

  it("writes the AGENTS.md design section", () => {
    expect(writeAgentsMd("", tokens)).toMatchSnapshot();
  });

  it("is idempotent and keeps hand-written content", () => {
    const handWritten = "# Agents\n\nRun `npm test` before committing.\n";
    const once = writeAgentsMd(handWritten, tokens);
    expect(once.startsWith(handWritten.trimEnd())).toBe(true);
    expect(writeAgentsMd(once, tokens)).toBe(once);
  });
});
