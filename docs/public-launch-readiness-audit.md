# Public launch readiness audit

Audit date: 2026-05-10

## Summary

RepoBelt is ready for final human approval steps before public launch.

The repository is still private. No public launch action has been taken in this audit.

## Repository state

- Repository: `realvaleh/repobelt`
- Visibility: `PRIVATE`
- Default branch: `main`
- Working tree: clean
- Package: `repobelt@0.1.0`

## GitHub metadata

Description:

```text
A seatbelt for AI-generated pull requests.
```

Topics:

```text
ai-agents
ci
code-review
devtools
github-actions
guardrails
pull-requests
security
typescript
```

## CI status

Latest CI run:

```text
https://github.com/realvaleh/repobelt/actions/runs/25636738216
```

Status:

```text
completed / success
```

Required job name for future branch protection:

```text
Test and build
```

The job currently runs:

```bash
pnpm test
pnpm build
pnpm smoke:pack
```

## Local verification

Passed during this audit:

```bash
pnpm test
pnpm build
pnpm smoke:pack
npm pack --dry-run
```

Test status:

```text
Test Files: 9 passed
Tests: 34 passed
```

Packaged CLI smoke test status:

```text
passed
```

## npm package dry run

Dry-run package:

```text
repobelt@0.1.0
filename: repobelt-0.1.0.tgz
package size: 100.5 kB
unpacked size: 173.8 kB
total files: 57
```

Important packaged files verified:

```text
README.md
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
LICENSE
docs/assets/repobelt-demo.mp4
docs/assets/repobelt-demo.svg
docs/public-launch-checklist.md
docs/release-process.md
docs/branch-protection.md
docs/launch-announcement-kit.md
examples/basic/.repobelt.yml
package.json
```

## Tag and release alignment

Package version:

```text
0.1.0
```

Local tag:

```text
v0.1.0
```

Before publishing the GitHub release, confirm the `v0.1.0` tag and draft release target match the latest tested `main` commit.

Release state:

```text
Draft: true
Prerelease: true
```

Release asset:

```text
repobelt-demo.mp4
```

## Security and secrets check

A lightweight scan for obvious real secret-shaped literals found no matches outside ignored build/vendor directories.

Ignored directories for this check:

```text
.git
node_modules
dist
.pnpm-store
```

Security docs verified:

```text
SECURITY.md
.github/ISSUE_TEMPLATE/security.yml
.github/ISSUE_TEMPLATE/config.yml
docs/public-launch-checklist.md
docs/release-process.md
```

Private vulnerability reporting was previously checked while the repo was private and returned `404`. Enable it after the repository is public, as documented in `docs/public-launch-checklist.md` and `docs/release-process.md`.

## Launch assets

Verified launch assets:

```text
docs/assets/repobelt-demo.svg
docs/assets/repobelt-demo.mp4
docs/demo.md
docs/demo-video.md
docs/launch-announcement-kit.md
```

The MP4 demo is synthetic and does not display real secret values.

## Approval-required steps remaining

Do not run these without explicit approval from the maintainer:

```bash
gh repo edit realvaleh/repobelt --visibility public
gh release edit v0.1.0 --draft=false
npm publish --access public
```

Branch protection note: enabling `main` protection while RepoBelt was private returned `403` because GitHub requires an eligible plan or a public repository for this feature. Enable branch protection immediately after making the repository public, before publishing the release/npm package.

After making the repo public, enable private vulnerability reporting:

```bash
gh api -X PUT repos/realvaleh/repobelt/private-vulnerability-reporting \
  -H 'Accept: application/vnd.github+json' --silent

gh api repos/realvaleh/repobelt/private-vulnerability-reporting \
  -H 'Accept: application/vnd.github+json'
```

Expected response:

```json
{"enabled":true}
```

## Recommendation

Next safe step before public launch: decide whether to enable branch protection now or immediately after the repository is public.

Next public side-effect step, only with explicit approval: make the repository public.
