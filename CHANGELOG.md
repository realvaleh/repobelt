# Changelog

All notable changes to RepoBelt will be documented in this file.

RepoBelt follows semantic versioning before `1.0.0` with the usual early-preview caveat: minor versions may still include breaking policy or CLI changes while the project is stabilizing.

## [0.1.0] - 2026-05-10

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
