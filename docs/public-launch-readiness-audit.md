# Public launch readiness audit

Audit date: 2026-05-14

## Summary

RepoBelt has completed the approved GitHub public-launch steps and remains release-ready from the repository, CI, local verification, and package dry-run perspective.

The repository is public, branch protection is enabled for `main`, private vulnerability reporting is enabled, and the `v0.1.0` GitHub prerelease is published.

Important current release note: the published `v0.1.0` GitHub tag/release still points to an older commit than `main`. Since `main` now contains additional `0.1.0` polish after the prerelease, final npm publication should either retarget/recreate the `v0.1.0` release at the current `main` commit or bump to a new patch/pre-1.0 release before publishing.

## Repository state

- Repository: `realvaleh/repobelt`
- Visibility: `PUBLIC`
- Default branch: `main`
- Working tree at audit start: clean
- Current branch: `main`
- Current `main` HEAD: `bcf6ffeedea35afbc5c32539783e348112c8ddea`
- Current package: `repobelt@0.1.0`

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

Latest CI run verified during this audit:

```text
https://github.com/realvaleh/repobelt/actions/runs/25850840905
```

Status:

```text
completed / success
```

Latest verified CI commit:

```text
bcf6ffe feat: add init help command
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
pnpm typecheck
pnpm smoke:pack
npm pack --dry-run --json
```

Test status:

```text
Test Files: 14 passed
Tests: 148 passed
```

Packaged CLI smoke test status:

```text
passed
```

Packaged smoke coverage now verifies the npm tarball through `npx`, including:

```text
repobelt --help
repobelt init --help
repobelt init --dry-run
repobelt init --pr-comment
repobelt init --strict
repobelt doctor
repobelt doctor --format json
repobelt doctor --format json --output reports/doctor.json
repobelt check with diff ranges, explicit file lists, stdin, baselines, ignore patterns, summaries, annotations, and explain modes
```

## npm package dry run

Dry-run package generated from current `main`:

```text
repobelt@0.1.0
filename: repobelt-0.1.0.tgz
package size: 361.6 kB
unpacked size: 590.4 kB
total files: 71
```

Important packaged files verified in the dry run:

```text
README.md
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
LICENSE
dist/cli.js
dist/index.js
docs/assets/repobelt-demo-sfx.mp4
docs/assets/repobelt-demo.mp4
docs/assets/repobelt-demo.svg
docs/public-launch-checklist.md
docs/release-process.md
docs/branch-protection.md
docs/launch-announcement-kit.md
docs/policy-v1.md
examples/basic/.repobelt.yml
package.json
```

## Tag and release alignment

Package version:

```text
0.1.0
```

Current `main` HEAD:

```text
bcf6ffeedea35afbc5c32539783e348112c8ddea
```

Local and remote tag:

```text
v0.1.0 -> 808fb690471b5a8bdf867419c2bf9c592e51a754
```

Published GitHub release target:

```text
808fb690471b5a8bdf867419c2bf9c592e51a754
```

Release state:

```text
Draft: false
Prerelease: true
Published URL: https://github.com/realvaleh/repobelt/releases/tag/v0.1.0
Published at: 2026-05-10T19:50:39Z
```

Release assets:

```text
repobelt-demo-sfx.mp4
repobelt-demo.mp4
```

Alignment status:

```text
WARN: package.json is still 0.1.0, but current main contains release-polish commits after the v0.1.0 tag/release target.
```

Before npm publication, choose one of these release-safe paths:

1. Retarget/recreate the `v0.1.0` tag and GitHub prerelease at current `main`, then publish `repobelt@0.1.0`.
2. Keep the existing `v0.1.0` prerelease immutable, bump the package to a new patch/pre-1.0 version, create a new tag/release, then publish that version.

## Security and secrets check

A lightweight tracked-file scan for obvious real secret-shaped literals found no apparent real credentials outside expected documentation, policy examples, synthetic tests, and generated workflow token placeholders. The scan intentionally excluded build/vendor/git directories:

```text
dist
node_modules
.git
.pnpm-store
```

Expected non-secret matches include documentation about secrets, synthetic token fixtures that split token prefixes from repeated characters in tests, and GitHub Actions' `${{ github.token }}` placeholder used by generated PR-comment workflows.

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
docs/assets/repobelt-demo-sfx.mp4
docs/demo.md
docs/demo-video.md
docs/launch-announcement-kit.md
```

The MP4 demos are synthetic and do not display real secret values.

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

The following still require explicit maintainer approval and/or npm authentication:

```text
Resolve tag/release alignment for the final package version.
Authenticate npm on this machine if needed.
Run npm publish --access public for the chosen final version.
Verify npx repobelt --help from the public npm package.
```

Do not publish to npm until the tag/release alignment decision is made.

## Recommendation

Next step: resolve whether `0.1.0` should be retagged to current `main` or whether the current polish should become a new patch/pre-1.0 release. After that decision, publish the chosen package version to npm and verify `npx repobelt --help` from the public registry.
