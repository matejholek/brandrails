# Brandrails

**Keep AI coding agents on your design system.**

Brandrails turns the design decisions already in your codebase into one `tokens.json` ([DTCG format](https://www.designtokens.org/)), generates design rules for every AI tool your team uses, and flags drift on every pull request.

> Status: early. The scaffold is here; v0.1 is being built in the open.

## What it does

1. **Reads** tokens from Tailwind v4 `@theme`, CSS custom properties and SCSS.
2. **Writes** one DTCG `tokens.json` as the single source of truth.
3. **Generates** rules for:
   - `AGENTS.md` (design section) and `CLAUDE.md` (imports `@AGENTS.md`)
   - `.cursor/rules/design.mdc`
   - `.github/copilot-instructions.md`
   - Figma Make guidelines (markdown)
   - `design/tokens.md`, the full reference with values and usage notes

   Files agents load on every request (AGENTS.md, Copilot) only list token names and point to `design/tokens.md`, so a big design system doesn't eat the context window. The Cursor rule attaches only when a UI file is involved. Pass `--full` to put full tables everywhere.
4. **Checks** each PR for hard-coded colours and px values, and for rules files that are stale compared with `tokens.json`.

## Two ways to use it

### As an agent skill

Copy [`skill/SKILL.md`](skill/SKILL.md) into your agent's skills folder (Claude Code, Cursor or Codex) and ask it to "make this repo AI-ready".

### As a GitHub Action

```yaml
on: pull_request
jobs:
  brandrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: matejholek/brandrails@v1
        with:
          command: check
```

### CLI

Not on npm yet. From a clone of this repo: `npm ci && npm run build`, then:

```bash
# First run: read tokens from your CSS and create tokens.json, the rules files and design/tokens.md
node bin/brandrails.js generate --root ../your-app --from src/index.css

# After that, edit tokens.json and regenerate. A second run with no changes writes nothing.
node bin/brandrails.js generate --root ../your-app
```

`brandrails check` (drift check) is next.

## Roadmap

- **v0.1** — React + Tailwind v4 and plain CSS / SCSS readers, the rules writers, drift check
- **v0.2** — Angular (Material 3 / SCSS maps) example, Figma variables compare
- **v0.3** — Vue and web components

## License

[MIT](LICENSE) © Matej Holek
