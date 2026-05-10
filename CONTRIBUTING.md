# Contributing to RepoBelt

Thanks for helping make AI-generated pull requests safer.

## Development setup

```bash
pnpm install
pnpm test
pnpm build
```

## TDD expectation

RepoBelt uses strict test-driven development for behavior changes:

1. Add or update a failing test.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the smallest change that makes it pass.
4. Run the focused test, full test suite, and build.

## Useful commands

```bash
pnpm test
pnpm build
node dist/cli.js --help
node dist/cli.js check --help
```

## Project structure

```text
src/cli.ts                 CLI executable entrypoint
src/index.ts               CLI command routing
src/check/run-check.ts     Check orchestration
src/git/changed-files.ts   Git diff file detection
src/policy/                .repobelt.yml loading and schema
src/rules/                 Deterministic policy/secret rules
src/report/                Markdown and JSON report renderers
tests/                     Vitest test suite
```

## Pull request checklist

Before opening a PR:

- [ ] Added tests for behavior changes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Updated docs when CLI behavior or policy format changed.
- [ ] No real secrets, tokens, or credentials are committed.

## Security-sensitive changes

Changes to these areas need extra review:

- secret scanning rules
- path-policy behavior
- GitHub Action workflow generation
- package publishing metadata
- CLI exit-code behavior
