import { parseArgs } from "node:util";
import { generate } from "./generate.js";

const USAGE = `Usage:
  brandrails generate [--tokens tokens.json] [--from src/index.css ...] [--root .]
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
    },
  });

  switch (command) {
    case "generate": {
      const changed = generate({ root: values.root!, tokens: values.tokens!, from: values.from });
      console.log(changed.length ? changed.map((p) => `wrote ${p}`).join("\n") : "Everything is up to date.");
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
