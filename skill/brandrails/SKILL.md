---
name: brandrails
description: Set up a project so AI coding agents stay on its design system. Scans the codebase for design tokens (CSS custom properties, Tailwind v4 @theme, SCSS variables and maps, Angular Material themes), proposes a single DTCG tokens.json for the user to approve, then generates design rules for AGENTS.md, CLAUDE.md, .cursor/rules/design.mdc, .github/copilot-instructions.md and Figma Make guidelines. Use when asked to "make this repo AI-ready", "set up design tokens", "generate design rules for agents", "stop the AI hard-coding colours", or to add the Brandrails drift check to CI.
---

# Brandrails

Turn the design decisions already in a codebase into one source of truth, then teach every AI agent that touches the repo to use it.

## Steps

1. **Scan.** Find token sources, in this order:
   - Tailwind v4 `@theme { ... }` blocks in CSS files
   - `:root` (and `[data-theme]` / `.dark`) CSS custom properties
   - SCSS variables and maps (`$color-*`, `$colors: (…)`, `map.get`)
   - Angular: the global `styles` in `angular.json` and the partials they `@use`; Angular Material `mat.theme()` typography, `mat.theme-overrides()` and `--mat-sys-*` values. Palettes like `mat.$azure-palette` are computed at build time, so tell the user to add overrides if they want those colours as tokens
   - an existing `tokens.json` (DTCG) — if present, treat it as the source and skip to step 3

   Read tokens only. Do not parse components; leave those to Figma and Storybook tooling.

   `npx brandrails generate --from <file>` does this deterministically for CSS, SCSS and `angular.json` (in an Angular workspace with no `tokens.json`, plain `npx brandrails generate` reads `angular.json`). Prefer it over hand-parsing, then review its output with the user.

2. **Propose `tokens.json`.** Write a DTCG file (W3C Design Tokens format: `$value`, `$type`, `$description`, groups by category: `color`, `dimension`/`spacing`, `typography`, `radius`, `shadow`, `motion`). Show the user a short summary: how many tokens per group, duplicates merged, values that had no name. Wait for approval before writing.

3. **Generate rules.** From the approved `tokens.json`, write:
   - `AGENTS.md` — a `## Design system` section (create the file if missing, otherwise replace only that section)
   - `CLAUDE.md` — make sure it contains `@AGENTS.md`
   - `.cursor/rules/design.mdc`
   - `.github/copilot-instructions.md` — a design section
   - `design/figma-make-guidelines.md`

   Every file says the same thing: use tokens, never raw hex/rgb or px; name the token to use for common needs (text, surface, border, accent, spacing steps, radius).

4. **Wire the check (optional).** Offer to add `.github/workflows/brandrails.yml`:

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

## Rules

- Never overwrite a user's hand-written content outside the sections Brandrails owns.
- A second run on an unchanged `tokens.json` must produce no diff.
- Keep examples neutral; do not invent brand names or sample data from the user's domain.
