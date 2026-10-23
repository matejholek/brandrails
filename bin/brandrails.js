#!/usr/bin/env node
// Placeholder CLI until the readers, writers and drift check land in src/.
const [command] = process.argv.slice(2);
const commands = ["generate", "check"];

if (!command || !commands.includes(command)) {
  console.log("Usage: brandrails <generate|check> [options]");
  process.exit(command ? 1 : 0);
}

console.error(`brandrails ${command}: not implemented yet (v0.1 in progress).`);
process.exit(1);
