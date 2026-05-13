# RepoBelt Policy v1

RepoBelt reads policy from `.repobelt.yml` in the repository root.

The policy tells RepoBelt which changed files should fail CI, which files need extra human review, and which validation checks matter for the project.

## Minimal policy

```yaml
version: 1

protected_paths:
  - .env
  - secrets/**

risky_paths:
  auth/**: require_review

required_checks:
  - test

allowlist:
  paths: []
```

## Full generated policy

`repobelt init` currently generates:

```yaml
version: 1

# Files that should fail CI when changed by an AI-generated PR unless policy is edited.
protected_paths:
  - .env
  - .env.*
  - secrets/**
  - '**/*.pem'
  - '**/*.key'

# Files that are allowed but should receive explicit human review.
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
```

## Init presets

`repobelt init` supports policy presets. List them with descriptions before choosing one:

```bash
repobelt init --list-presets
```

Then initialize with a preset:

```bash
repobelt init --preset default
repobelt init --preset web
repobelt init --preset node
repobelt init --preset python
repobelt init --preset infra
repobelt init --preset monorepo
```

The `default` preset is the baseline policy shown above.

The `web` preset keeps the baseline safeguards and adds review routing for common web-app risk surfaces:

```yaml
risky_paths:
  app/api/**: require_review
  pages/api/**: require_review
  src/app/api/**: require_review
  middleware.*: require_review
  next.config.*: require_review
  vite.config.*: require_review
  package.json: require_review
  pnpm-lock.yaml: require_review
  package-lock.json: require_review

required_checks:
  - test
  - lint
  - typecheck
  - build
```

Use the web preset for Next.js, Vite, or similar frontend/API repositories where agent-generated changes to routing, middleware, dependencies, and build configuration deserve explicit maintainer attention.

The `node` preset keeps the baseline safeguards and adds review routing for Node.js package and CLI risk surfaces:

```yaml
risky_paths:
  package.json: require_review
  pnpm-lock.yaml: require_review
  package-lock.json: require_review
  tsconfig*.json: require_review
  src/cli.*: require_review
  bin/**: require_review
  scripts/**: require_review

required_checks:
  - test
  - lint
  - typecheck
  - build
```

Use the node preset for TypeScript/JavaScript packages, CLIs, and libraries where generated changes to package metadata, lockfiles, compiler configuration, executable entrypoints, or automation scripts deserve explicit maintainer attention.

The `python` preset keeps the baseline safeguards and adds review routing for Python package and service risk surfaces:

```yaml
risky_paths:
  pyproject.toml: require_review
  requirements*.txt: require_review
  poetry.lock: require_review
  uv.lock: require_review
  Pipfile.lock: require_review
  alembic/**: require_review
  migrations/**: require_review
  scripts/**: require_review

required_checks:
  - test
  - lint
  - typecheck
  - build
```

Use the python preset for Python packages, APIs, data services, and CLI tools where generated changes to package metadata, dependency locks, migration directories, or automation scripts deserve explicit maintainer attention.

The `infra` preset keeps the baseline safeguards and adds review routing for infrastructure risk surfaces:

```yaml
risky_paths:
  '**/*.tf': require_review
  '**/*.tfvars': require_review
  terraform/**: require_review
  infra/**: require_review
  k8s/**: require_review
  kubernetes/**: require_review
  helm/**: require_review
  Dockerfile*: require_review
  docker-compose*.yml: require_review
  docker-compose*.yaml: require_review
  .github/workflows/**: require_review

required_checks:
  - test
  - lint
  - typecheck
  - plan
```

Use the infra preset for Terraform, Kubernetes, Helm, Docker, production infrastructure, and deployment-heavy repositories where generated changes need explicit maintainer review and a plan-style validation reminder.

The `monorepo` preset keeps the baseline safeguards and adds review routing for workspace and shared tooling risk surfaces:

```yaml
risky_paths:
  package.json: require_review
  pnpm-lock.yaml: require_review
  package-lock.json: require_review
  pnpm-workspace.yaml: require_review
  turbo.json: require_review
  nx.json: require_review
  lerna.json: require_review
  rush.json: require_review
  packages/*/package.json: require_review
  apps/*/package.json: require_review
  libs/*/package.json: require_review
  tools/**: require_review
  config/**: require_review

required_checks:
  - test
  - lint
  - typecheck
  - build
  - affected
```

Use the monorepo preset for pnpm/Turborepo/Nx/Lerna/Rush-style repositories where generated changes to workspace boundaries, package manifests, shared tooling, or shared config deserve explicit maintainer review and affected-project validation.

## Fields

### `version`

Required.

Current supported value:

```yaml
version: 1
```

Unsupported versions fail with a clear error. This keeps future policy changes explicit.

### `protected_paths`

A list of glob patterns that should fail RepoBelt when changed.

Use this for files that should almost never be modified by an AI-generated pull request without deliberate maintainer intervention.

Examples:

```yaml
protected_paths:
  - .env
  - .env.*
  - secrets/**
  - infra/prod/**
  - '**/*.pem'
  - '**/*.key'
```

If a changed file matches `protected_paths`, RepoBelt returns:

```text
status: fail
exit code: 1
```

### `risky_paths`

A map of glob patterns to review actions.

Currently supported action:

```yaml
require_review
```

Examples:

```yaml
risky_paths:
  auth/**: require_review
  payments/**: require_review
  migrations/**: require_review
  .github/workflows/**: require_review
```

If a changed file matches `risky_paths` but does not match `protected_paths`, RepoBelt returns:

```text
status: warn
exit code: 0
```

This lets CI pass while still highlighting files that need extra attention.

### `required_checks`

A list of project validation commands that matter for reviewers.

```yaml
required_checks:
  - test
  - lint
  - typecheck
```

Current behavior: this field is loaded and included in text, Markdown, JSON, and GitHub Actions annotation reports as reviewer context. RepoBelt does not yet execute commands or verify GitHub check-run status; `required_checks` is a deterministic reminder of the validation commands reviewers expect before merge.

### `allowlist.paths`

A list of paths allowed even if they match a risky pattern.

```yaml
allowlist:
  paths:
    - docs/**
    - examples/**
```

Current precedence:

1. `protected_paths` always wins.
2. `allowlist.paths` can override `risky_paths`.
3. `risky_paths` applies next.
4. Everything else is allowed.

That means allowlist is useful for documentation/examples, but it cannot make protected files safe.

## Glob support

RepoBelt intentionally starts with a small glob subset:

- `*` matches within one path segment.
- `**` matches across path segments.
- `**/` matches zero or more directories.

Examples:

```yaml
.env          # matches .env exactly
.env.*        # matches .env.local, .env.production, etc.
secrets/**    # matches secrets/prod.key and secrets/nested/token.txt
**/*.pem      # matches cert.pem and certs/prod/cert.pem
auth/**       # matches auth/login.ts and auth/server/session.ts
```

## CODEOWNERS reviewer hints

RepoBelt also looks for CODEOWNERS files in this order:

1. `.github/CODEOWNERS`
2. `CODEOWNERS`
3. `docs/CODEOWNERS`

When a changed file matches a CODEOWNERS rule, reports include a `reviewerHints` entry with the file, matched CODEOWNERS pattern, and owners. These hints do not change `PASS`, `WARN`, or `FAIL` status; they are routing context for the human reviewer.

Example:

```text
auth/** @security-team @backend-lead
*.md @docs-team
```

Rules are evaluated with last-match-wins behavior, matching GitHub's CODEOWNERS precedence model. Blank lines, comments, and entries without owners are ignored.

## Status rules

RepoBelt combines path policy results and secret scanning results.

### `pass`

Returned when:

- no protected path changed,
- no risky path changed,
- no secret finding was detected.

Exit code:

```text
0
```

### `warn`

Returned when:

- no protected path changed,
- no secret finding was detected,
- at least one risky path changed.

Exit code:

```text
0
```

Use `repobelt check --fail-on-warn` when you want stricter CI behavior. With that flag, RepoBelt still reports status `warn` in text, Markdown, JSON, and SARIF output, but exits `1` so the CI job fails.

Use `repobelt check --config <path>` to load a policy file other than `.repobelt.yml`. Relative paths are resolved from the current working directory, and absolute paths are accepted. This is useful for monorepos, strict-mode experiments, or comparing generated policy files before replacing the default policy.

Use `repobelt check --changed-files <path>` to load a newline-delimited list of changed files instead of running git diff discovery. Blank lines and duplicate paths are ignored, and relative list paths are resolved from the current working directory. This is useful for CI systems or bots that already computed an exact file list.

Use `repobelt check --stdin-changed-files` to read that same newline-delimited changed-file list from stdin. This is useful when a CI step or bot can pipe paths directly, and it avoids creating a temporary file. Do not combine it with `--changed-files`.

Use `repobelt check --max-files <n>` to fail PRs that change more than `n` files. The value must be a positive integer. This gives teams a simple size guardrail for AI-generated pull requests before reviewers spend time on oversized diffs.

Use `repobelt check --max-risky <n>` to fail PRs that produce more than `n` risky-path findings. The value must be a non-negative integer, so `--max-risky 0` means any risky file fails while still preserving normal protected-path and secret-finding behavior.

Use `repobelt check --format github` to emit GitHub Actions annotations. Protected paths and secret findings become `error` annotations, risky paths become `warning` annotations, and CODEOWNERS/required-check reminders become `notice` annotations. The exit-code rules are the same as other report formats.

Use `repobelt check --summary <path>` to write an additional Markdown report sidecar while keeping the primary output format on stdout or in `--output`. Relative summary paths are resolved from the current working directory, and parent directories are created automatically. This is useful for commands such as `repobelt check --format github --summary "$GITHUB_STEP_SUMMARY"`, where stdout should stay as GitHub annotations but reviewers still get a readable Markdown step summary.

### `fail`

Returned when:

- any protected path changed, or
- any secret finding was detected.

Exit code:

```text
1
```

## Suggested presets

### Web app

```yaml
protected_paths:
  - .env
  - .env.*
  - secrets/**
  - infra/prod/**

risky_paths:
  auth/**: require_review
  payments/**: require_review
  migrations/**: require_review
  .github/workflows/**: require_review
```

### Library/package

```yaml
protected_paths:
  - .env
  - .npmrc
  - '**/*.pem'
  - '**/*.key'

risky_paths:
  package.json: require_review
  pnpm-lock.yaml: require_review
  .github/workflows/**: require_review
```

### Infrastructure-heavy repo

```yaml
protected_paths:
  - .env
  - secrets/**
  - infra/prod/**
  - terraform/prod/**
  - k8s/prod/**

risky_paths:
  infra/**: require_review
  terraform/**: require_review
  k8s/**: require_review
  .github/workflows/**: require_review
```

## Design principle

RepoBelt policies should be boring, explicit, and reviewable.

Do not put vague AI instructions here. Use `.repobelt.yml` for deterministic safety boundaries that CI can enforce.
