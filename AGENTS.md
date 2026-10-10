# opencode-caveman — agent notes

OpenCode plugin packaging of the Caveman rules (upstream: `JuliusBrussee/caveman`, MIT).

## Commands

- Test: `npm test` (node `--test`, no runtime dependencies).
- Format: `npm run format` / `npm run format:check` (Prettier; `skills/`, `agents/`, `NOTICE.md`, `LICENSE` are excluded and must stay byte-identical).
- Pre-commit hook: wired automatically by `npm install` (`prepare` script); manual fallback is `git config core.hooksPath .githooks`. It runs `npm test`.
- Local use: opening OpenCode in this repo loads `.opencode/plugins/caveman/index.mjs` (V2 auto-discovery, plus the root `opencode.json` `plugins` entry).

## Rules

- `skills/` and `agents/` are vendored from upstream, not authored here. Do not edit them locally. Re-vendor from the pinned upstream commit in NOTICE.md and update the SHA there when syncing.
- Runtime code is `hooks/*.cjs` plus `.opencode/plugins/caveman/index.mjs`. The `.mjs` bridges to CommonJS with `createRequire` so it loads with no build step.
- The default export is dual-shape: V2 validates `id` plus `setup(ctx)`, V1 (1.18.29+) calls `server()` for the legacy hooks. Keep exactly one plugin-shaped export; OpenCode's legacy loader calls every named export of a plugin module as a plugin, so helpers live in `caveman-frontmatter.cjs`.
- The injected ruleset is the active mode's vendored skill, loaded whole with frontmatter stripped, under a `CAVEMAN MODE ACTIVE — mode: <mode>` banner; `off` injects nothing. Modes are caveman (default), ultracave, megacave; legacy level names (lite/full/ultra/wenyan*) resolve in `hooks/caveman-config.cjs`.
- State file is `~/.config/opencode/.caveman-active` (XDG/`OPENCODE_CONFIG_DIR` aware). Never write state during tests outside a temp dir.
