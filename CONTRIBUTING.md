# Contributing

Thanks for the interest. This package is a thin OpenCode plugin; the rules themselves come from upstream Caveman.

## Setup

Node.js 20 or newer.

    npm install        # dev-only: prettier; also wires the pre-commit hook
    npm test           # node --test, no other dependencies

`make` wraps the common commands: `make help` lists them, `make check` runs everything CI runs.

The pre-commit hook (`.githooks/pre-commit`, runs `npm test`) is wired by the `prepare` script on `npm install`. If you skip the install, enable it by hand once per clone:

    git config core.hooksPath .githooks

Enable the pre-commit hook once per clone:

    git config core.hooksPath .githooks

## Checks before a PR

    npm test
    npm run format:check

`npm run format` rewrites files with Prettier. `skills/`, `agents/`, `NOTICE.md`, and `LICENSE` are excluded on purpose and must stay byte-identical.

## Vendored files

`skills/` and `agents/` are vendored from
[JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) and are not
edited here. To sync, re-vendor from the commit pinned in `NOTICE.md`, update
the SHA there, and keep the vendored files byte-identical — the only permitted
change is dropping the `model:` line from agent frontmatter.

## Pull requests

- Keep the diff focused; one concern per PR.
- `npm test` and `npm run format:check` must pass — CI runs both.
- Runtime code lives in `hooks/*.cjs` and `.opencode/plugins/caveman.mjs`; tests live in `tests/`.
- Do not add dependencies for what a few lines of Node can do.

## Releases

Trunk-based: work lands on `main` through squash-merged PRs. [`release-please`](https://github.com/googleapis/release-please) owns the version and `CHANGELOG.md`; publishing runs in `.github/workflows/release.yml`.

### One-time bootstrap (first release only)

The first version is published by hand, because npm only exposes its Trusted Publisher settings after the package exists:

    npm login
    npm publish
    git tag v1.0.0 && git push origin v1.0.0
    gh release create v1.0.0 --generate-notes

Then configure the trusted publisher: on npmjs.com open the package → Settings → Trusted Publisher → GitHub Actions, with repository `miguelmartens/opencode-caveman` and workflow `release.yml`. From then on the publish job authenticates with OIDC — no token — and provenance is generated automatically.

Keep the initial commit a `chore:` (not a releasable unit) so `release-please` does not open a release PR before the manual bootstrap above.

### Ongoing

1. Merge conventional-commit PRs (`feat:`, `fix:`, `chore:`; `!` or `BREAKING CHANGE:` for breaking changes) into `main`.
2. `release-please` opens or updates a release PR with the version bump and changelog.
3. Merge the release PR: the tag and GitHub release are created, and CI publishes that version to npm.

Force a specific version with `Release-As: x.y.z` in a commit body. `main` is protected by the `Protect main` ruleset: PRs only, squash merges, and the CI checks required.
