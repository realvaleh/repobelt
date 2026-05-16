# Public launch readiness audit

Audit date: 2026-05-15

## Summary

RepoBelt remains locally release-ready and is now prepared as the safer `0.1.1` release candidate path instead of retagging the already-published `v0.1.0` prerelease.

The repository is public, branch protection is enabled for `main`, private vulnerability reporting is enabled, and the old `v0.1.0` GitHub prerelease remains published at its original commit. The current package version is now `repobelt@0.1.1`; npm publication is still blocked until a fresh `v0.1.1` tag/release exists at the intended commit, npm authentication is available, and explicit maintainer approval is given.

No tag, GitHub release, repository visibility setting, or npm publication was changed during this release-prep update.

## Repository state

- Repository: `realvaleh/repobelt`
- Visibility: `PUBLIC`
- Default branch: `main`
- Current branch: `main`
- Current package candidate: `repobelt@0.1.1`
- Previous published prerelease: `v0.1.0`

## CI status

Latest fully verified GitHub CI run before the `0.1.1` release-prep commit:

```text
https://github.com/realvaleh/repobelt/actions/runs/25910226985
```

Status:

```text
completed / success
```

Verified CI commit:

```text
4013874 feat: add release alignment check
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

After the `0.1.1` release-prep commit is pushed, watch the new CI run before treating the candidate as GitHub-verified.

## Local verification

Passed during this audit:

```bash
pnpm test
pnpm typecheck
pnpm smoke:pack
pnpm release:notes
pnpm release:preflight
npm pack --dry-run --json --ignore-scripts
```

Test status:

```text
Test Files: 17 passed
Tests: 163 passed
```

Packaged CLI smoke test status:

```text
passed
```

Packaged smoke coverage verifies the npm tarball through `npx`, including:

```text
repobelt --help
repobelt doctor --help
repobelt check --help
repobelt init --help
repobelt init --dry-run
repobelt init --pr-comment
repobelt init --strict
pnpm release:notes
pnpm release:preflight
repobelt doctor
repobelt doctor --format json
repobelt doctor --format json --output reports/doctor.json
repobelt check with diff ranges, explicit file lists, stdin, baselines, ignore patterns, summaries, annotations, and explain modes
```

## npm package dry run

Dry-run package generated from the `0.1.1` candidate:

```text
repobelt@0.1.1
filename: repobelt-0.1.1.tgz
package size: 362.9 kB
unpacked size: 594.7 kB
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
0.1.1
```

Expected release tag:

```text
v0.1.1
```

Current alignment status before tag/release creation:

```text
RepoBelt release alignment: FAIL
package: repobelt@0.1.1
tag: v0.1.1
tag exists: no
tag target: missing
tag aligned with HEAD: no
```

This failure is expected and desirable until an explicit release step creates `v0.1.1` at the intended commit. `pnpm release:check` is read-only and does not create tags, edit releases, or publish packages.

Existing published prerelease:

```text
v0.1.0 -> 808fb690471b5a8bdf867419c2bf9c592e51a754
Published URL: https://github.com/realvaleh/repobelt/releases/tag/v0.1.0
Prerelease: true
Published at: 2026-05-10T19:50:39Z
```

Release assets on the existing prerelease:

```text
repobelt-demo-sfx.mp4
repobelt-demo.mp4
```

## Security and secrets check

A lightweight tracked-file scan for obvious real secret-shaped literals has historically found no apparent real credentials outside expected documentation, policy examples, synthetic tests, and generated workflow token placeholders. The scan intentionally excludes build/vendor/git directories:

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
Create and push the v0.1.1 tag at the intended release commit.
Create/publish the GitHub v0.1.1 release.
Authenticate npm on this machine if needed.
Run npm publish --access public for repobelt@0.1.1 with REPOBELT_NPM_PUBLISH_APPROVED=repobelt@0.1.1 set.
Verify npx repobelt --help from the public npm package.
```

The package includes `release:notes` for generating GitHub-ready notes from the current `CHANGELOG.md` version section, `release:preflight` for combining notes/package/tag readiness into one read-only report, and a `prepublishOnly` guard that blocks accidental npm publishes unless the approval environment variable exactly matches the package name/version, the working tree is clean, and the matching `v<version>` tag points at `HEAD`. Use `pnpm release:notes` to prepare reviewable release text, `pnpm release:preflight` for the combined readiness report, and `pnpm release:check` for a focused alignment report before attempting any publish step.

Do not publish to npm until the `v0.1.1` tag/release exists at the intended commit and the maintainer explicitly approves publication.

## Recommendation

Next step: after CI passes on the `0.1.1` release-prep commit, explicitly choose whether to create `v0.1.1` and its GitHub release. Then, only with maintainer approval and npm authentication, publish with:

```bash
REPOBELT_NPM_PUBLISH_APPROVED=repobelt@0.1.1 npm publish --access public
```
