# Changelog

All notable changes to RepoBelt will be documented in this file.

RepoBelt follows semantic versioning before `1.0.0` with the usual early-preview caveat: minor versions may still include breaking policy or CLI changes while the project is stabilizing.

## [0.1.0] - 2026-05-10

### Added since release

- `init --pr-comment` for generating a GitHub Actions workflow with persistent PR comments enabled (`issues: write`, `GH_TOKEN`, and `--pr-comment auto`).
- `check --pr-comment <number|auto>` for posting or updating one persistent Markdown RepoBelt report comment on a GitHub PR via `gh api`, including GitHub Actions PR-number auto-detection.
- `check --explain-stdin` for piping newline-delimited path lists directly into batch path explanations without creating a temporary file.
- `check --explain-from <path>` for batch path explanations from newline-delimited file lists, with text output or JSON arrays.
- `check --explain <path> --format json` for machine-readable path classification explanations in bots and editor integrations.
- `check --explain <path>` for explaining one path's `.repobeltignore`, protected-path, allowlist, risky-path, and CODEOWNERS matches without running git diff discovery.
- `check --baseline <path>` for ignoring findings already present in a prior JSON report so teams can adopt RepoBelt incrementally while still failing on new findings.
- `.repobeltignore` support for filtering generated, vendored, build-output, snapshot, or fixture paths before policy checks, secret scanning, CODEOWNERS hints, reports, and count guardrails run, including ordered `!` negation patterns for re-including important files.
- `check --print-config` for debugging resolved policy/config, CODEOWNERS source, CLI overrides, and effective limits without scanning a diff.
- Policy `limits` for storing `max_files`, `max_risky`, and `max_secrets` guardrails in `.repobelt.yml`.
- `check --summary <path>` for writing a Markdown sidecar report while preserving the primary output format.
- `check --max-secrets <n>` for failing PRs that exceed a secret-finding budget.
- `check --format github` for emitting GitHub Actions annotations (`error`, `warning`, and `notice`) from RepoBelt findings.
- `check --max-risky <n>` for failing PRs that exceed a risky-file warning budget.
- `check --max-files <n>` for failing oversized PRs by changed-file count.
- `check --stdin-changed-files` for reading an explicit newline-delimited changed-file list from stdin.
- `check --changed-files <path>` for checking an explicit newline-delimited file list instead of discovering changes with git.
- `check --config <path>` for running checks with a non-default policy file.
- `check --fail-on-warn` for stricter CI that exits 1 when risky paths produce warnings.
- `init --list-presets` for discovering built-in policy presets and descriptions from the CLI.
- CODEOWNERS reviewer hints in check results, text output, Markdown reports, and JSON reports, with JSON/Markdown including every matched CODEOWNERS rule for each hinted path.
- `init --preset web` for web-app policies covering API routes, middleware, build config, package manifests, lockfiles, and a `build` required-check reminder.
- `init --preset node` for Node.js package and CLI policies covering package metadata, lockfiles, TypeScript config, CLI/bin entrypoints, automation scripts, and a `build` required-check reminder.
- `init --preset python` for Python package and service policies covering package metadata, dependency lockfiles, migrations, Alembic config, automation scripts, and a `build` required-check reminder.
- `init --preset infra` for infrastructure policies covering Terraform, tfvars, Kubernetes, Helm, Docker, Compose, workflow changes, and a `plan` required-check reminder.
- `init --preset monorepo` for workspace policies covering pnpm/Turborepo/Nx/Lerna/Rush config, package boundary manifests, shared tooling, shared config, and an `affected` required-check reminder.
- Required check reminders from policy in check results, text output, Markdown reports, and JSON reports.
- SARIF report output for blocked paths, risky paths, and secret findings.
- `check --output <path>` for writing text, Markdown, JSON, or SARIF reports to files.
- Generated and project GitHub workflows now use Node 24-ready action majors (`actions/checkout@v6`, `actions/setup-node@v6`, and `pnpm/action-setup@v6` where applicable).

### Changed since release

- Generated GitHub Actions workflows now render the `npx repobelt check` command as clean continued shell lines instead of collapsed template output.
- Generated GitHub Actions workflows now emit inline annotations with `--format github` while writing readable Markdown step summaries with `--summary "$GITHUB_STEP_SUMMARY"`.
- Explicit changed-file inputs now deduplicate paths before count and risky-file guardrails run.
- Init presets are now backed by a data-driven registry that also powers CLI validation and help text.

### Added

- Initial `repobelt` CLI with `init` and `check` commands.
- Starter `.repobelt.yml` policy generation.
- Starter GitHub Actions workflow generation.
- Git changed-file detection for tracked modifications and untracked files.
- Protected path checks for files such as `.env`, `secrets/**`, `**/*.pem`, and `**/*.key`.
- Risky path classification for paths such as `auth/**`, `payments/**`, `migrations/**`, infrastructure, and workflow files.
- Secret scanning for private key blocks, GitHub token-shaped strings, OpenAI-style token-shaped strings, Anthropic-style token-shaped strings, AWS access key IDs, and high-entropy `.env` assignments.
- Text, Markdown, and JSON report formats.
- GitHub Actions step-summary friendly Markdown output.
- Policy documentation, example reports, and a basic example project.
- README launch demo asset, rendered MP4 launch demo, and early-preview badges.
- Node 24 GitHub Actions runtime opt-in for generated and project workflows.
- Packaged CLI smoke test that installs the npm tarball into a clean temporary project and verifies `repobelt` commands through `npx`.
- GitHub CI step that runs the packaged CLI smoke test on every push and pull request.
- Issue templates, `SECURITY.md`, release process docs, branch protection plan, public launch checklist, and launch announcement kit.

### Notes

- `FAIL` exits with status code `1` when blocked files or secret findings are detected.
- `WARN` exits with status code `0` when only risky files are detected.
- `PASS` exits with status code `0` when no findings are detected.
- Secret values are intentionally not printed in reports.

[0.1.0]: https://github.com/realvaleh/repobelt/releases/tag/v0.1.0
