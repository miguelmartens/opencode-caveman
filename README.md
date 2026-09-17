# opencode-caveman

**why use many token when few do trick** — caveman for OpenCode.

Caveman is an ultra-compressed output mode: drop articles, filler, pleasantries
and hedging; keep every technical fact, code block, and error string exact. This
package is an unofficial OpenCode port of the
[Caveman rules](https://github.com/JuliusBrussee/caveman) by Julius Brussee
(MIT). Not affiliated with or endorsed by the upstream project.

## Install

```
opencode plugin @miguelmartens/opencode-caveman
```

That installs the package and adds it to your config. Or add it by hand
(global at `~/.config/opencode/opencode.json`, or per project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@miguelmartens/opencode-caveman"]
}
```

Or run it from a checkout with no publish step — the repo ships a root
`opencode.json` that does exactly this:

```json
{ "plugin": ["./.opencode/plugins/caveman.mjs"] }
```

Restart OpenCode after changing config. The mode is active from the next
session; no extra setup.

## Commands

| Command                                                                   | What it does                                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `/caveman`                                                                | Activate caveman at `full`                               |
| `/caveman lite\|full\|ultra\|wenyan-lite\|wenyan-full\|wenyan-ultra\|off` | Set the level (`wenyan` = `wenyan-full`)                 |
| `/caveman-commit`                                                         | Terse Conventional Commit message for the staged changes |
| `/caveman-review`                                                         | One line per finding, severity-tagged, no praise         |
| `/caveman-help`                                                           | Quick-reference card                                     |
| say `stop caveman` or `normal mode`                                       | Turn caveman off                                         |

## Levels

| Level                                          | Style                                                           |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `lite`                                         | No filler or hedging. Full sentences, professional but tight    |
| `full` (default)                               | Drop articles, fragments OK. Classic caveman                    |
| `ultra`                                        | Strictest compression; code symbols and error strings untouched |
| `wenyan-lite` / `wenyan-full` / `wenyan-ultra` | Classical Chinese registers                                     |

## How it works

| Hook                                 | Effect                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `config`                             | Registers the commands, the bundled skills, and the cavecrew subagents                                          |
| `experimental.chat.system.transform` | Injects the level-filtered ruleset into every turn's system prompt — no drift, survives `/clear` and compaction |
| `command.execute.before`             | Persists `/caveman <level>` to `~/.config/opencode/.caveman-active`                                             |
| `chat.message`                       | Turns caveman off on a standalone `stop caveman` / `normal mode` message                                        |

The injected ruleset is the vendored caveman skill filtered to the active level:
only that level's intensity-table row and worked examples survive, so
level-independent rules (negation handling, Auto-Clarity, Boundaries) always
apply.

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

Default level resolution, highest priority first:

1. `CAVEMAN_DEFAULT_MODE` environment variable (`lite`, `full`, `ultra`, `wenyan-*`, or `off`)
2. `~/.config/caveman/config.json`:

```json
{ "defaultMode": "ultra" }
```

3. `full`

Set `"off"` as the default to disable auto-activation; `/caveman` still works.
`/caveman <level>` persists until changed, and `off` persists too. The state
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
