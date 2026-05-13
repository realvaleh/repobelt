# RepoBelt

**A seatbelt for AI-generated pull requests.**

[![CI](https://github.com/realvaleh/repobelt/actions/workflows/ci.yml/badge.svg)](https://github.com/realvaleh/repobelt/actions/workflows/ci.yml)
![Status: early preview](https://img.shields.io/badge/status-early_preview-blue)
![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933)
![License: MIT](https://img.shields.io/badge/license-MIT-yellow)

RepoBelt is a local-first CLI and GitHub Action that checks pull request diffs for unsafe AI-agent changes before maintainers merge them.

AI coding agents can move fast. RepoBelt keeps them in bounds.

![RepoBelt terminal demo](docs/assets/repobelt-demo.svg)

```bash
npx repobelt init
npx repobelt check --base HEAD --head worktree
```

Works with agent-heavy workflows from Claude Code, Codex, Cursor, Copilot, OpenCode, and other tools that can produce fast-moving pull requests.

See the full demo in [`docs/demo.md`](docs/demo.md). A rendered MP4 demo is available at [`docs/assets/repobelt-demo.mp4`](docs/assets/repobelt-demo.mp4), with regeneration notes in [`docs/demo-video.md`](docs/demo-video.md).

## Why RepoBelt exists

Claude Code, Codex, Cursor, Copilot, OpenCode, and other coding agents are increasingly good at generating useful changes. But maintainers still need a deterministic safety layer around the repo:

- Did the PR touch protected files?
- Did it modify auth, payments, migrations, infra, or CI?
- Did it accidentally add a token or private key?
- Does the reviewer have a clear action summary?

RepoBelt answers those questions without trying to replace code review.

It is a **seatbelt**, not an autopilot.

## What RepoBelt checks today

- Protected paths like `.env`, `secrets/**`, `**/*.pem`, and `**/*.key`
- Risky paths like `auth/**`, `payments/**`, `migrations/**`, `infra/prod/**`, and `.github/workflows/**`
- Suspicious secrets:
  - private key blocks
  - GitHub tokens
  - OpenAI-style tokens
  - Anthropic-style tokens
  - AWS access key IDs
  - high-entropy `.env` assignments
- CODEOWNERS reviewer hints from `.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS`, including all matched rules in JSON and Markdown reports
- CODEOWNERS diagnostics for owner-less rules, unsupported `[`/`]` or `!` patterns, and duplicate patterns that override earlier owner routing
- `.repobeltignore` filtering for generated files, vendored folders, build outputs, snapshots, and fixtures
- Required check reminders from policy, such as `test`, `lint`, and `typecheck`
- Text, Markdown, JSON, SARIF, and GitHub Actions annotation reports for CI and bots

## Quickstart

Run without installing globally:

```bash
npx repobelt init
npx repobelt doctor
npx repobelt check --base HEAD --head worktree
```

`doctor` validates the local setup before CI depends on it: git repository status, `.repobelt.yml` presence/parsing, `.repobeltignore` pattern loading, CODEOWNERS diagnostics, and next suggested commands.

To generate the GitHub Actions workflow with persistent PR report comments enabled from the start:

```bash
npx repobelt init --pr-comment
```

For stricter CI defaults from day one, generate policy limits and workflow flags that compare against the remote default branch, fail on risky-path warnings, fail on CODEOWNERS diagnostics, and enforce oversized-change, risky-file, and secret-finding budgets:

```bash
npx repobelt init --strict
```

For larger but still guarded repositories, keep strict mode while tuning the generated budgets:

```bash
npx repobelt init --strict --max-files 100 --max-risky 2 --max-secrets 0
```

The custom values are written into both `.repobelt.yml` `limits` and the generated workflow's explicit `repobelt check` flags, so CI and local policy stay aligned without manual YAML editing.

To discover the built-in policy presets:

```bash
npx repobelt init --list-presets
```

For web apps, start with the web preset:

```bash
npx repobelt init --preset web
```

The web preset adds extra review routing for API routes, middleware, frontend build config, package manifests, lockfiles, and a `build` check reminder.

For Node.js packages and CLIs, use the node preset:

```bash
npx repobelt init --preset node
```

The node preset adds review routing for package manifests, lockfiles, TypeScript config, CLI entrypoints, bin scripts, automation scripts, and a `build` check reminder.

For Python packages and services, use the python preset:

```bash
npx repobelt init --preset python
```

The python preset adds review routing for package metadata, dependency lockfiles, migrations, Alembic config, automation scripts, and a `build` check reminder.

For infrastructure repositories, use the infra preset:

```bash
npx repobelt init --preset infra
```

The infra preset adds review routing for Terraform, tfvars, Kubernetes manifests, Helm charts, Dockerfiles, Compose files, workflow changes, and a `plan` check reminder.

For monorepos, use the monorepo preset:

```bash
npx repobelt init --preset monorepo
```

The monorepo preset adds review routing for workspace manifests, Turborepo/Nx/Lerna/Rush config, package boundary manifests, shared tooling, shared config, and an `affected` check reminder.

This creates:

```text
.repobelt.yml
.github/workflows/repobelt.yml
```

Or add it to a project as a dev dependency:

```bash
pnpm add -D repobelt
pnpm exec repobelt init
```

Generate a Markdown report:

```bash
npx repobelt check --base HEAD --head worktree --format markdown
```

Generate machine-readable JSON:

```bash
npx repobelt check --base HEAD --head worktree --format json
```

Generate SARIF for security/code-scanning style consumers:

```bash
npx repobelt check --base HEAD --head worktree --format sarif
```

Generate GitHub Actions annotations:

```bash
npx repobelt check --base HEAD --head worktree --format github
```

Write a Markdown sidecar summary for GitHub step summaries or bot comments while keeping another primary format on stdout:

```bash
npx repobelt check --format github --summary "$GITHUB_STEP_SUMMARY"
```

Write any report format to a file:

```bash
npx repobelt check --base HEAD --head worktree --format sarif --output repobelt.sarif
```

By default, risky-path warnings exit `0` so CI can pass while reviewers still see the warning. For stricter CI, make warnings fail too:

```bash
npx repobelt check --base HEAD --head worktree --fail-on-warn
```

Run with a non-default policy file for monorepos, experiments, or generated policy comparisons:

```bash
npx repobelt check --base HEAD --head worktree --config policies/strict.repobelt.yml
```

Adopt RepoBelt in an existing repo without failing on every known finding by comparing against a prior JSON report baseline. Matching blocked/risky/secret findings are ignored; new findings still report and fail normally:

```bash
npx repobelt check --format json --output repobelt-baseline.json
npx repobelt check --baseline repobelt-baseline.json
```

Feed RepoBelt an explicit newline-delimited file list instead of asking it to discover changed files from git. Blank lines and duplicate paths are ignored:

```bash
npx repobelt check --changed-files changed-files.txt
```

Or pipe changed paths through stdin without creating a temporary file:

```bash
git diff --name-only origin/main...HEAD | npx repobelt check --stdin-changed-files
```

Ignore noisy generated, vendored, build-output, snapshot, or fixture paths by adding `.repobeltignore` in the repository root. Patterns use the same simple glob style as policy paths; blank lines and `#` comments are ignored. Filename-only patterns such as `*.snap` match basenames at any depth. Later patterns win, and `!` negation patterns re-include important files:

```text
# Generated or vendored files
generated/**
vendor/**
dist/**
!dist/manifest.json
*.snap
```

Ignored paths are removed before policy checks, secret scanning, CODEOWNERS hints, reports, and count guardrails run. Re-included paths continue through the normal checks.

Fail oversized PRs automatically with a changed-file count limit:

```bash
npx repobelt check --max-files 50
```

Fail PRs that touch too many risky review paths while still allowing small warnings:

```bash
npx repobelt check --max-risky 3
```

Fail PRs that exceed an explicit secret-finding budget:

```bash
npx repobelt check --max-secrets 0
```

You can also store budgets in `.repobelt.yml` under `limits`:

```yaml
limits:
  max_files: 50
  max_risky: 3
  max_secrets: 0
```

CLI flags override policy limits for one-off stricter or looser runs.

Run against a specific git diff range without spelling out separate base/head flags:

```bash
npx repobelt check --diff origin/main...HEAD
npx repobelt check --against origin/main
npx repobelt check --since-main
npx repobelt check --since-default
```

`--against <branch>` expands to `<branch>...HEAD`; `--since-main` expands to `origin/main...HEAD`; `--since-default` detects `origin/HEAD` and falls back to `origin/main` when no remote default branch is available.

Print the fully resolved check configuration for CI debugging:

```bash
npx repobelt check --print-config --config policies/strict.repobelt.yml
```

Explain exactly how one path matches RepoBelt policy, ignore, and CODEOWNERS rules:

```bash
npx repobelt check --explain auth/login.ts
```

For bots and editor integrations, explanations can also be emitted as JSON:

```bash
npx repobelt check --explain auth/login.ts --format json
```

Explain many paths from a newline-delimited file list or stdin:

```bash
npx repobelt check --explain-from changed-files.txt
npx repobelt check --explain-from changed-files.txt --format json
git diff --name-only origin/main...HEAD | npx repobelt check --explain-stdin --format json
```

Post or update one persistent Markdown RepoBelt report comment on a GitHub PR. RepoBelt uses the GitHub CLI (`gh api`) and a hidden marker so the next run updates the existing comment instead of spamming the PR. In GitHub Actions pull-request events, use `auto` to read the PR number from `GITHUB_EVENT_PATH`:

```bash
npx repobelt check --pr-comment 123
npx repobelt check --pr-comment auto
```

Make CODEOWNERS diagnostics fail CI when owner routing hygiene is mandatory:

```bash
npx repobelt check --codeowners-diagnostics-fail
```

## Example policy

```yaml
version: 1

protected_paths:
  - .env
  - .env.*
  - secrets/**
  - '**/*.pem'
  - '**/*.key'

risky_paths:
  auth/**: require_review
  payments/**: require_review
  migrations/**: require_review
  infra/prod/**: require_review
  .github/workflows/**: require_review

required_checks:
  - test
  - lint
  - typecheck

allowlist:
  paths: []

limits:
  max_files: 50
  max_risky: 3
  max_secrets: 0
```

## Example failed report

```md
# RepoBelt Report

**Status:** FAIL

Changed files: 2

## Blocked files

- `.env` matched `.env`

## Secret findings

- `src/config.ts:1` `github_token` matched GitHub token

## Required checks

- `test`
- `lint`
- `typecheck`

## Reviewer action

Do not merge until blocked findings are resolved.
```

## GitHub Actions

The generated workflow runs RepoBelt on pull requests, emits inline GitHub annotations, and writes a Markdown report to GitHub's step summary:

```yaml
- name: Run RepoBelt
  run: |
    npx repobelt check \
      --base "origin/$GITHUB_BASE_REF" \
      --head "$GITHUB_SHA" \
      --format github \
      --summary "$GITHUB_STEP_SUMMARY"
```

See [`docs/github-action.md`](docs/github-action.md).

## Examples

- [`examples/basic`](examples/basic) shows a small policy with safe and risky files.
- [`docs/example-reports.md`](docs/example-reports.md) shows PASS, WARN, FAIL, JSON, and SARIF output examples.

## Policy

RepoBelt reads `.repobelt.yml` from the repository root.

See [`docs/policy-v1.md`](docs/policy-v1.md) for the full policy reference, precedence rules, and suggested presets.

## CLI

```text
Usage: repobelt <command>

Commands:
  init     Create a starter .repobelt.yml and GitHub Action workflow
  check    Check a git diff against the RepoBelt policy
  doctor   Validate local RepoBelt setup and policy health

Options:
  --preset <default|web|node|python|infra|monorepo>  Policy preset for init. Default: default
  --pr-comment            Add persistent PR comment support to generated GitHub Action
  --strict                Generate stricter CI defaults and policy limits
  --list-presets          List available init presets
  -h, --help              Show this help message
```

```text
Usage: repobelt doctor [options]

Options:
  --config <path>  Policy file path. Default: .repobelt.yml
  -h, --help       Show this help message
```

```text
Usage: repobelt check [options]

Options:
  --base <ref>                    Base git ref. Default: HEAD
  --head <ref|worktree>           Head git ref or worktree. Default: worktree
  --diff <base...head>            Git diff range shorthand; cannot be combined with --base/--head
  --against <branch>              Compare branch...HEAD without writing the full diff range
  --since-main                    Compare origin/main...HEAD
  --since-default                 Compare origin's default branch...HEAD, falling back to origin/main
  --format <text|markdown|json|sarif|github>   Output format. Default: text
  --output <path>                  Write report to a file instead of stdout
  --summary <path>                 Also write a Markdown summary to a file
  --pr-comment <number|auto>       Post or update a persistent Markdown report comment on a GitHub PR
  --print-config                   Print resolved policy, limits, sources, and CLI overrides
  --explain <path>                 Explain how one path matches ignore, policy, and CODEOWNERS rules
  --explain-from <path>            Explain newline-delimited paths from a file
  --explain-stdin                  Explain newline-delimited paths from stdin
  --config <path>                  Policy file path. Default: .repobelt.yml
  --baseline <path>                JSON baseline report; matching existing findings are ignored
  --changed-files <path>           Newline-delimited changed-file list instead of git diff discovery
  --stdin-changed-files            Read newline-delimited changed-file list from stdin
  --max-files <n>                  Fail when changed file count exceeds n
  --max-risky <n>                  Fail when risky file count exceeds n
  --max-secrets <n>                Fail when secret finding count exceeds n
  --fail-on-warn                  Exit 1 when risky paths produce warnings
  --codeowners-diagnostics-fail   Exit 1 when CODEOWNERS diagnostics are present
  -h, --help                      Show this help message
```

## How RepoBelt is different

RepoBelt is not another repository summarizer, repo-to-prompt packer, or AGENTS.md generator.

Those tools help agents understand a codebase. RepoBelt helps maintainers decide whether an agent-generated change is safe to review or merge.

## Current status

RepoBelt is early but functional:

- CLI scaffold: done
- `init`: done
- `doctor`: done
- policy loading: done
- changed-file detection: done
- protected/risky path checks: done
- secret scanning: done
- CODEOWNERS reviewer hints: done
- required check reminders: done
- init policy presets: default, web, node, python, infra, and monorepo
- text/Markdown/JSON/SARIF reports: done
- GitHub Action template: done
- CI workflow: done

## Roadmap

Near-term:

- Better policy documentation
- More CLI validation
- PR comment mode: done
- richer CODEOWNERS validation and reviewer routing

Later:

- GitHub App
- MCP integration
- more policy presets for common stacks
- richer dependency and migration risk checks

## Development

```bash
pnpm install
pnpm test
pnpm build
pnpm smoke:pack
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md), [`CHANGELOG.md`](CHANGELOG.md), [`docs/packaged-cli-smoke-test.md`](docs/packaged-cli-smoke-test.md), [`docs/demo-video.md`](docs/demo-video.md), [`docs/branch-protection.md`](docs/branch-protection.md), [`docs/release-process.md`](docs/release-process.md), [`docs/public-launch-checklist.md`](docs/public-launch-checklist.md), [`docs/public-launch-readiness-audit.md`](docs/public-launch-readiness-audit.md), and [`docs/launch-announcement-kit.md`](docs/launch-announcement-kit.md).

## License

MIT
