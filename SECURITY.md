# Security Policy

## Supported versions

Only the latest published version of `@miguelmartens/opencode-caveman` is supported.

## Reporting a vulnerability

Report vulnerabilities through GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue for a security problem.

Include what you found, how to reproduce it, and the impact you think it has. Expect a response within a week.

## What this plugin does

For scoping reports, the plugin:

- reads and writes exactly one state file (`~/.config/opencode/.caveman-active`, or the `$OPENCODE_CONFIG_DIR` / `$XDG_CONFIG_HOME` equivalent);
- makes no network requests and spawns no processes;
- only adds prompt text, commands, skills, and subagent definitions to OpenCode's config;
- ships vendored prompt text from upstream Caveman (see `NOTICE.md`) and never executes any of it.

Reports that the injected ruleset could make an agent do something harmful without user intent are welcome as normal issues unless they demonstrate a concrete exploit.
