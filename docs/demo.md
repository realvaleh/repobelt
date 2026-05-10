# RepoBelt demo

This page shows the core RepoBelt value proposition: a deterministic safety report for AI-generated pull requests.

![RepoBelt terminal demo](assets/repobelt-demo.svg)

## Scenario

An AI coding agent proposes a change that touches:

- `.env` — a protected file that should not appear in a pull request.
- `auth/login.ts` — a risky authentication path that needs human review.
- `src/config.ts` — a file with a suspicious token-shaped string.

RepoBelt does not try to judge whether the code is good. It gives maintainers a fast, deterministic answer about whether the PR crossed safety boundaries.

## Demo command

```bash
npx repobelt check --base HEAD --head worktree --format markdown
```

## Example output

```md
# RepoBelt Report

**Status:** FAIL

Changed files: 3

## Blocked files

- `.env` matched `.env`

## Risky files

- `auth/login.ts` matched `auth/**` and requires review

## Secret findings

- `.env:1` `high_entropy_env_value` matched high entropy env assignment
- `src/config.ts:1` `github_token` matched GitHub token

## Reviewer action

Do not merge until blocked findings are resolved.
```

## Why this demo matters

The report is intentionally simple:

- **Blocked files** stop risky PRs early.
- **Risky files** tell reviewers where to focus.
- **Secret findings** avoid leaking sensitive material in CI output.
- **Markdown output** works directly in GitHub Actions step summaries.

RepoBelt is a seatbelt, not an autopilot.
