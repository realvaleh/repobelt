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

Current status: this field is loaded and reported as part of the policy model, but RepoBelt does not yet execute or verify these commands. It is reserved for near-term validation/reporting behavior.

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
