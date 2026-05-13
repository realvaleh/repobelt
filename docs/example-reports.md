# Example Reports

These examples show the shape of RepoBelt output.

## PASS

```bash
repobelt check --base HEAD --head worktree --format markdown
```

```md
# RepoBelt Report

**Status:** PASS

Changed files: 1

No blocked paths, risky paths, or secrets found.

## Reviewer action

RepoBelt found no policy violations.
```

## WARN

A change to `auth/login.ts` with this policy:

```yaml
risky_paths:
  auth/**: require_review
```

Produces:

```md
# RepoBelt Report

**Status:** WARN

Changed files: 1

## Risky files

- `auth/login.ts` matched `auth/**` and requires review

## Reviewer hints

- `auth/login.ts` matched `auth/**`: @security-team

## Reviewer action

Review risky files before merging.
```

## FAIL

A change to `.env` with this policy:

```yaml
protected_paths:
  - .env
```

Produces:

```md
# RepoBelt Report

**Status:** FAIL

Changed files: 1

## Blocked files

- `.env` matched `.env`

## Reviewer action

Do not merge until blocked findings are resolved.
```

## JSON output

```bash
repobelt check --base HEAD --head worktree --format json
```

```json
{
  "status": "fail",
  "changedFiles": [
    ".env"
  ],
  "pathPolicy": {
    "status": "fail",
    "blocked": [
      {
        "path": ".env",
        "matchedPattern": ".env"
      }
    ],
    "risky": [],
    "allowed": []
  },
  "secretFindings": [],
  "reviewerHints": []
}
```
