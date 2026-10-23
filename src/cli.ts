import { parseArgs } from "node:util";
import { generate } from "./generate.js";

const USAGE = `Usage:
  brandrails generate [--tokens tokens.json] [--from src/index.css ...] [--root .] [--full]
  brandrails check    (coming in v0.1)`;

export function main(argv: string[]): number {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    return 0;
  }
  const { values } = parseArgs({
    args: rest,
    options: {
      tokens: { type: "string", default: "tokens.json" },
      from: { type: "string", multiple: true },
      root: { type: "string", default: "." },
      base: { type: "string" },
      full: { type: "boolean", default: false },
    },
  });

  switch (command) {
    case "generate": {
      const { changed, skipped, untyped } = generate({ root: values.root!, tokens: values.tokens!, from: values.from, full: values.full });
      console.log(changed.length ? changed.map((p) => `wrote ${p}`).join("\n") : "Everything is up to date.");
      if (skipped.length) {
        const prefixes = [...new Set(skipped.map((p) => p.slice(2).split("-")[0]))];
        console.log(`skipped ${skipped.length} custom properties outside known groups (${prefixes.join(", ")})`);
      }
      if (untyped.length) {
        console.log(`warning: ${untyped.length} tokens have no $type: ${untyped.slice(0, 5).join(", ")}${untyped.length > 5 ? ", …" : ""}`);
      }
      return 0;
    }
    case "check":
      console.error("brandrails check: not implemented yet (v0.1 in progress).");
      return 1;
    default:
      console.error(`Unknown command: ${command}\n\n${USAGE}`);
      return 1;
  }
}
