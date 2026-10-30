# Brandrails

**Keep AI coding agents on your design system.**

Brandrails turns the design decisions already in your codebase into one `tokens.json` ([DTCG format](https://www.designtokens.org/)), generates design rules for every AI tool your team uses, and flags drift on every pull request.

> Status: v0.3, early. Feedback and issues welcome. See the [changelog](CHANGELOG.md).

## What it does

1. **Reads** tokens from Tailwind v4 `@theme`, CSS custom properties (including shadcn/ui themes such as `--primary: 72 80% 55%`), SCSS variables and maps, and Angular (`angular.json` styles, Angular Material 3 themes). It tells you what it left out: dark-theme overrides and page-scoped palettes outside `:root`.
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

The skill is the folder [`skill/brandrails/`](skill/brandrails/SKILL.md), laid out the way agents discover skills. Install it with:

```bash
npx brandrails skill                  # Claude Code: .claude/skills/brandrails/SKILL.md
npx brandrails skill --agent codex    # or cursor
```

or copy the folder yourself, with no renaming:

```bash
cp -r node_modules/brandrails/skill/brandrails .claude/skills/
```

Then run `/brandrails` in your agent, or ask it to "make this repo AI-ready".

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

# SCSS and Angular work the same way
npx brandrails generate --from src/styles.scss
npx brandrails generate --from angular.json   # or just `generate` in an Angular workspace with no tokens.json yet

# After that, edit tokens.json and regenerate. A second run with no changes writes nothing.
npx brandrails generate
```

Check a branch for design drift (what the GitHub Action runs on every PR):

```bash
npx brandrails check --base main --ignore "public/**"
```

It scans only lines added since `main` and fails on hard-coded hex, `rgb()`/`hsl()` colours and px spacing or radius (CSS declarations, Tailwind values like `p-[13px]` and Angular bindings like `[style.padding.px]`). Token definitions (`--color-x: #fff`, `$color-x: #fff`, SCSS map entries), `0px`, border widths and build output are allowed. It also fails when the rules files are out of date with `tokens.json`. Put `brandrails-ignore` in a comment on a line to allow it.

For a hard-coded colour close to a token, the message names it:

```
src/Hero.tsx:5  Hard-coded #c8ff00: use `color.lime-light`, the closest colour token
```

## Roadmap

- **v0.1** — React + Tailwind v4 and plain CSS readers, the rules writers, drift check
- **v0.2** — Angular (`angular.json`, Material 3 themes), SCSS variables and maps, skill shipped as `skill/brandrails/SKILL.md`
- **v0.3** — shadcn/ui and Lovable themes, nearest-token suggestions in `check`
- **v0.4** — Figma variables compare, Vue and web components

## License

[MIT](LICENSE) © Matej Holek
