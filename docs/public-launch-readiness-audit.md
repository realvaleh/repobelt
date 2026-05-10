# Public launch readiness audit

Audit date: 2026-05-10

## Summary

RepoBelt has completed the approved GitHub public-launch steps.

The repository is now public, branch protection is enabled for `main`, private vulnerability reporting is enabled, and the `v0.1.0` GitHub prerelease is published.

## Repository state

- Repository: `realvaleh/repobelt`
- Visibility: `PUBLIC`
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

Latest CI run before launch:

```text
https://github.com/realvaleh/repobelt/actions/runs/25637296419
```

Status:

```text
completed / success
```

Required branch protection status check:

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

Published tag/release target:

```text
a97b2b5c5cc8d055f13fbc6cc267ead8a6c10c84
```

Release state:

```text
Draft: false
Prerelease: true
Published URL: https://github.com/realvaleh/repobelt/releases/tag/v0.1.0
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

Private vulnerability reporting is enabled for the public repository.

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

## Completed public-launch steps

Completed with maintainer approval on 2026-05-10:

```text
Repository visibility: PUBLIC
main branch protection: enabled
Required status check: Test and build
Private vulnerability reporting: enabled
GitHub release v0.1.0: published as prerelease
```

Branch protection note: enabling `main` protection while RepoBelt was private previously returned `403` because GitHub requires an eligible plan or a public repository for this feature. It succeeded after the repository was made public.

## Approval-required steps remaining

Do not run this without separate explicit approval from the maintainer:

```bash
npm publish --access public
```

## Recommendation

Next step: review the public GitHub repo and published prerelease page, then decide whether to publish `repobelt@0.1.0` to npm.
