# Release process

This document separates safe local/GitHub release preparation from public npm publishing.

RepoBelt should never be published to npm accidentally. Treat `npm publish` as a public side effect that requires explicit human approval.

## Release boundaries

### Safe to run during normal release preparation

These commands do not publish anything publicly by themselves:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm smoke:pack
npm pack --dry-run
git status --short --branch
```

It is also safe to prepare private GitHub release assets while the repository remains private:

```bash
git tag -a v0.1.0 -m "RepoBelt v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --title "RepoBelt v0.1.0" --notes-file /tmp/release-notes.md --prerelease --draft
```

### Requires explicit approval

Do not run these without explicit approval from the maintainer:

```bash
gh repo edit realvaleh/repobelt --visibility public
gh release edit v0.1.0 --draft=false
npm publish
```

Why:

- making the GitHub repository public exposes the codebase publicly
- publishing the GitHub release announces the version publicly
- `npm publish` creates a public package release under the `repobelt` name

## Pre-release checklist

Before any public launch step:

- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm smoke:pack` passes.
- [ ] `npm pack --dry-run` shows only expected files.
- [ ] `package.json` version matches `CHANGELOG.md`.
- [ ] the git tag matches the package version, for example `v0.1.0` for `0.1.0`.
- [ ] the GitHub release notes match `CHANGELOG.md`.
- [ ] no real secrets, credentials, private keys, or private repository contents are present.
- [ ] README demo and quickstart still match current behavior.
- [ ] issue templates and `SECURITY.md` are present.

## Public GitHub launch steps

Only after explicit approval:

```bash
gh repo edit realvaleh/repobelt --visibility public
```

Then enable private vulnerability reporting:

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

Publish the GitHub release draft only after reviewing the rendered release page:

```bash
gh release edit v0.1.0 --draft=false --prerelease
```

## npm publish steps

Only after explicit approval and after GitHub public launch is ready:

```bash
npm whoami
pnpm test
pnpm build
pnpm smoke:pack
npm pack --dry-run
npm publish --access public
```

After publish, verify from a clean temporary directory:

```bash
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"
npm init -y
npm install repobelt@0.1.0
npx repobelt --help
npx repobelt init --dry-run
```

Also verify the public package page:

```text
https://www.npmjs.com/package/repobelt
```

## Post-publish checks

- [ ] `npx repobelt --help` works without local tarball.
- [ ] `npx repobelt init --dry-run` works without local tarball.
- [ ] npm page shows README and metadata correctly.
- [ ] GitHub release links to the correct tag.
- [ ] README badges render on the public repository.
- [ ] private vulnerability reporting is enabled if GitHub supports it for the repo.

## Rollback notes

npm packages cannot be treated like private git commits. Avoid publishing until the release is ready.

If a bad version is published:

1. Do not delete history from git.
2. Immediately prepare a patch version, for example `0.1.1`.
3. Mark the bad GitHub release with a warning if necessary.
4. Publish the fixed package only after repeating the full checklist.
