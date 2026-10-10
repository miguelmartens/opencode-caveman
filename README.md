# opencode-caveman

**why use many token when few do trick** — caveman for OpenCode.

This is an unofficial OpenCode plugin that turns caveman mode on inside
OpenCode: the ruleset is injected into every turn, the `/caveman` commands switch
mode or turn it off, and the caveman skills and cavecrew subagents ship with it.
It is built on the [Caveman rules](https://github.com/JuliusBrussee/caveman) by
Julius Brussee (MIT). Not affiliated with or endorsed by the upstream project.

**Compatible with Caveman [`v3.2.0`](https://github.com/JuliusBrussee/caveman/releases/tag/v3.2.0)** —
the skills and cavecrew subagents are vendored verbatim from that release (see
[NOTICE.md](./NOTICE.md)). Level names from older releases (`lite`, `full`,
`ultra`, `wenyan*`) still resolve.

Caveman is an ultra-compressed output mode: drop articles, filler, pleasantries
and hedging; keep every technical fact, code block, and error string exact.

## Prerequisites

- OpenCode: V2, or V1 from 1.18.29.
- Rules vendored from Caveman **v3.2.0** (skills and cavecrew agents; see [NOTICE.md](./NOTICE.md)).
- Optional: caveman itself, for the reading-side proxy and CLI commands (this
  plugin covers the output side only). Upstream: [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)

  ```
  npm install -g @caveman-ai/cli && caveman setup --install
  ```

  Needs Node.js 22.13+ for the CLI. This plugin works without it — it vendors
  the rules, skills, commands, and cavecrew subagents.

## Install

```
opencode plugin add @miguelmartens/opencode-caveman
```

That installs the package and adds it to your config. Or add it by hand
(global at `~/.config/opencode/opencode.json`, or per project) — V2 uses the
`plugins` key (`plugin` on V1):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@miguelmartens/opencode-caveman"]
}
```

Or run it from a checkout with no publish step — the repo ships a root
`opencode.json` that does exactly this:

```json
{ "plugins": ["./.opencode/plugins/caveman"] }
```

Restart OpenCode after changing config. The mode is active from the next
session; no extra setup.

## Commands

| Command                                      | What it does                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `/caveman`                                   | Activate caveman (default mode)                                            |
| `/caveman caveman\|ultracave\|megacave\|off` | Set the mode                                                               |
| `/caveman status`                            | Report the active mode, change nothing                                     |
| `/ultracave`, `/megacave`                    | Switch to that mode                                                        |
| legacy `lite\|full\|ultra\|wenyan*`          | Still resolve: `full`→`caveman`, `ultra`→`ultracave`, `wenyan*`→`megacave` |
| `/caveman-commit`                            | Terse Conventional Commit message for the staged changes                   |
| `/caveman-review`                            | One line per finding, severity-tagged, no praise                           |
| `/caveman-help`                              | Quick-reference card                                                       |
| say `stop caveman` or `normal mode`          | Turn caveman off                                                           |

## Modes

| Mode                | Style                                                            |
| ------------------- | ---------------------------------------------------------------- |
| `caveman` (default) | Answer first, fluff gone. Every technical fact kept              |
| `ultracave`         | Maximum compression: fragments, one word when one word is enough |
| `megacave`          | Classical Chinese 文言文; technical terms and errors verbatim    |

## How it works

On OpenCode V2 the plugin uses the plugin context; on V1 (1.18.29+) it uses the
legacy hooks with the same behavior.

| V2 hook                                  | Effect                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `command` / `skill` / `agent` transforms | Register the commands, the bundled skills, and the cavecrew subagents                                          |
| `session.hook("context")`                | Injects the active mode's ruleset into every turn's system prompt — no drift, survives `/clear` and compaction |
| command `execute`                        | Persists `/caveman <mode>` (or `/ultracave`, `/megacave`) to `~/.config/opencode/.caveman-active`              |
| `session.hook("prompt")`                 | Turns caveman off on a standalone `stop caveman` / `normal mode` message                                       |

The injected ruleset is the active mode's vendored skill, loaded whole with the
frontmatter stripped, under a `CAVEMAN MODE ACTIVE — mode: <mode>` banner — so
mode-specific rules and the shared rules (negation handling, Auto-Clarity,
Boundaries) always apply together. `off` injects nothing.

### cavecrew subagents

Three compressed subagents, registered for OpenCode's task tool:

| Agent                   | Job                                            | Edits   |
| ----------------------- | ---------------------------------------------- | ------- |
| `cavecrew-investigator` | Locate code, return `path:line` citations only | denied  |
| `cavecrew-builder`      | Surgical 1–2 file edit, returns a diff receipt | allowed |
| `cavecrew-reviewer`     | Diff review, one line per finding              | denied  |

They inherit your configured model (upstream pins Haiku; OpenCode users run
mixed providers, so the pin is dropped here).

## Configuration

Default mode resolution, highest priority first:

1. `CAVEMAN_DEFAULT_MODE` environment variable (`caveman`, `ultracave`, `megacave`, or `off`; legacy `lite`/`full`/`ultra`/`wenyan*` still resolve)
2. `~/.config/caveman/config.json`:

```json
{ "defaultMode": "ultracave" }
```

3. `caveman`

Set `"off"` as the default to disable auto-activation; `/caveman` still works.
`/caveman <mode>` persists until changed, and `off` persists too. The state
file is `$OPENCODE_CONFIG_DIR/.caveman-active` when that variable is set, else
`$XDG_CONFIG_HOME/opencode/.caveman-active`, else `~/.config/opencode/.caveman-active`.

## What is not included

- **Reading-side compression** (logs, tool output, JSON, diffs): that is the
  upstream `caveman` proxy, not a skill. Use `caveman opencode` from
  [`@caveman-ai/cli`](https://github.com/JuliusBrussee/caveman) instead; this
  plugin only owns the output side.
- `/caveman-compress`: upstream's version needs Python scripts plus an API call
  and validates its own output mechanically. The plugin does not ship a
  validator-less copy. Install upstream's skill if you want it.
- `/caveman-stats`: OpenCode reports session token usage and cost natively.
- Work-pattern skills (`investigate-first`, `lean-build`, …): agent-agnostic,
  available via upstream `npx skills add JuliusBrussee/caveman`.

If you already installed the upstream skills globally (`~/.agents/skills/`),
OpenCode will list both copies. They are independent; this package's copies are
the ones updated with the plugin.

## Development

```
npm test          # node --test, no dependencies
```

`skills/` and `agents/` are vendored verbatim from the upstream commit pinned in
`NOTICE.md`. Don't edit them here — re-vendor and update the SHA instead.

## License

MIT for this packaging. Vendored skill and agent text is MIT, © Julius Brussee;
see [NOTICE.md](./NOTICE.md). "Caveman" and the rock logo are trademarks of
Julius Brussee.
