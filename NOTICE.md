# Notice

This package is an unofficial OpenCode port of the Caveman rules. It is not
affiliated with, authorized by, or endorsed by Julius Brussee or the
`JuliusBrussee/caveman` project.

"Caveman" and the rock logo are trademarks of Julius Brussee. The name is used
here descriptively, to identify the rules that were adapted.

## Vendored content

The following files are vendored verbatim from
<https://github.com/JuliusBrussee/caveman> at commit
`542442bab314973709f95b85b1ac0b3f6f5b5dc6` (2026-09-17), except that the
Claude-specific `model:` line was removed from the vendored agent frontmatter
so each subagent inherits the user's configured OpenCode provider:

- `skills/caveman/SKILL.md`
- `skills/caveman-commit/SKILL.md`
- `skills/caveman-review/SKILL.md`
- `skills/caveman-help/SKILL.md`
- `agents/cavecrew-investigator.md`
- `agents/cavecrew-builder.md`
- `agents/cavecrew-reviewer.md`

These paths are covered by the upstream MIT license reproduced below. All
other files in this repository are original work under the root `LICENSE`.

## Upstream license

Scope note: this MIT license covers this repository except Engine-linked
directories listed in LICENSING.md (engine/, proxy/, rewriter/,
browse/, mcp/, shrink/, cavemem Go core, shared/platform/), which are licensed
under Business Source License 1.1 — see LICENSE.BSL. New Engine-linked runtime
modules default to BSL-1.1 unless explicitly classified as MIT.

MIT License

Copyright (c) 2026 Julius Brussee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
