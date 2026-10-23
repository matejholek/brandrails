# Changelog

## 0.2.0

### Changed

- The skill now ships as `skill/brandrails/SKILL.md`, the layout agents expect. Copy the `skill/brandrails` folder into `.claude/skills/` (or `.codex/skills/`, `.cursor/skills/`) as-is and run `/brandrails`; no renaming. `npx brandrails skill` copies the whole folder.

### Added

- Angular support:
  - `--from angular.json` reads the global `styles` of every project in the workspace, following local `@use` / `@forward` / `@import` partials and `stylePreprocessorOptions.includePaths`.
  - In an Angular workspace with no `tokens.json`, `brandrails generate` reads `angular.json` without `--from`.
  - Angular Material 3: `mat.theme()` typography (plain/brand family, weights), `mat.theme-overrides()` and `--mat-sys-*` values. Colour roles become `color.*`, `corner-*` becomes `radius.*`, `level0…5` becomes `shadow.*`. Palettes such as `mat.$azure-palette` and prebuilt theme CSS are reported as notes, since their colours are computed at build time.
  - `brandrails check` flags `[style.padding.px]`-style unit bindings in templates.
- SCSS reader: top-level `$variables` and nested maps (`$colors: (primary: #fff)` becomes `color.primary`), `!default`, `$var` and `map.get()` references as token aliases, plural group names (`$colors`, `$spacers`, `$radii`, …).
- `html { … }` custom properties are read like `:root`.
- `brandrails check` no longer flags SCSS variable definitions or map entries in `.scss` files.
- Example project: `examples/angular-material`.

## 0.1.0

- First release: Tailwind v4 `@theme` and CSS custom property readers, DTCG `tokens.json`, rules for AGENTS.md, CLAUDE.md, Cursor, Copilot and Figma Make, `brandrails check` and the GitHub Action, and the agent skill.
