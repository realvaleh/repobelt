# Changelog

All notable changes to RepoBelt will be documented in this file.

RepoBelt follows semantic versioning before `1.0.0` with the usual early-preview caveat: minor versions may still include breaking policy or CLI changes while the project is stabilizing.

## [0.1.0] - 2026-05-10

### Added since release

- CODEOWNERS reviewer hints in check results, text output, Markdown reports, and JSON reports.
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
