# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2](https://github.com/miguelmartens/opencode-caveman/compare/v1.0.1...v1.0.2) (2026-09-17)


### Bug Fixes

* **ci:** declare release-please job outputs so publish runs ([#7](https://github.com/miguelmartens/opencode-caveman/issues/7)) ([942ac0b](https://github.com/miguelmartens/opencode-caveman/commit/942ac0b425a99032b759fb078631b944632c17f6))

## [1.0.1](https://github.com/miguelmartens/opencode-caveman/compare/v1.0.0...v1.0.1) (2026-09-17)


### Miscellaneous Chores

* release 1.0.1 ([376ff4a](https://github.com/miguelmartens/opencode-caveman/commit/376ff4aceb711024a7bde804581cfc05d65f44f7))

## [1.0.0] - 2026-09-17

### Added

- OpenCode plugin that injects the Caveman ruleset into every turn's system prompt at the active level.
- `/caveman`, `/caveman-commit`, `/caveman-review`, and `/caveman-help` commands.
- Levels `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan-full`, `wenyan-ultra`, plus `off`.
- Standalone `stop caveman` / `normal mode` deactivation that outranks the per-turn injection.
- Persistent level state in `~/.config/opencode/.caveman-active`.
- Default level via `CAVEMAN_DEFAULT_MODE` or `~/.config/caveman/config.json`.
- `cavecrew-investigator`, `cavecrew-builder`, and `cavecrew-reviewer` subagents.
- Skills and agent prompts vendored from upstream Caveman at commit `542442b` (MIT, see `NOTICE.md`).

[Unreleased]: https://github.com/miguelmartens/opencode-caveman/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/miguelmartens/opencode-caveman/releases/tag/v1.0.0
