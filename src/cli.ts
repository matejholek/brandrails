import { parseArgs } from "node:util";
import { check } from "./check/index.js";
import { generate } from "./generate.js";

const USAGE = `Usage:
  brandrails generate [--tokens tokens.json] [--from src/index.css ...] [--root .] [--full]
  brandrails check    [--base main] [--tokens tokens.json] [--root .] [--ignore "public/**" ...]`;

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
      ignore: { type: "string", multiple: true },
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
    case "check": {
      const findings = check({ root: values.root!, tokens: values.tokens!, base: values.base || "main", ignore: values.ignore });
      const annotate = process.env.GITHUB_ACTIONS === "true";
      for (const f of findings) {
        console.log(annotate ? `::error file=${f.file},line=${f.line},title=brandrails ${f.rule}::${f.message}` : `${f.file}:${f.line}  ${f.message}`);
      }
      if (!findings.length) {
        console.log("No design drift found.");
        return 0;
      }
      console.log(`\n${findings.length} problem${findings.length === 1 ? "" : "s"}. Add a brandrails-ignore comment on a line to allow it.`);
      return 1;
    }
    default:
      console.error(`Unknown command: ${command}\n\n${USAGE}`);
      return 1;
  }
}
