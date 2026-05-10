# Branch protection and repository rules

RepoBelt should protect `main` before the repository is made public.

The goal is simple: every public change should pass CI, including the packaged CLI smoke test, before it lands on `main`.

## Recommended baseline

For the first public launch, use a lightweight protection setup:

- Require pull requests before merging.
- Require the `Test and build` status check from the `CI` workflow.
- Require branches to be up to date before merging when practical.
- Disallow force pushes to `main`.
- Disallow branch deletion for `main`.
- Keep admins allowed to bypass initially if needed for emergency release fixes.

This keeps the project safe without making early maintenance painful.

## Current CI check to require

The required status check should correspond to the current GitHub Actions job:

```text
Test and build
```

That job currently runs:

```bash
pnpm test
pnpm build
pnpm smoke:pack
```

So required CI covers both source tests and the packaged CLI tarball smoke test.

## Manual setup path

In GitHub:

1. Open the repository.
2. Go to **Settings**.
3. Go to **Rules** → **Rulesets** or **Branches**, depending on the available UI.
4. Create a rule for the default branch:

```text
main
```

5. Enable:

```text
Require a pull request before merging
Require status checks to pass
Require branches to be up to date before merging
Block force pushes
Block branch deletions
```

6. Add required status check:

```text
Test and build
```

## CLI/API setup option

GitHub branch protection can also be configured by API after the repo is public/stable enough.

Example command:

```bash
gh api -X PUT repos/realvaleh/repobelt/branches/main/protection \
  -H 'Accept: application/vnd.github+json' \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Test and build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false,
  "required_conversation_resolution": false
}
JSON
```

Verify with:

```bash
gh api repos/realvaleh/repobelt/branches/main/protection \
  -H 'Accept: application/vnd.github+json'
```

## When to enable

Enable branch protection after:

- [ ] CI has passed on the latest `main` commit.
- [ ] `pnpm smoke:pack` is part of CI.
- [ ] the `v0.1.0` release draft is ready.
- [ ] before or immediately after making the repository public.

## Notes for early development

During private prelaunch iteration, direct pushes to `main` are acceptable because the repo is still being prepared quickly. Once public, use pull requests for meaningful changes so the repository looks professional and CI history remains clean.

If branch protection blocks an urgent release fix, use the admin bypass intentionally and document the reason in the commit or release notes.
