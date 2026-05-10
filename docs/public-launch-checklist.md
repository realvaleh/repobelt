# Public Launch Checklist

Use this checklist to track RepoBelt public launch status and remaining distribution steps.

For the full release command sequence and explicit approval boundaries, see [`release-process.md`](release-process.md).

## Before changing visibility

- [x] Confirm `pnpm test` passes.
- [x] Confirm `pnpm build` passes.
- [x] Confirm `pnpm smoke:pack` passes.
- [x] Confirm no real secrets, tokens, private keys, credentials, or private repository content are present.
- [x] Confirm the README demo image renders correctly.
- [x] Confirm `CHANGELOG.md` includes the release being launched.
- [x] Confirm the GitHub release draft is correct.
- [x] Review [`branch-protection.md`](branch-protection.md). GitHub returned `403` while private, then branch protection succeeded after the repository was made public.

## GitHub security settings

Private vulnerability reporting is enabled for the public repository. Verification command:

```bash
gh api -X PUT repos/realvaleh/repobelt/private-vulnerability-reporting \
  -H 'Accept: application/vnd.github+json' --silent

gh api repos/realvaleh/repobelt/private-vulnerability-reporting \
  -H 'Accept: application/vnd.github+json'
```

Expected result:

```json
{"enabled":true}
```

Also verify:

- [x] Issues are enabled.
- [x] Blank public issues are disabled by `.github/ISSUE_TEMPLATE/config.yml`.
- [x] `SECURITY.md` is visible.
- [x] Security contact link works from the public repo.

## Release steps

- [x] Make the repository public.
- [x] Enable private vulnerability reporting.
- [x] Publish the `v0.1.0` GitHub release draft as a prerelease.
- [ ] Publish `repobelt@0.1.0` to npm only after separate explicit approval.
- [ ] Verify `npx repobelt --help` works from npm.
- [ ] Verify `npx repobelt init --dry-run` works from npm.

## Launch distribution

- [ ] Post a concise launch thread on X/Twitter.
- [ ] Share with AI coding/devtool communities.
- [ ] Consider Hacker News only after the npm install path is proven.
- [ ] Prepare a short demo GIF/video from `docs/assets/repobelt-demo.svg` or a real terminal recording.
- [ ] Use [`launch-announcement-kit.md`](launch-announcement-kit.md) for platform-specific copy.
