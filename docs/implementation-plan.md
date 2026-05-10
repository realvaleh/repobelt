# RepoBelt Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build RepoBelt, a CLI and GitHub Action that protects repositories from unsafe AI-generated pull requests by checking diffs against a repo-specific safety policy.

**Architecture:** Start with a local-first TypeScript CLI that reads `.repobelt.yml`, inspects git diffs, applies deterministic rules, and emits human-readable markdown plus machine-readable JSON. The GitHub Action should call the same CLI so local and CI behavior stay identical.

**Tech Stack:** TypeScript, Node.js, pnpm, Vitest, yaml parser, simple-git or child-process git wrapper, GitHub Actions workflow.

---

## Phase 0: Project setup

### Task 1: Create repository scaffold

**Objective:** Create the initial package structure for a TypeScript CLI.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/cli.ts`
- Create: `src/index.ts`
- Create: `tests/cli.test.ts`

**Steps:**
1. Initialize a pnpm TypeScript project.
2. Add Vitest.
3. Add CLI bin entry `repobelt`.
4. Add placeholder CLI command that prints help.
5. Run tests and verify the CLI can execute.

**Verification:**

```bash
pnpm test
pnpm build
node dist/cli.js --help
```

### Task 2: Define policy schema

**Objective:** Define `.repobelt.yml` v1 schema and validation.

**Files:**
- Create: `src/policy/schema.ts`
- Create: `src/policy/load-policy.ts`
- Create: `tests/policy/load-policy.test.ts`
- Create: `docs/policy-v1.md`

**Policy fields:**

```yaml
version: 1
protected_paths:
  - .env
  - secrets/**
  - infra/prod/**
risky_paths:
  auth/**: require_review
  payments/**: require_review
  migrations/**: require_review
required_checks:
  - test
  - lint
  - typecheck
allowlist:
  paths: []
```

**Verification:**

- Valid policy loads successfully.
- Missing policy falls back to secure defaults.
- Invalid policy returns clear errors.

### Task 3: Implement `repobelt init`

**Objective:** Generate a default `.repobelt.yml` and GitHub Action workflow.

**Files:**
- Create: `src/commands/init.ts`
- Create: `templates/repobelt.yml`
- Create: `templates/github-action.yml`
- Create: `tests/commands/init.test.ts`

**Verification:**

```bash
repobelt init --dry-run
repobelt init
```

Expected files:

```text
.repobelt.yml
.github/workflows/repobelt.yml
```

## Phase 1: Diff checking engine

### Task 4: Read changed files from git

**Objective:** Detect changed files between base and head refs.

**Files:**
- Create: `src/git/changed-files.ts`
- Create: `tests/git/changed-files.test.ts`

**Command behavior:**

```bash
repobelt check --base main --head HEAD
```

**Verification:**

- Returns modified, added, deleted, and renamed files.
- Fails clearly outside a git repo.

### Task 5: Match changed files against policy

**Objective:** Classify each changed file as allowed, risky, or blocked.

**Files:**
- Create: `src/rules/path-policy.ts`
- Create: `tests/rules/path-policy.test.ts`

**Verification:**

- `.env` is blocked.
- `auth/login.ts` is risky.
- `src/button.tsx` is allowed by default.

### Task 6: Add secret pattern scanning

**Objective:** Flag suspicious secrets in added lines.

**Files:**
- Create: `src/rules/secrets.ts`
- Create: `tests/rules/secrets.test.ts`

**Initial patterns:**

- Private key headers.
- GitHub tokens.
- OpenAI/Anthropic-style API keys.
- AWS access key IDs.
- `.env` assignments with high-entropy values.

**Verification:**

- Test fixtures with fake keys are detected.
- Normal code is not flagged.

### Task 7: Generate check result model

**Objective:** Combine all rule outputs into a stable JSON result.

**Files:**
- Create: `src/check/check-result.ts`
- Create: `src/check/run-check.ts`
- Create: `tests/check/run-check.test.ts`

**Result statuses:**

- `pass`
- `warn`
- `fail`

**Verification:**

- Protected path change returns `fail`.
- Risky path change returns `warn`.
- Normal change returns `pass`.

## Phase 2: Reporting and GitHub Action usability

### Task 8: Markdown report output

**Objective:** Generate a clean PR-friendly markdown report.

**Files:**
- Create: `src/report/markdown.ts`
- Create: `tests/report/markdown.test.ts`

**Report sections:**

- Summary status.
- Blocked changes.
- Risky changes.
- Secret findings.
- Suggested reviewer action.

### Task 9: GitHub Action workflow template

**Objective:** Provide copy-paste CI integration.

**Files:**
- Modify: `templates/github-action.yml`
- Create: `docs/github-action.md`

**Verification:**

- Workflow installs package.
- Runs `repobelt check` on pull requests.
- Uploads markdown report as step summary.

### Task 10: README and launch demo

**Objective:** Make the project understandable and star-worthy.

**Files:**
- Create: `README.md`
- Create: `docs/demo.md`
- Create: `examples/basic/.repobelt.yml`

**README top section:**

- One-line promise.
- Screenshot/GIF placeholder.
- Quickstart.
- Example failed PR report.
- Why RepoBelt exists.

## Phase 3: Launch readiness

### Task 11: Quality gates

**Objective:** Add CI, linting, formatting, and release scripts.

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.prettierrc`
- Modify: `package.json`

**Verification:**

```bash
pnpm lint
pnpm test
pnpm build
```

### Task 12: Public launch checklist

**Objective:** Prepare for a GitHub launch.

**Files:**
- Create: `docs/launch-checklist.md`
- Create: `CONTRIBUTING.md`
- Create: `LICENSE`

**Checklist:**

- Strong README.
- Clear install command.
- Demo GIF.
- Example PR report.
- Issues labeled `good first issue`.
- Topics: `ai-agents`, `github-actions`, `security`, `devtools`, `claude-code`, `codex`, `cursor`.
