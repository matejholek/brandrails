# Brandrails

**Keep AI coding agents on your design system.**

Brandrails turns the design decisions already in your codebase into one `tokens.json` ([DTCG format](https://www.designtokens.org/)), generates design rules for every AI tool your team uses, and flags drift on every pull request.

> Status: v0.1, early. Feedback and issues welcome.

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

The skill is [`skill/brandrails-skill.md`](skill/brandrails-skill.md). Install it into your project with:

```bash
npx brandrails skill                  # Claude Code: .claude/skills/brandrails/SKILL.md
npx brandrails skill --agent codex    # or cursor
```

Then ask your agent to "make this repo AI-ready". (Agents only discover a skill saved as `SKILL.md` in a folder named after it, which is why the installed copy is renamed.)

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
          tokens: tokens.json
          ignore: "public/** legacy/**"   # optional
```

Problems show up as annotations on the PR diff.

### CLI

Node 20 or newer. Run it in your project:

```bash
# First run: read tokens from your CSS and create tokens.json, the rules files and design/tokens.md
npx brandrails generate --from src/index.css

# After that, edit tokens.json and regenerate. A second run with no changes writes nothing.
npx brandrails generate
```

Check a branch for design drift (what the GitHub Action runs on every PR):

```bash
npx brandrails check --base main --ignore "public/**"
```

It scans only lines added since `main` and fails on hard-coded hex, `rgb()`/`hsl()` colours and px spacing or radius (CSS declarations and Tailwind values like `p-[13px]`). Token definitions (`--color-x: #fff`), `0px`, border widths and build output are allowed. It also fails when the rules files are out of date with `tokens.json`. Put `brandrails-ignore` in a comment on a line to allow it.

## Roadmap

- **v0.1** — React + Tailwind v4 and plain CSS / SCSS readers, the rules writers, drift check
- **v0.2** — Angular (Material 3 / SCSS maps) example, Figma variables compare
- **v0.3** — Vue and web components

## License

[MIT](LICENSE) © Matej Holek
