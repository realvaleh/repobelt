# Public Launch Checklist

Use this checklist when RepoBelt is ready to move from private preview to public launch.

For the full release command sequence and explicit approval boundaries, see [`release-process.md`](release-process.md).

## Before changing visibility

- [ ] Confirm `pnpm test` passes.
- [ ] Confirm `pnpm build` passes.
- [ ] Confirm `pnpm smoke:pack` passes.
- [ ] Confirm no real secrets, tokens, private keys, credentials, or private repository content are present.
- [ ] Confirm the README demo image renders correctly.
- [ ] Confirm `CHANGELOG.md` includes the release being launched.
- [ ] Confirm the GitHub release draft is correct.
- [ ] Review [`branch-protection.md`](branch-protection.md) and decide whether to enable protection before public launch.

## GitHub security settings

Private vulnerability reporting is intended for public repositories. The API returned `404` while RepoBelt was private, so enable it after making the repository public.

After public visibility is enabled:

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

- [ ] Issues are enabled.
- [ ] Blank public issues are disabled by `.github/ISSUE_TEMPLATE/config.yml`.
- [ ] `SECURITY.md` is visible.
- [ ] Security contact link works from the public repo.

## Release steps

- [ ] Make the repository public.
- [ ] Enable private vulnerability reporting.
- [ ] Publish the `v0.1.0` GitHub release draft.
- [ ] Publish `repobelt@0.1.0` to npm only after explicit approval.
- [ ] Verify `npx repobelt --help` works from npm.
- [ ] Verify `npx repobelt init --dry-run` works from npm.

## Launch distribution

- [ ] Post a concise launch thread on X/Twitter.
- [ ] Share with AI coding/devtool communities.
- [ ] Consider Hacker News only after the npm install path is proven.
- [ ] Prepare a short demo GIF/video from `docs/assets/repobelt-demo.svg` or a real terminal recording.
