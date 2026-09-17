# opencode-caveman — agent notes

OpenCode plugin packaging of the Caveman rules (upstream: `JuliusBrussee/caveman`, MIT).

## Commands

- Test: `npm test` (node `--test`, no runtime dependencies).
- Format: `npm run format` / `npm run format:check` (Prettier; `skills/`, `agents/`, `NOTICE.md`, `LICENSE` are excluded and must stay byte-identical).
- Pre-commit hook: wired automatically by `npm install` (`prepare` script); manual fallback is `git config core.hooksPath .githooks`. It runs `npm test`.
- Local use: opening OpenCode in this repo loads `.opencode/plugins/caveman.mjs` through the root `opencode.json`.

## Rules

- `skills/` and `agents/` are vendored from upstream, not authored here. Do not edit them locally. Re-vendor from the pinned upstream commit in NOTICE.md and update the SHA there when syncing.
- Runtime code is `hooks/*.cjs` plus `.opencode/plugins/caveman.mjs`. The `.mjs` bridges to CommonJS with `createRequire` so it loads with no build step.
- Keep exactly one plugin-shaped export in `caveman.mjs`. OpenCode's legacy loader calls every named export of a plugin module as a plugin, so helpers live in `caveman-frontmatter.cjs`.
- The injected ruleset stays mode-filtered: only the active level's intensity-table row and worked examples survive the filter.
- State file is `~/.config/opencode/.caveman-active` (XDG/`OPENCODE_CONFIG_DIR` aware). Never write state during tests outside a temp dir.
